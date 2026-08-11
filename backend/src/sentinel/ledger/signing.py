"""Ed25519 key management and detached signatures for audit reports.

The public key is committed to the repository on purpose. Independent
verification means a skeptical reader must be able to check a signature without
asking our server for the key it should be checked against -- otherwise a
compromised server could hand out a key matching forged reports.
"""

from __future__ import annotations

from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

from sentinel.config import get_settings


def generate_keypair(force: bool = False) -> tuple[Path, Path]:
    """Create the signing keypair if absent. Returns (private, public) paths.

    Refuses to overwrite an existing private key unless ``force`` is set:
    silently rotating the key would invalidate every previously sealed report,
    which is indistinguishable from tampering to anyone verifying them.
    """
    settings = get_settings()
    settings.ensure_dirs()

    if settings.private_key_path.exists() and not force:
        return settings.private_key_path, settings.public_key_path

    private_key = Ed25519PrivateKey.generate()
    private_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_bytes = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    settings.private_key_path.write_bytes(private_bytes)
    settings.public_key_path.write_bytes(public_bytes)
    # Owner-only on POSIX; a no-op on Windows, where NTFS ACLs govern instead.
    settings.private_key_path.chmod(0o600)
    return settings.private_key_path, settings.public_key_path


def load_private_key() -> Ed25519PrivateKey:
    """Load the signing key, generating one on first use."""
    settings = get_settings()
    if not settings.private_key_path.exists():
        generate_keypair()
    key = serialization.load_pem_private_key(
        settings.private_key_path.read_bytes(), password=None
    )
    if not isinstance(key, Ed25519PrivateKey):
        raise TypeError("Configured private key is not an Ed25519 key")
    return key


def load_public_key() -> Ed25519PublicKey:
    """Load the verification key."""
    settings = get_settings()
    if not settings.public_key_path.exists():
        generate_keypair()
    key = serialization.load_pem_public_key(settings.public_key_path.read_bytes())
    if not isinstance(key, Ed25519PublicKey):
        raise TypeError("Configured public key is not an Ed25519 key")
    return key


def sign_bytes(payload: bytes, private_key: Ed25519PrivateKey | None = None) -> str:
    """Sign exactly these bytes. Returns a hex-encoded detached signature."""
    key = private_key or load_private_key()
    return key.sign(payload).hex()


def verify_signature(
    payload: bytes, signature_hex: str, public_key: Ed25519PublicKey | None = None
) -> bool:
    """Check a signature against exactly these bytes.

    Returns False rather than raising, because a bad signature is an expected
    audit outcome (that is the tamper detection working), not an error.
    """
    key = public_key or load_public_key()
    try:
        key.verify(bytes.fromhex(signature_hex), payload)
    except (InvalidSignature, ValueError):
        return False
    return True
