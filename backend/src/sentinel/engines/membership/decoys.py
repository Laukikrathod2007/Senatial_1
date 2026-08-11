"""Statistically-matched decoy records (PRD §4.1).

A decoy is a near-neighbour of the record under test: close enough that a model
which merely generalizes well over this region treats it the same, but not the
record itself. The contrast is the control.

If a record scores high and its decoys score low, the target is responding to
*that specific record* -- memorization. If the record and its decoys all score
high, the target is simply confident in this neighbourhood and the high score
says nothing about membership. Without this control, a leakage score alone
cannot separate those two explanations.
"""

from __future__ import annotations

import numpy as np

from sentinel.data.welfare import FEATURE_NAMES

# Features that are categorical/binary in the schema: jitter would be nonsense.
_BINARY_FEATURES = {"aadhaar_seeded", "documents_complete"}
# Integer-valued counts: perturb on the integer lattice, not continuously.
_COUNT_FEATURES = {"household_size", "prior_scheme_count"}


def generate_decoys(
    record: np.ndarray,
    n: int = 20,
    *,
    relative_jitter: float = 0.05,
    feature_names: list[str] | None = None,
    seed: int = 0,
) -> np.ndarray:
    """Draw ``n`` near-neighbours of ``record``.

    Perturbation is proportional (5% by default) so it stays meaningful across
    features whose scales differ by orders of magnitude -- a fixed absolute
    jitter would be invisible on income and enormous on land holding.

    Binary features are held fixed: flipping "documents complete" produces a
    different kind of applicant, not a neighbour of this one.
    """
    names = feature_names or list(FEATURE_NAMES)
    rng = np.random.default_rng(seed)
    record = np.asarray(record, dtype=float).ravel()

    decoys = np.tile(record, (n, 1))
    for j, name in enumerate(names):
        if name in _BINARY_FEATURES:
            continue
        scale = abs(record[j]) * relative_jitter
        if scale == 0.0:
            continue
        noise = rng.normal(0.0, scale, size=n)
        if name in _COUNT_FEATURES:
            decoys[:, j] = np.maximum(np.round(record[j] + noise), 0)
        else:
            decoys[:, j] = np.maximum(record[j] + noise, 0.0)

    return decoys
