"""Sealed report access (M3)."""

from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from sentinel.gateway.deps import AuthDep, SessionDep
from sentinel.ledger.models import AuditReportRow
from sentinel.ledger.service import current_root

router = APIRouter(prefix="/ledger", tags=["ledger (M3)"])


@router.get("/reports", summary="List sealed reports")
def list_reports(identity: AuthDep, session: SessionDep) -> list[dict[str, Any]]:
    rows = session.execute(
        select(AuditReportRow).order_by(AuditReportRow.sequence.asc())
    ).scalars()
    return [
        {
            "sequence": row.sequence,
            "audit_type": row.audit_type,
            "target_id": row.target_id,
            "report_hash": row.report_hash,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]


@router.get("/reports/{sequence}", summary="Fetch one sealed report")
def get_report(sequence: int, identity: AuthDep, session: SessionDep) -> dict[str, Any]:
    row = session.execute(
        select(AuditReportRow).where(AuditReportRow.sequence == sequence)
    ).scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No report sealed at sequence {sequence}.",
        )
    return {
        "sequence": row.sequence,
        "payload": json.loads(row.payload_json),
        # Preserve the exact signed bytes across JavaScript JSON.parse/stringify.
        # JS converts integral decimals such as 0.0 to 0, changing canonical
        # Python JSON bytes and making an untampered exported copy unverifiable.
        "canonical_payload": row.payload_json,
        "report_hash": row.report_hash,
        "previous_hash": row.previous_hash,
        "signature": row.signature,
    }


@router.get("/root", summary="Current locally computed Merkle root")
def published_root(session: SessionDep) -> dict[str, Any]:
    """Public: the value a third party can pin to detect later changes."""
    return {"merkle_root": current_root(session)}
