"""Central configuration: filesystem paths, crypto keys, privacy budgets.

Every module imports its paths from here rather than computing its own, so the
runtime layout under ``var/`` has exactly one definition.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/src/sentinel/config.py -> backend/
_BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Runtime settings, overridable by ``SENTINEL_``-prefixed env vars."""

    model_config = SettingsConfigDict(
        env_prefix="SENTINEL_",
        env_file=".env",
        extra="ignore",
    )

    # -- filesystem --------------------------------------------------------
    backend_root: Path = _BACKEND_ROOT
    var_dir: Path = _BACKEND_ROOT / "var"

    # -- ledger (M3) -------------------------------------------------------
    # SQLite rather than PostgreSQL: append-only is enforced by the service
    # layer and the hash chain, not by the database engine, so Postgres would
    # add a container without adding a guarantee.
    database_url: str = f"sqlite:///{(_BACKEND_ROOT / 'var' / 'sentinel.db').as_posix()}"

    # -- gateway (M4) ------------------------------------------------------
    # Dev default only. Production must set SENTINEL_JWT_SECRET; a fixed secret
    # in source would let anyone mint a certified-auditor token.
    #
    # 64 hex chars = 32 bytes, the minimum for HS256 under RFC 7518 §3.2. A
    # shorter secret weakens the signature and makes PyJWT warn on every call.
    jwt_secret: str = "dev-only-insecure-change-me-0000000000000000000000000000000000000"
    jwt_algorithm: str = "HS256"
    jwt_ttl_seconds: int = 3600

    # -- privacy (M5) ------------------------------------------------------
    # delta is fixed well below 1/n for the dataset size we audit against.
    dp_delta: float = 1e-5
    # Noise multiplier (sigma) for the Gaussian mechanism in query accounting.
    #
    # Chosen by working backwards from the audit sizes the roles permit. At
    # sigma=1 a 100-query audit already costs eps~96, which is not a privacy
    # guarantee in any meaningful sense (useful DP lives around eps 1-10) and
    # would deny every audit the tool exists to run. At sigma=40 the ladder is
    # sensible: 200 queries ~ eps 1.4, 2,000 ~ 5.4, 20,000 ~ 22.
    dp_noise_multiplier: float = 40.0

    # -- membership inference (M1) ----------------------------------------
    shadow_count: int = 16
    shadow_train_size: int = 4000

    @property
    def keys_dir(self) -> Path:
        return self.var_dir / "keys"

    @property
    def artifacts_dir(self) -> Path:
        return self.var_dir / "artifacts"

    @property
    def private_key_path(self) -> Path:
        return self.keys_dir / "ed25519_private.pem"

    @property
    def public_key_path(self) -> Path:
        return self.keys_dir / "ed25519_public.pem"

    def ensure_dirs(self) -> None:
        """Create runtime directories. Safe to call repeatedly."""
        self.keys_dir.mkdir(parents=True, exist_ok=True)
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
