"""Auditor identity endpoints (M4)."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from sentinel.gateway.auth import issue_token
from sentinel.gateway.roles import Role, quota_for

router = APIRouter(prefix="/auth", tags=["identity (M4)"])


class LoginRequest(BaseModel):
    subject: str = Field(description="Who is running this audit")
    role: Role = Field(default=Role.CITIZEN)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    queries_per_audit: int
    audits_per_day: int
    max_epsilon: float


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest) -> LoginResponse:
    """Issue a session token.

    The MVP trusts the claimed role; docs §3.3 step 1 specifies email+OTP for a
    real deployment and DigiLocker verification for the certified-auditor tier.
    What is real here is the enforcement: whatever role a token carries, the
    quotas attached to it are applied on every request.
    """
    quota = quota_for(request.role)
    return LoginResponse(
        access_token=issue_token(request.subject, request.role),
        role=request.role,
        queries_per_audit=quota.queries_per_audit,
        audits_per_day=quota.audits_per_day,
        max_epsilon=quota.max_epsilon,
    )
