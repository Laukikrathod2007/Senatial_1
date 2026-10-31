"""Append-only storage schema for sealed audit reports."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from sentinel.config import get_settings


class Base(DeclarativeBase):
    pass


class AuditReportRow(Base):
    """One sealed report -- a single link in the hash chain.

    Append-only is enforced by the service layer and, more importantly, by the
    hash chain itself: mutating any row breaks verification for that row and
    every row after it. No database-level trigger can offer a stronger guarantee
    than that, because an attacker with write access could drop the trigger.
    """

    __tablename__ = "audit_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Position in the chain. Signed, so reordering is detectable.
    sequence: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)

    # The exact bytes that were hashed and signed, stored verbatim. Verification
    # reads THIS, never a re-serialization of parsed fields -- re-serializing
    # would reintroduce the determinism risk canonical_bytes() exists to remove.
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)

    report_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    previous_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    signature: Mapped[str] = mapped_column(String(128), nullable=False)

    # Denormalized from the payload for querying. Never trusted by the verifier,
    # which reads the payload itself.
    audit_type: Mapped[str] = mapped_column(String(64), nullable=False)
    target_id: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )


def _register_all_tables() -> None:
    """Import every module that declares a table.

    ``Base.metadata`` only knows about models whose modules have been imported.
    M4's quota table and M5's privacy-budget table live outside this module, so
    without this they are silently absent from ``create_all`` and the first
    query against them fails at runtime with "no such table".
    """
    from sentinel.gateway import budget as _budget  # noqa: F401
    from sentinel.gateway import jobs as _jobs  # noqa: F401
    from sentinel.privacy import guardian as _guardian  # noqa: F401
    from sentinel.cases import models as _cases  # noqa: F401


def create_session_factory(database_url: str | None = None) -> sessionmaker:
    """Build a session factory and ensure the schema exists."""
    url = database_url or get_settings().database_url
    if url.startswith("sqlite:///") and ":memory:" not in url:
        get_settings().ensure_dirs()
    _register_all_tables()
    engine = create_engine(url, future=True)
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, future=True, expire_on_commit=False)
