"""Offline likelihood-ratio membership scoring (Carlini et al., LiRA, S&P 2022).

Full LiRA trains IN-models (with the record) and OUT-models (without) per target
record and compares two Gaussians. That needs models-per-record and is
infeasible at audit time. The *offline* one-sided variant used here fits only the
OUT distribution and asks how extreme the target's confidence is against it --
the standard practical simplification, and honest to state as such.

Why this rather than a confidence threshold: ordinary training records also read
as more-confident than held-out records (measured AUC 0.838 on this target), so a
global cutoff flags roughly one ordinary record in five. Calibrating per record
against its own null fixes that -- a record every model is confident about scores
low even at confidence 0.99, because the null is confident too.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from sentinel.reporting.normal import norm_cdf, norm_sf

# Confidences saturate at 1.0, where a linear scale has no resolution left and
# the distribution is badly non-Gaussian. The logit transform spreads that
# boundary out so a Gaussian null is a defensible fit.
_EPSILON = 1e-6

# Floors the null spread. Without it, a record on which every shadow agrees
# exactly yields sigma=0 and an infinite z-score -- reporting certainty produced
# by a division, not by evidence.
_MIN_SIGMA = 1e-3


@dataclass(frozen=True)
class GlobalCalibration:
    """Correction for the target's overall confidence offset against the shadows.

    Without this, M1 does not measure memorization -- it measures "is the target
    more confident than my shadows", which is true of *every* member record
    because the target is more overfit than any shadow. Measured on this demo
    target, that mistake flagged 82% of ordinary training records as memorized.

    The fix is the shift-and-scale step standard in LiRA implementations: profile
    the target-minus-null gap on a reference population the auditor can
    legitimately obtain (records it synthesized itself, which the target cannot
    have trained on), then express each probed record's gap relative to that
    baseline. A record is evidence of memorization only if it is extreme *even
    after* accounting for how much more confident this target runs in general.
    """

    gap_mean: float
    gap_std: float
    n_reference: int

    @classmethod
    def from_reference(
        cls, target_confidences: np.ndarray, shadow_confidences: np.ndarray
    ) -> "GlobalCalibration":
        """Profile the gap distribution on known non-member records."""
        observed = logit_scale(target_confidences)
        nulls = logit_scale(shadow_confidences)
        gaps = observed - nulls.mean(axis=0)
        return cls(
            gap_mean=float(gaps.mean()),
            gap_std=max(float(gaps.std(ddof=1)), _MIN_SIGMA),
            n_reference=len(gaps),
        )


@dataclass(frozen=True)
class RecordScore:
    """Memorization evidence for one record.

    Deliberately carries no boolean "leaked" field (docs §3.4, trap #1).
    Membership inference is probabilistic; a bare yes/no would be both
    technically wrong and legally risky to present as fact. Callers wanting a
    human verdict go through ``reporting.intervals.leakage_verdict``, which
    returns an evidence band and requires the interval alongside it.
    """

    record_id: str
    observed_logit: float
    null_mean: float
    null_std: float
    z_score: float
    leakage_score: float
    p_value: float
    ci_low: float
    ci_high: float
    n_shadows: int


def logit_scale(p: float | np.ndarray) -> np.ndarray:
    """log(p / (1-p)), clipped away from the asymptotes."""
    p = np.clip(np.asarray(p, dtype=float), _EPSILON, 1.0 - _EPSILON)
    return np.log(p / (1.0 - p))


def score_from_nulls(
    observed: float,
    nulls: np.ndarray,
    *,
    record_id: str,
    calibration: GlobalCalibration,
    n_bootstrap: int = 1000,
    rng: np.random.Generator | None = None,
) -> RecordScore:
    """Score one record against its shadow-derived null, globally calibrated.

    One-sided by construction: memorization can only push confidence *above*
    what an unacquainted model would show. A record the target finds unusually
    hard is not evidence of memorization, so the lower tail is not interesting.

    The z-score is computed against the *calibrated gap* distribution rather
    than the raw per-record null. See ``GlobalCalibration`` for why the raw null
    alone flags most member records regardless of memorization.
    """
    rng = rng or np.random.default_rng(0)
    nulls = np.asarray(nulls, dtype=float)

    mean = float(nulls.mean())
    std = max(float(nulls.std(ddof=1)) if len(nulls) > 1 else 0.0, _MIN_SIGMA)

    gap = observed - mean
    z = (gap - calibration.gap_mean) / calibration.gap_std
    leakage = float(norm_cdf(z))
    p_value = float(norm_sf(z))

    # Bootstrap the shadow ensemble to express how much of this score is an
    # artifact of having trained only n_shadows reference models. With 16
    # shadows the interval is visibly wide, which is the honest picture.
    resampled = rng.choice(nulls, size=(n_bootstrap, len(nulls)), replace=True)
    boot_gap = observed - resampled.mean(axis=1)
    boot_scores = norm_cdf(
        (boot_gap - calibration.gap_mean) / calibration.gap_std
    )
    ci_low, ci_high = np.percentile(boot_scores, [2.5, 97.5])

    return RecordScore(
        record_id=record_id,
        observed_logit=float(observed),
        null_mean=mean,
        null_std=std,
        z_score=float(z),
        leakage_score=leakage,
        p_value=p_value,
        ci_low=float(ci_low),
        ci_high=float(ci_high),
        n_shadows=len(nulls),
    )


def score_records(
    target_confidences: np.ndarray,
    shadow_confidences: np.ndarray,
    record_ids: list[str],
    calibration: GlobalCalibration,
    *,
    seed: int = 0,
) -> list[RecordScore]:
    """Score a batch.

    ``target_confidences``: shape (n_records,) -- true-label probability from the
    system under audit. ``shadow_confidences``: shape (n_shadows, n_records).
    Both are probabilities; the transform to logit space happens here so callers
    cannot forget it.

    ``calibration`` is required rather than optional: an uncalibrated score is
    not a memorization measurement, and making it easy to omit would make the
    engine's headline claim quietly wrong.
    """
    observed = logit_scale(target_confidences)
    nulls = logit_scale(shadow_confidences)
    rng = np.random.default_rng(seed)

    return [
        score_from_nulls(
            float(observed[i]),
            nulls[:, i],
            record_id=record_ids[i],
            calibration=calibration,
            rng=rng,
        )
        for i in range(len(record_ids))
    ]
