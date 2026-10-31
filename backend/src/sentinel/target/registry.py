"""Named audit targets and the black-box contract the engines may rely on.

``BlackBoxClient`` is the narrow surface an audit engine is allowed to touch. It
deliberately excludes anything an outside auditor could not reach in reality --
no weights, no training data, no gradients. Typing the engines against this
protocol is what keeps the project's central claim ("no privileged access")
true by construction rather than by convention: an engine that reached into
model internals would not type-check against it.

The registry provides both the original in-process synthetic stand-in and a
controlled local HTTP implementation. The HTTP target is opt-in, loopback-only,
and cannot be selected by an audit request. No arbitrary URL integration exists.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

import numpy as np

from sentinel.cache import cache_key, cached_artifact
from sentinel.config import get_settings
from sentinel.data.welfare import WelfareDataset, generate_welfare_dataset
from sentinel.target.system import TargetSystem, train_target_system

DEMO_TARGET_ID = "welfare-eligibility-demo"
HTTP_DEMO_TARGET_ID = "welfare-eligibility-http-demo"


@dataclass(frozen=True)
class PredictionBatch:
    """Validated target outputs plus explicit per-probe completion evidence."""

    probabilities: np.ndarray
    succeeded: np.ndarray
    attempted: int
    completed: int
    failures: dict[str, int]
    model_id: str | None = None
    model_version: str | None = None


@runtime_checkable
class BlackBoxClient(Protocol):
    """Query-only access to a system under audit."""

    def predict_proba(self, x: np.ndarray) -> np.ndarray:
        """Class probabilities for one or more records."""
        ...


def load_demo_dataset(refresh: bool = False) -> WelfareDataset:
    """The synthetic dataset backing the stand-in target, memoized."""
    key = cache_key(kind="welfare-dataset", version=1)
    return cached_artifact(
        "dataset", key, lambda: generate_welfare_dataset(), refresh=refresh
    )


def load_demo_target(refresh: bool = False) -> tuple[TargetSystem, WelfareDataset]:
    """The stand-in welfare-eligibility system under audit, memoized.

    Returns the dataset alongside it because validation needs ``canary_indices``
    as ground truth. Note that the *engines* never receive the dataset -- only
    the test suite and demo driver do, to check the engines' answers.
    """
    dataset = load_demo_dataset(refresh=refresh)
    settings = get_settings()
    key = cache_key(kind="target", version=1, seed=20260811)
    target = cached_artifact(
        "target", key, lambda: train_target_system(dataset), refresh=refresh
    )
    _ = settings  # settings reserved for future per-target configuration
    return target, dataset


def load_http_demo_target(*, transport=None, progress_callback=None):
    """Construct the explicitly configured local HTTP target adapter."""
    settings = get_settings()
    if not settings.enable_http_demo_target:
        raise RuntimeError("The local HTTP demo target is disabled")
    from sentinel.target.http import HTTPDecisionTarget

    return HTTPDecisionTarget(
        settings.http_demo_target_url,
        timeout_seconds=settings.http_demo_timeout_seconds,
        concurrency=settings.http_demo_concurrency,
        max_probes=settings.http_demo_max_probes,
        transport=transport,
        progress_callback=progress_callback,
    )
