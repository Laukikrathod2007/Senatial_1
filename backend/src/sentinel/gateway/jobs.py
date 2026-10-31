"""SQLite-backed audit job state and bounded in-process progress reporting.

Jobs are persistent records, but FastAPI BackgroundTasks are not a durable
queue. This module supports a single API process: on restart, nonterminal jobs
are marked failed with a safe interruption message and must be resubmitted.
"""

from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Float, Integer, String, Text, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from sentinel.ledger.models import Base, create_session_factory
from sentinel.config import get_settings

QUEUED = "queued"
RUNNING = "running"
COMPLETED = "completed"
FAILED = "failed"
TERMINAL = {COMPLETED, FAILED}
ALLOWED_TRANSITIONS = {
    QUEUED: {RUNNING, FAILED},
    RUNNING: {COMPLETED, FAILED},
    COMPLETED: set(),
    FAILED: set(),
}
INTERRUPTED_MESSAGE = "Audit was interrupted by a backend restart. Submit it again."
_factories: dict[str, Any] = {}
_factory_lock = threading.Lock()


def _job_session_factory():
    database_url = get_settings().database_url
    with _factory_lock:
        factory = _factories.get(database_url)
        if factory is None:
            factory = create_session_factory(database_url)
            _factories[database_url] = factory
        return factory


class AuditJobRow(Base):
    """Persisted owner-scoped status and sealed result for one audit request."""

    __tablename__ = "audit_jobs"

    job_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_subject: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    audit_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target_id: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    progress_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    completed_probes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    attempted_probes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_probes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_probes: Mapped[int] = mapped_column(Integer, nullable=False)
    result_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def make_job(
    session: Session,
    *,
    owner_subject: str,
    audit_type: str,
    target_id: str,
    total_probes: int,
) -> AuditJobRow:
    if total_probes <= 0:
        raise ValueError("A job must plan at least one probe")
    now = _now()
    row = AuditJobRow(
        job_id=str(uuid.uuid4()),
        owner_subject=owner_subject,
        audit_type=audit_type,
        target_id=target_id,
        status=QUEUED,
        progress_pct=0.0,
        completed_probes=0,
        attempted_probes=0,
        failed_probes=0,
        total_probes=total_probes,
        created_at=now,
        updated_at=now,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


def transition_job(
    row: AuditJobRow,
    new_status: str,
    *,
    error_message: str | None = None,
    result: dict[str, Any] | None = None,
) -> None:
    if new_status not in ALLOWED_TRANSITIONS.get(row.status, set()):
        raise ValueError(f"Invalid audit job transition: {row.status} -> {new_status}")
    if new_status == COMPLETED and result is None:
        raise ValueError("A completed job must persist its sealed result")
    if new_status == FAILED and not error_message:
        raise ValueError("A failed job must include a safe diagnostic")
    row.status = new_status
    row.updated_at = _now()
    row.error_message = error_message
    if result is not None:
        row.result_json = json.dumps(result, sort_keys=True, separators=(",", ":"), allow_nan=False)
    if new_status == COMPLETED:
        row.progress_pct = (row.attempted_probes / row.total_probes) * 100
    elif new_status == FAILED:
        row.progress_pct = (row.attempted_probes / row.total_probes) * 100


def add_progress(
    session: Session,
    job_id: str,
    *,
    attempted: int,
    completed: int,
    failed: int,
) -> AuditJobRow:
    row = session.get(AuditJobRow, job_id)
    if row is None:
        raise LookupError("Audit job not found")
    if row.status != RUNNING:
        raise ValueError("Progress can only change while a job is running")
    if min(attempted, completed, failed) < 0 or completed + failed != attempted:
        raise ValueError("Probe progress counts are inconsistent")
    new_attempted = row.attempted_probes + attempted
    if new_attempted > row.total_probes:
        raise ValueError("Probe progress exceeds the planned total")
    row.attempted_probes = new_attempted
    row.completed_probes += completed
    row.failed_probes += failed
    row.progress_pct = min(100.0, 100.0 * new_attempted / row.total_probes)
    row.updated_at = _now()
    session.commit()
    session.refresh(row)
    return row


def job_payload(row: AuditJobRow, *, include_result: bool = True) -> dict[str, Any]:
    result = None
    if include_result and row.status == COMPLETED and row.result_json:
        result = json.loads(row.result_json)
    attempted = row.attempted_probes
    return {
        "job_id": row.job_id,
        "audit_type": row.audit_type,
        "target_id": row.target_id,
        "status": row.status,
        "progress_pct": round(row.progress_pct, 2),
        "completed_probes": row.completed_probes,
        "attempted_probes": attempted,
        "failed_probes": row.failed_probes,
        "unattempted_probes": max(0, row.total_probes - attempted),
        "total_probes": row.total_probes,
        "result": result,
        "error_message": row.error_message if row.status == FAILED else None,
        "created_at": row.created_at.isoformat(),
        "updated_at": row.updated_at.isoformat(),
    }


def get_owned_job(session: Session, job_id: str, owner_subject: str) -> AuditJobRow | None:
    return session.execute(
        select(AuditJobRow).where(
            AuditJobRow.job_id == job_id,
            AuditJobRow.owner_subject == owner_subject,
        )
    ).scalar_one_or_none()


def recover_interrupted_jobs(database_url: str | None = None) -> int:
    """Fail stale in-process work after startup; never pretend it resumed."""
    factory = create_session_factory(database_url) if database_url else _job_session_factory()
    session = factory()
    try:
        rows = list(
            session.execute(
                select(AuditJobRow).where(AuditJobRow.status.in_((QUEUED, RUNNING)))
            ).scalars()
        )
        for row in rows:
            transition_job(row, FAILED, error_message=INTERRUPTED_MESSAGE)
        session.commit()
        return len(rows)
    finally:
        session.close()


class JobProgress:
    """Thread-safe callback that persists truthful, periodically flushed counts."""

    def __init__(self, job_id: str, *, flush_every: int = 20):
        self.job_id = job_id
        self.flush_every = flush_every
        self._lock = threading.Lock()
        self._pending_attempted = 0
        self._pending_completed = 0
        self._pending_failed = 0

    def record(self, attempted: int, completed: int, failed: int) -> None:
        with self._lock:
            self._pending_attempted += attempted
            self._pending_completed += completed
            self._pending_failed += failed
            if self._pending_attempted >= self.flush_every:
                self._flush_locked()

    def flush(self) -> None:
        with self._lock:
            self._flush_locked()

    def _flush_locked(self) -> None:
        if not self._pending_attempted:
            return
        factory = _job_session_factory()
        session = factory()
        attempted = self._pending_attempted
        completed = self._pending_completed
        failed = self._pending_failed
        try:
            add_progress(
                session, self.job_id,
                attempted=attempted, completed=completed, failed=failed,
            )
            self._pending_attempted = 0
            self._pending_completed = 0
            self._pending_failed = 0
        finally:
            session.close()
