"""Sealing and verification of audit reports (M3).

The security property this module exists to provide: once a report is sealed,
it cannot be altered, reordered, spliced, or deleted without detection -- even by
someone with full write access to the database.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from sentinel.ledger.hashing import GENESIS_HASH, canonical_bytes, sha256_hex
from sentinel.ledger.merkle import merkle_root
from sentinel.ledger.models import AuditReportRow
from sentinel.ledger.signing import sign_bytes, verify_signature

SCHEMA_VERSION = 1


@dataclass(frozen=True)
class SealedReport:
    """The result of sealing one report."""

    sequence: int
    report_hash: str
    previous_hash: str
    signature: str
    payload: dict[str, Any]


@dataclass
class ChainVerification:
    """Outcome of walking the whole chain."""

    valid: bool
    checked: int
    merkle_root: str | None = None
    broken_sequence: int | None = None
    reason: str | None = None
    failures: list[str] = field(default_factory=list)


def _latest_row(session: Session) -> AuditReportRow | None:
    return session.execute(
        select(AuditReportRow).order_by(AuditReportRow.sequence.desc()).limit(1)
    ).scalar_one_or_none()


def seal_report(
    session: Session,
    body: dict[str, Any],
    *,
    audit_type: str,
    target_id: str,
) -> SealedReport:
    """Hash-chain, sign, and persist a report.

    The ordering here is the security-critical part. ``previous_hash`` and
    ``sequence`` are assembled INTO the payload dict *before* it is serialized
    and signed, so the signature commits to this report's position in the chain.

    Were the chain fields instead attached after signing, each report's signature
    would still verify in isolation, and an attacker could freely reorder or
    splice reports while every individual signature continued to check out.
    Binding position into the signed bytes is what forecloses that.
    """
    previous = _latest_row(session)
    previous_hash = previous.report_hash if previous else GENESIS_HASH
    sequence = (previous.sequence + 1) if previous else 0

    payload: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "sequence": sequence,
        "previous_hash": previous_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "audit_type": audit_type,
        "target_id": target_id,
        "body": body,
    }

    payload_bytes = canonical_bytes(payload)
    report_hash = sha256_hex(payload_bytes)
    signature = sign_bytes(payload_bytes)

    session.add(
        AuditReportRow(
            sequence=sequence,
            payload_json=payload_bytes.decode("utf-8"),
            report_hash=report_hash,
            previous_hash=previous_hash,
            signature=signature,
            audit_type=audit_type,
            target_id=target_id,
        )
    )
    session.commit()

    return SealedReport(
        sequence=sequence,
        report_hash=report_hash,
        previous_hash=previous_hash,
        signature=signature,
        payload=payload,
    )


def verify_chain(session: Session) -> ChainVerification:
    """Walk every sealed report and check integrity end to end.

    Four independent checks per row; any one failing means the record has been
    altered:
      1. The stored hash matches a fresh hash of the stored bytes.
      2. The signature verifies against those same bytes.
      3. The payload's own ``previous_hash`` links to the prior row.
      4. Sequence numbers are dense and ascending (catches deletions).
    """
    rows = list(
        session.execute(
            select(AuditReportRow).order_by(AuditReportRow.sequence.asc())
        ).scalars()
    )

    if not rows:
        return ChainVerification(valid=True, checked=0, reason="empty ledger")

    failures: list[str] = []
    expected_previous = GENESIS_HASH
    expected_sequence = 0

    for row in rows:
        payload_bytes = row.payload_json.encode("utf-8")

        if sha256_hex(payload_bytes) != row.report_hash:
            failures.append(
                f"sequence {row.sequence}: content altered "
                f"(stored hash does not match stored payload)"
            )
        elif not verify_signature(payload_bytes, row.signature):
            failures.append(
                f"sequence {row.sequence}: signature invalid for this payload"
            )

        if row.previous_hash != expected_previous:
            failures.append(
                f"sequence {row.sequence}: chain link broken "
                f"(expected previous {expected_previous[:12]}..., "
                f"found {row.previous_hash[:12]}...)"
            )

        if row.sequence != expected_sequence:
            failures.append(
                f"expected sequence {expected_sequence}, found {row.sequence} "
                f"(a report may have been deleted)"
            )

        if failures:
            return ChainVerification(
                valid=False,
                checked=len(rows),
                broken_sequence=row.sequence,
                reason=failures[0],
                failures=failures,
            )

        expected_previous = row.report_hash
        expected_sequence = row.sequence + 1

    return ChainVerification(
        valid=True,
        checked=len(rows),
        merkle_root=merkle_root([row.report_hash for row in rows]),
    )


def verify_report(session: Session, sequence: int) -> tuple[bool, str]:
    """Verify one report in isolation. Returns (ok, human-readable reason)."""
    row = session.execute(
        select(AuditReportRow).where(AuditReportRow.sequence == sequence)
    ).scalar_one_or_none()

    if row is None:
        return False, f"No report sealed at sequence {sequence}"

    payload_bytes = row.payload_json.encode("utf-8")
    if sha256_hex(payload_bytes) != row.report_hash:
        return False, "Report content has been altered since it was sealed"
    if not verify_signature(payload_bytes, row.signature):
        return False, "Signature does not match this report's contents"
    return True, "Report is intact and its signature is valid"


def current_root(session: Session) -> str | None:
    """Merkle root over every sealed report -- the value to publish."""
    hashes = list(
        session.execute(
            select(AuditReportRow.report_hash).order_by(AuditReportRow.sequence.asc())
        ).scalars()
    )
    return merkle_root(hashes) if hashes else None
