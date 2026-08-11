"""Public verification (M3).

Deliberately unauthenticated. A tamper-evident ledger whose verification
endpoint requires our permission is not independently verifiable -- the whole
guarantee is that a skeptical reader need not trust us.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

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
