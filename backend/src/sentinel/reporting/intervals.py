"""Confidence intervals and evidence bands.

Two rules this module exists to enforce (docs §3.4):

1. No audit finding is ever reported as a bare boolean. Membership inference is
   probabilistic; "LEAKED" would be technically wrong and legally risky to put
   in front of a grievance officer. Findings are evidence bands with intervals.
2. Small-sample rates get Wilson intervals, not normal-approximation ones. At
   n=9 the normal approximation produces intervals that run outside [0,1] and
   badly understate uncertainty.
"""

from __future__ import annotations

from dataclasses import dataclass

from sentinel.reporting.normal import norm_ppf

# Evidence bands are keyed on the z-score, not on the leakage probability.
#
# The leakage score is a normal CDF, so it saturates: any z above ~2.5 rounds to
# 1.0 and every distinction beyond that is lost. Measured on the demo target, a
# 0.95 cutoff on the score flagged 74% of ordinary training records alongside
# 100% of planted canaries -- useless for telling a citizen anything. The same
# records at z>=5 separate cleanly (canaries 80%, ordinary 0.5%, held-out 0%).
#
# The bands are therefore calibrated to distinguish *degrees* of memorization,
# because an overfit model memorizes much of its training set to some degree and
# only outliers are memorized strongly enough to be individually identifiable.
_STRONG_Z = 5.0
_MODERATE_Z = 3.0
_WEAK_Z = 1.5


def leakage_verdict(z_score: float, ci_low: float) -> str:
    """Map a calibrated z-score to an evidence band.

    Wording never asserts a fact -- "evidence" throughout, never "leaked"
    (docs §3.4, trap #1). ``ci_low`` gates the strongest band so a high z with a
    wide bootstrap interval is reported one level more cautiously.
    """
    if z_score >= _STRONG_Z and ci_low >= 0.95:
        return "strong evidence of memorization"
    if z_score >= _MODERATE_Z:
        return "moderate evidence of memorization"
    if z_score >= _WEAK_Z:
        return "weak evidence of memorization"
    return "no meaningful evidence of memorization"


@dataclass(frozen=True)
class ProportionInterval:
    """A rate with its uncertainty."""

    numerator: int
    denominator: int
    rate: float
    ci_low: float
    ci_high: float

    @property
    def is_significant(self) -> bool:
        """True when the interval excludes zero."""
        return self.ci_low > 0.0


def wilson_interval(
    successes: int, trials: int, confidence: float = 0.95
) -> ProportionInterval:
    """Wilson score interval for a binomial proportion.

    Chosen over the normal approximation because M2 reports per-feature mismatch
    rates where one feature has n=9. Wilson stays inside [0,1] and keeps
    sensible coverage at small n; the normal approximation does neither.
    """
    if trials <= 0:
        return ProportionInterval(successes, 0, 0.0, 0.0, 0.0)

    z = norm_ppf(1 - (1 - confidence) / 2)
    rate = successes / trials
    denominator = 1 + z**2 / trials
    centre = (rate + z**2 / (2 * trials)) / denominator
    spread = (
        z * ((rate * (1 - rate) / trials + z**2 / (4 * trials**2)) ** 0.5)
    ) / denominator

    # float() rather than numpy scalars: these values are serialized into signed
    # ledger payloads, and json.dumps cannot encode np.float64.
    return ProportionInterval(
        numerator=int(successes),
        denominator=int(trials),
        rate=float(rate),
        ci_low=float(max(0.0, centre - spread)),
        ci_high=float(min(1.0, centre + spread)),
    )
