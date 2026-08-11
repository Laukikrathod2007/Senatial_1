"""Disk cache for expensive artifacts (trained target, shadow ensembles).

The target model takes ~15s to fit and a 16-model shadow ensemble takes minutes.
Retraining those on every test run or demo rehearsal is unaffordable, so they are
memoized to ``var/artifacts/`` keyed by the parameters that produced them.
"""

from __future__ import annotations

import hashlib
import pickle
from collections.abc import Callable
from pathlib import Path
from typing import Any, TypeVar

from sentinel.config import get_settings

T = TypeVar("T")


def cache_key(**parts: Any) -> str:
    """Stable short key from the parameters that determine an artifact.

    Sorted so that argument order never changes the key.
    """
    material = "|".join(f"{k}={parts[k]!r}" for k in sorted(parts))
    return hashlib.sha256(material.encode("utf-8")).hexdigest()[:16]


def cached_artifact(
    name: str,
    key: str,
    build: Callable[[], T],
    *,
    refresh: bool = False,
) -> T:
    """Return ``build()``'s result, reusing a cached copy when one exists.

    Pickle is appropriate here because these files are produced and consumed
    solely by this application on the local machine; they are never accepted
    from a user or transported between hosts.
    """
    settings = get_settings()
    settings.ensure_dirs()
    path: Path = settings.artifacts_dir / f"{name}-{key}.pkl"

    if path.exists() and not refresh:
        try:
            with path.open("rb") as handle:
                return pickle.load(handle)
        except (pickle.UnpicklingError, EOFError, AttributeError, ImportError):
            # A cache written by incompatible code is worthless, not fatal:
            # fall through and rebuild rather than failing the run.
            path.unlink(missing_ok=True)

    artifact = build()
    tmp = path.with_suffix(".pkl.tmp")
    with tmp.open("wb") as handle:
        pickle.dump(artifact, handle, protocol=pickle.HIGHEST_PROTOCOL)
    # Atomic replace so an interrupted write can never leave a half-file that a
    # later run would load as valid.
    tmp.replace(path)
    return artifact
