"""Public verification (M3).

Deliberately unauthenticated. A tamper-evident ledger whose verification
endpoint requires our permission is not independently verifiable -- the whole
guarantee is that a skeptical reader need not trust us.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field

from sentinel.config import get_settings
from sentinel.gateway.deps import SessionDep
from sentinel.ledger.hashing import canonical_bytes, sha256_hex
from sentinel.ledger.service import verify_chain, verify_report
from sentinel.ledger.signing import load_public_key, verify_signature

router = APIRouter(prefix="/verify", tags=["public verification"])


class ReportCopyRequest(BaseModel):
    """Envelope exported by GET /ledger/reports/{sequence}."""

    model_config = ConfigDict(extra="forbid")

    payload: dict[str, Any]
    canonical_payload: str | None = Field(default=None, max_length=1_000_000)
    report_hash: str = Field(pattern="^[0-9a-f]{64}$")
    signature: str = Field(pattern="^[0-9a-f]{128}$")


def _is_disposable_demo_storage() -> bool:
    settings = get_settings()
    prefix = "sqlite:///"
    if not settings.database_url.startswith(prefix):
        return False
    root = settings.var_dir.resolve()
    database = Path(settings.database_url[len(prefix):]).resolve()
    return root.name.lower().endswith("demo") and database.is_relative_to(root)


def require_demo_controls() -> None:
    """Keep destructive tamper/reset helpers disabled outside a demo setup."""
    settings = get_settings()
    if (
        not settings.enable_demo_controls
        or not settings.enable_demo_auth
        or not _is_disposable_demo_storage()
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo mutation controls are disabled.",
        )


@router.get("/demo-controls", summary="Whether demo mutation controls are enabled")
def demo_controls_status() -> dict[str, bool]:
    return {"enabled": (
        get_settings().enable_demo_controls
        and get_settings().enable_demo_auth
        and _is_disposable_demo_storage()
    )}


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


@router.post("/report-copy", summary="Verify an exported signed report copy")
def verify_report_copy(request: ReportCopyRequest) -> dict[str, Any]:
    """Verify a copied report without looking it up in the local ledger.

    This uses the server's configured public key. Independent verification
    still requires comparing that key with a separately trusted publication.
    """
    try:
        if request.canonical_payload is None:
            # Backward compatibility for simple older copies that have not
            # passed through a JavaScript numeric round-trip.
            payload_bytes = canonical_bytes(request.payload)
        else:
            payload_bytes = request.canonical_payload.encode("utf-8")
            embedded_payload = json.loads(request.canonical_payload)
            if not isinstance(embedded_payload, dict):
                return {"valid": False, "reason": "Canonical report payload must be a JSON object."}
            if canonical_bytes(embedded_payload) != payload_bytes:
                return {"valid": False, "reason": "Canonical report payload is not in canonical form."}
            if embedded_payload != request.payload:
                return {"valid": False, "reason": "Report copy payload does not match its canonical payload."}
    except (TypeError, ValueError):
        return {"valid": False, "reason": "Report copy is not valid canonical JSON."}
    if len(payload_bytes) > 1_000_000:
        return {"valid": False, "reason": "Report copy exceeds the 1 MB verification limit."}
    if sha256_hex(payload_bytes) != request.report_hash:
        return {"valid": False, "reason": "Report copy content does not match its recorded SHA-256 hash."}
    if not verify_signature(payload_bytes, request.signature, load_public_key()):
        return {"valid": False, "reason": "Ed25519 signature does not match this report copy."}
    return {
        "valid": True,
        "reason": (
            "Report copy hash and Ed25519 signature are valid under this server's configured public key. "
            "This does not prove the findings are true or the key is independently trusted."
        ),
    }


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


@router.post(
    "/tamper",
    summary="Tamper with a sealed report (explicit demo configuration required)",
    dependencies=[Depends(require_demo_controls)],
)
def tamper_report(request: TamperRequest, session: SessionDep) -> dict[str, Any]:
    import json
    from sqlalchemy import select
    from sentinel.ledger.models import AuditReportRow

    row = session.execute(
        select(AuditReportRow).where(AuditReportRow.sequence == request.sequence)
    ).scalar_one_or_none()
    if row is None:
        return {"success": False, "detail": f"No report at sequence {request.sequence}"}

    payload = json.loads(row.payload_json)
    payload.setdefault("body", {})["plain_language"] = {
        "what_we_found": "No problems were found with this system. (TAMPERED)",
        "what_it_means": "Everything is fine. (TAMPERED)",
        "what_you_can_do": "No action needed. (TAMPERED)",
        "how_sure_are_we": "Completely sure. (TAMPERED)",
    }
    row.payload_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    session.commit()
    return {"success": True, "detail": f"Report {request.sequence} has been altered in the database."}


@router.post(
    "/reset",
    summary="Reset the ledger and budget (explicit demo configuration required)",
    dependencies=[Depends(require_demo_controls)],
)
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

