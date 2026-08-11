"""Canonical serialization and hashing for audit reports.

Determinism is the whole ballgame. If two serializations of the same logical
payload differ by so much as a space, verification fails for an untampered
report and the ledger's central claim collapses. Everything here exists to make
one payload produce exactly one byte string, forever.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

# The chain's first link. 64 zeros is not a valid SHA-256 of anything anyone can
# produce, so it cannot be confused with a real predecessor.
GENESIS_HASH = "0" * 64


def canonical_bytes(payload: dict[str, Any]) -> bytes:
    """Serialize a payload to its one canonical byte representation.

    - ``sort_keys`` removes dict ordering as a source of variation.
    - ``separators`` without spaces removes whitespace as a source of variation.
    - ``ensure_ascii=False`` keeps non-ASCII text (Indian-language names in a
      real deployment) as UTF-8 rather than \\u escapes, which are lossy to
      round-trip across implementations.
    - ``allow_nan=False`` rejects NaN/Infinity, which are not valid JSON and
      serialize inconsistently across parsers. An audit statistic that is NaN is
      a bug worth failing loudly on, not sealing into the record.
    """
    text = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )
    return text.encode("utf-8")


def sha256_hex(data: bytes) -> str:
    """Hex-encoded SHA-256 digest."""
    return hashlib.sha256(data).hexdigest()


def hash_payload(payload: dict[str, Any]) -> str:
    """Convenience: canonical-serialize then hash."""
    return sha256_hex(canonical_bytes(payload))
