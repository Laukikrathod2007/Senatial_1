"""Per-auditor rate limiting (M4).

SQLite-backed rather than Redis. The docs suggest Redis, but a token bucket here
is one table and removes an entire service from the deployment -- and this
counter is not hot enough to need an in-memory store. Fewer moving parts is
itself a security property for a tool whose credibility rests on being auditable.

Distinct from M5's privacy budget: this caps how *often* someone may audit,
while M5 caps how much *privacy loss* a target may accumulate from anyone.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from sqlalchemy import Date, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, Session, mapped_column

from sentinel.gateway.roles import Role, quota_for
from sentinel.ledger.models import Base


class AuditQuotaRow(Base):
    """Audits run by one subject on one day."""

    __tablename__ = "audit_quota"
    __table_args__ = (UniqueConstraint("subject", "day", name="uq_subject_day"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    subject: Mapped[str] = mapped_column(String(128), nullable=False)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    audits_run: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    queries_run: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


@dataclass(frozen=True)
class RateDecision:
    allowed: bool
    reason: str
    audits_today: int
    audits_allowed: int


def _row(session: Session, subject: str) -> AuditQuotaRow:
    today = date.today()
    row = (
        session.query(AuditQuotaRow)
        .filter(AuditQuotaRow.subject == subject, AuditQuotaRow.day == today)
        .one_or_none()
    )
    if row is None:
        row = AuditQuotaRow(subject=subject, day=today, audits_run=0, queries_run=0)
        session.add(row)
        session.commit()
    return row


def check_rate_limit(
    session: Session, subject: str, role: Role, planned_queries: int
) -> RateDecision:
    """Check both the daily audit count and the per-audit query ceiling."""
    quota = quota_for(role)
    row = _row(session, subject)

    if row.audits_run >= quota.audits_per_day:
        return RateDecision(
            allowed=False,
            reason=(
                f"Daily limit reached: {quota.audits_per_day} audits per day "
                f"for the '{role}' role."
            ),
            audits_today=row.audits_run,
            audits_allowed=quota.audits_per_day,
        )

    if planned_queries > quota.queries_per_audit:
        return RateDecision(
            allowed=False,
            reason=(
                f"Requested {planned_queries} queries, but the '{role}' role "
                f"allows {quota.queries_per_audit} per audit."
            ),
            audits_today=row.audits_run,
            audits_allowed=quota.audits_per_day,
        )

    return RateDecision(
        allowed=True,
        reason="Within rate limits.",
        audits_today=row.audits_run,
        audits_allowed=quota.audits_per_day,
    )


def record_audit(session: Session, subject: str, queries: int) -> None:
    """Record a completed audit against the subject's daily allowance."""
    row = _row(session, subject)
    row.audits_run += 1
    row.queries_run += queries
    session.commit()
