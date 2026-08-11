"""Public verification (M3).

Deliberately unauthenticated. A tamper-evident ledger whose verification
endpoint requires our permission is not independently verifiable -- the whole
guarantee is that a skeptical reader need not trust us.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from sentinel.config import get_settings
from sentinel.gateway.deps import SessionDep
from sentinel.ledger.service import verify_chain, verify_report

router = APIRouter(prefix="/verify", tags=["public verification"])


@router.get("/chain", summary="Verify the whole ledger")
def verify_whole_chain(session: SessionDep) -> dict[str, Any]:
    result = verify_chain(session)
    return {
        "valid": result.valid,
        "reports_checked": result.checked,
        "merkle_root": result.merkle_root,
        "broken_at_sequence": result.broken_sequence,
        "reason": result.reason,
        "failures": result.failures,
    }


@router.get("/reports/{sequence}", summary="Verify one report")
def verify_single_report(sequence: int, session: SessionDep) -> dict[str, Any]:
    valid, reason = verify_report(session, sequence)
    return {"sequence": sequence, "valid": valid, "reason": reason}


@router.get("/public-key", summary="The Ed25519 key signatures are checked against")
def public_key() -> dict[str, str]:
    """Served for convenience only.

    A genuinely independent check should use the copy committed to the
    repository, not one this server hands out -- a compromised server could
    serve a key matching forged reports.
    """
    settings = get_settings()
    if not settings.public_key_path.exists():
        from sentinel.ledger.signing import generate_keypair

        generate_keypair()
    return {
        "public_key_pem": settings.public_key_path.read_text(),
        "algorithm": "Ed25519",
        "note": "Prefer the copy committed to the repository over this one.",
    }


class TamperRequest(BaseModel):
    sequence: int = Field(default=0, description="Which report sequence to tamper with")


@router.post("/tamper", summary="Tamper with a sealed report (Demo only)")
def tamper_report(request: TamperRequest, session: SessionDep) -> dict[str, Any]:
    import sqlite3
    import json
    settings = get_settings()
    database = settings.var_dir / "sentinel.db"
    if not database.exists():
        return {"success": False, "detail": "Database does not exist"}
    
    connection = sqlite3.connect(database)
    row = connection.execute(
        "SELECT payload_json FROM audit_reports WHERE sequence = ?", (request.sequence,)
    ).fetchone()
    if row is None:
        connection.close()
        return {"success": False, "detail": f"No report at sequence {request.sequence}"}
        
    payload = json.loads(row[0])
    payload.setdefault("body", {})["plain_language"] = {
        "what_we_found": "No problems were found with this system. (TAMPERED)",
        "what_it_means": "Everything is fine. (TAMPERED)",
        "what_you_can_do": "No action needed. (TAMPERED)",
        "how_sure_are_we": "Completely sure. (TAMPERED)",
    }
    connection.execute(
        "UPDATE audit_reports SET payload_json = ? WHERE sequence = ?",
        (json.dumps(payload, sort_keys=True, separators=(",", ":")), request.sequence),
    )
    connection.commit()
    connection.close()
    return {"success": True, "detail": f"Report {request.sequence} has been altered in the database."}


@router.post("/reset", summary="Reset the ledger and budget (Demo only)")
def reset_ledger(session: SessionDep) -> dict[str, Any]:
    from sqlalchemy import text
    try:
        session.execute(text("DELETE FROM audit_reports"))
        session.execute(text("DELETE FROM privacy_budget"))
        session.execute(text("DELETE FROM audit_quota"))
        session.commit()
        return {"success": True, "detail": "Ledger and budgets reset successfully."}
    except Exception as e:
        return {"success": False, "detail": str(e)}

