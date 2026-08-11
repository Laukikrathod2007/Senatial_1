"""Identity and session tokens for auditors (M4)."""

from __future__ import annotations

import hashlib
import hmac
import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import jwt

from sentinel.config import get_settings
from sentinel.gateway.roles import Role

_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_KEY_LENGTH = 32


@dataclass(frozen=True)
class AuditorIdentity:
    """The verified identity behind an audit request."""

    subject: str
    role: Role
    token_id: str


def hash_password(password: str) -> str:
    """Hash a password with scrypt.

    scrypt via the existing ``cryptography``/``hashlib`` stack rather than
    adding passlib+bcrypt: one less dependency for the same memory-hard
    guarantee.
    """
    salt = os.urandom(16)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_KEY_LENGTH,
    )
    return f"scrypt${salt.hex()}${derived.hex()}"


def verify_password(password: str, encoded: str) -> bool:
    """Check a password against its stored hash, in constant time."""
    try:
        scheme, salt_hex, digest_hex = encoded.split("$")
    except ValueError:
        return False
    if scheme != "scrypt":
        return False

    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=bytes.fromhex(salt_hex),
        n=_SCRYPT_N,
        r=_SCRYPT_R,
        p=_SCRYPT_P,
        dklen=_KEY_LENGTH,
    )
    # compare_digest: a short-circuiting == would leak the digest by timing.
    return hmac.compare_digest(derived.hex(), digest_hex)


def issue_token(subject: str, role: Role, ttl_seconds: int | None = None) -> str:
    """Mint a session token.

    ``jti`` is included so an individual token can be revoked without
    invalidating every token ever issued.
    """
    settings = get_settings()
    now = datetime.now(timezone.utc)
    ttl = ttl_seconds if ttl_seconds is not None else settings.jwt_ttl_seconds

    payload = {
        "sub": subject,
        "role": str(role),
        "iat": now,
        "exp": now + timedelta(seconds=ttl),
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> AuditorIdentity:
    """Verify and decode a session token.

    Raises ``jwt.InvalidTokenError`` (or a subclass) on anything wrong --
    expired, tampered, wrong algorithm, unknown role.
    """
    settings = get_settings()
    claims = jwt.decode(
        token,
        settings.jwt_secret,
        # Pinning the algorithm list prevents the classic "alg: none" and
        # HS/RS confusion attacks, where an attacker picks the verification
        # algorithm by editing the token header.
        algorithms=[settings.jwt_algorithm],
        options={"require": ["exp", "sub", "role"]},
    )

    try:
        role = Role(claims["role"])
    except ValueError as exc:
        raise jwt.InvalidTokenError(f"Unknown role {claims['role']!r}") from exc

    return AuditorIdentity(
        subject=claims["sub"], role=role, token_id=claims.get("jti", "")
    )
