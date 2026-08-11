"""Counterfactual construction for explanation testing (M2).

Deliberately *counterfactual perturbation testing*, not SHAP/LIME attribution.
The docs describe M2 as "SHAP/LIME-style", which overstates it: no Shapley
values are computed here. Perturbation is the better fit anyway -- the claim
under test is causal ("this feature is why you were rejected"), and the direct
way to test a causal claim is to intervene on that feature and see whether the
outcome changes.
"""

from __future__ import annotations

import numpy as np

from sentinel.engines.explainability.domain import FeatureDomain


def counterfactual(
    record: np.ndarray,
    feature: str,
    feature_names: list[str],
    domains: dict[str, FeatureDomain],
) -> np.ndarray:
    """Return ``record`` with only ``feature`` moved to its most favorable value.

    Every other feature is held exactly constant. That isolation is what makes
    a flipped decision attributable to this feature and nothing else.
    """
    if feature not in domains:
        raise KeyError(f"No domain defined for feature {feature!r}")

    index = feature_names.index(feature)
    domain = domains[feature]
    probe = np.array(record, dtype=float, copy=True)
    probe[index] = domain.clamp(domain.favorable_value)
    return probe


def counterfactual_batch(
    records: np.ndarray,
    features: list[str],
    feature_names: list[str],
    domains: dict[str, FeatureDomain],
) -> np.ndarray:
    """Build one counterfactual per record, each varying its own named feature.

    Batched because M2 resubmits thousands of probes: the target's per-call
    overhead on a 180-tree forest dominates, and a per-record loop made this
    step take minutes instead of seconds.
    """
    records = np.atleast_2d(np.asarray(records, dtype=float))
    if len(records) != len(features):
        raise ValueError(
            f"Got {len(records)} records but {len(features)} features to perturb"
        )

    probes = np.array(records, dtype=float, copy=True)
    index_of = {name: i for i, name in enumerate(feature_names)}

    for row, feature in enumerate(features):
        domain = domains[feature]
        probes[row, index_of[feature]] = domain.clamp(domain.favorable_value)

    return probes
