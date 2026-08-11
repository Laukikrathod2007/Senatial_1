"""Differential-privacy noise mechanisms for report release (M5)."""

from __future__ import annotations

import numpy as np


def laplace_noise(
    value: float, sensitivity: float, epsilon: float, rng: np.random.Generator
) -> float:
    """Add Laplace(sensitivity/eps) noise to a scalar statistic."""
    if epsilon <= 0:
        raise ValueError("epsilon must be positive")
    if sensitivity < 0:
        raise ValueError("sensitivity cannot be negative")
    if sensitivity == 0:
        return value
    return float(value + rng.laplace(0.0, sensitivity / epsilon))


def privatize_count(
    count: int, epsilon: float, rng: np.random.Generator, *, non_negative: bool = True
) -> float:
    """Release a count under eps-DP.

    Sensitivity is 1: adding or removing one individual changes any count by at
    most one.
    """
    noisy = laplace_noise(float(count), 1.0, epsilon, rng)
    return max(0.0, noisy) if non_negative else noisy


def privatize_rate(
    rate: float, denominator: int, epsilon: float, rng: np.random.Generator
) -> float:
    """Release a proportion under eps-DP, clipped to [0, 1].

    Sensitivity is 1/n: one individual can move a rate over n cases by at most
    that. This is why noising an aggregate is nearly free while noising a
    per-record score is not -- at n=436 the noise scale is 0.0023 against a
    finding of 0.094, whereas for a single record sensitivity would be 1.
    """
    if denominator <= 0:
        return rate
    noisy = laplace_noise(rate, 1.0 / denominator, epsilon, rng)
    return float(np.clip(noisy, 0.0, 1.0))
