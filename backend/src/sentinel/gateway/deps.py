"""FastAPI dependencies enforcing the M4 access chain.

Order matters and is fixed: authenticate -> authorize role -> check rate limit
-> check privacy budget -> only then reach an engine. A request that fails any
step never reaches the audit engines at all (docs §7.2), so a denied request
costs the target zero queries and leaks nothing.
"""

from __future__ import annotations

from collections.abc import Generator
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from sentinel.gateway.auth import AuditorIdentity, decode_token
from sentinel.gateway.budget import check_rate_limit
from sentinel.gateway.roles import Role, Quota, quota_for
from sentinel.ledger.models import create_session_factory
from sentinel.privacy.guardian import BudgetGuardian

_session_factory = None


def get_session() -> Generator[Session, None, None]:
    """Per-request database session."""
    global _session_factory
    if _session_factory is None:
        _session_factory = create_session_factory()
    session = _session_factory()
    try:
        yield session
    finally:
        session.close()


SessionDep = Annotated[Session, Depends(get_session)]


def require_auth(
    authorization: Annotated[str | None, Header()] = None,
) -> AuditorIdentity:
    """Resolve the caller's verified identity, or reject the request."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="An audit requires an authenticated auditor identity.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split(" ", 1)[1].strip()
    try:
        return decode_token(token)
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired. Sign in again.",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token.",
        ) from exc


AuthDep = Annotated[AuditorIdentity, Depends(require_auth)]


def require_role(*allowed: Role):
    """Restrict an endpoint to specific roles."""

    def dependency(identity: AuthDep) -> AuditorIdentity:
        if identity.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"The '{identity.role}' role may not perform this action. "
                    f"Allowed: {', '.join(sorted(str(r) for r in allowed))}."
                ),
            )
        return identity

    return dependency


def enforce_budget(
    identity: AuditorIdentity,
    session: Session,
    target_id: str,
    planned_queries: int,
) -> Quota:
    """Check rate limit and privacy budget before any probe is sent.

    Raises 429 rather than returning a flag: the call site must not be able to
    proceed by ignoring a return value.
    """
    quota = quota_for(identity.role)

    rate = check_rate_limit(session, identity.subject, identity.role, planned_queries)
    if not rate.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=rate.reason
        )

    guardian = BudgetGuardian(session)
    decision = guardian.preflight(target_id, planned_queries, quota.max_epsilon)
    if not decision.allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=decision.reason
        )

    return quota
