"""Owner-scoped case records and append-only test execution history."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from sentinel.ledger.models import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AuditCaseRow(Base):
    __tablename__ = "audit_cases"

    case_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    owner_subject: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    target_name: Mapped[str] = mapped_column(String(160), nullable=False)
    investigation_question: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_source: Mapped[str] = mapped_column(String(32), nullable=False)
    provenance_note: Mapped[str] = mapped_column(Text, nullable=False, default="")
    evidence_reference: Mapped[str] = mapped_column(String(600), nullable=False, default="")
    access_state: Mapped[str] = mapped_column(String(32), nullable=False)
    human_review_status: Mapped[str] = mapped_column(String(24), nullable=False, default="unreviewed")
    human_review_notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    rti_draft: Mapped[str] = mapped_column(Text, nullable=False, default="")
    system_owner_response: Mapped[str] = mapped_column(Text, nullable=False, default="")
    remediation_status: Mapped[str] = mapped_column(String(32), nullable=False, default="not_contacted")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    runs: Mapped[list["AuditCaseRunRow"]] = relationship(
        back_populates="case", cascade="all, delete-orphan", order_by="AuditCaseRunRow.created_at"
    )


class AuditCaseRunRow(Base):
    __tablename__ = "audit_case_runs"

    run_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    case_id: Mapped[str] = mapped_column(
        ForeignKey("audit_cases.case_id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_subject: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    execution_status: Mapped[str] = mapped_column(String(32), nullable=False)
    evidentiary_status: Mapped[str] = mapped_column(String(32), nullable=False, default="inconclusive")
    result_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    report_sequence: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utc_now)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    case: Mapped[AuditCaseRow] = relationship(back_populates="runs")
