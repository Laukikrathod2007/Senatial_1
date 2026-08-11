"""Synthetic citizen profile generation for red-teaming."""

from __future__ import annotations

import numpy as np

from sentinel.engines.redteam.taxonomy import EdgeCase


def generate_cohort(
    baseline: np.ndarray, case: EdgeCase, n: int, seed: int = 0
) -> np.ndarray:
    """Build ``n`` edge-case profiles from a clean baseline population.

    Each profile starts as a copy of a real baseline applicant and is mutated
    along one documented failure mode. Starting from the baseline rather than
    sampling fresh is what makes the comparison fair: the cohorts differ only in
    the edge-case attribute, so a rejection-rate gap cannot be explained by the
    cohorts being different kinds of people to begin with.
    """
    rng = np.random.default_rng(seed)
    source = np.asarray(baseline, dtype=float)
    picks = rng.choice(len(source), size=n, replace=True)
    cohort = source[picks].copy()

    for row in cohort:
        case.mutate(row, rng)

    return cohort
