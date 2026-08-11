"""Synthetic Citizen Red-Team: fairness stress testing (PRD 4.2).

Submits cohorts of legitimately-eligible applicants who differ from a clean
baseline only in documented real-world ways, and measures whether any cohort is
rejected at a materially higher rate.

An honesty note that belongs in the presentation, not just the code: on the
stand-in target the disparity is *by construction*. The synthetic eligibility
rule directly rewards ``aadhaar_seeded`` and ``documents_complete``, so cohorts
lacking those will certainly be rejected more often. That makes this a
demonstration that the method recovers a known planted bias -- the same logic as
the M1 canary -- not the discovery of an unknown one. Presenting it as discovery
would be dishonest.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

from sentinel.engines.redteam.generator import generate_cohort
from sentinel.engines.redteam.taxonomy import TAXONOMY, EdgeCase
from sentinel.reporting.intervals import ProportionInterval, wilson_interval
from sentinel.reporting.normal import norm_sf
from sentinel.target.registry import BlackBoxClient


@dataclass(frozen=True)
class CohortResult:
    """Outcome for one edge-case cohort against the baseline."""

    category: str
    description: str
    citizen_description: str
    n: int
    rejection_rate: ProportionInterval
    baseline_rate: float
    disparity: float
    p_value: float

    @property
    def is_significant(self) -> bool:
        """Whether the gap is both statistically and practically meaningful.

        Both conditions matter: at n=500 a 1-point gap can be statistically
        significant while meaning nothing to a citizen, so a 5-point floor keeps
        the report honest about what is worth acting on.
        """
        return self.p_value < 0.05 and self.disparity >= 0.05

    def to_dict(self) -> dict[str, Any]:
        return {
            "category": self.category,
            "description": self.description,
            "affected_group": self.citizen_description,
            "profiles_tested": self.n,
            "rejection_rate": round(self.rejection_rate.rate, 4),
            "rejection_rate_ci": [
                round(self.rejection_rate.ci_low, 4),
                round(self.rejection_rate.ci_high, 4),
            ],
            "baseline_rejection_rate": round(self.baseline_rate, 4),
            "disparity": round(self.disparity, 4),
            "p_value": float(f"{self.p_value:.2e}"),
            "flagged": self.is_significant,
        }


@dataclass
class RedTeamReport:
    target_id: str
    baseline_rate: float = 0.0
    baseline_n: int = 0
    cohorts: list[CohortResult] = field(default_factory=list)
    queries_used: int = 0

    def worst(self) -> CohortResult | None:
        flagged = [c for c in self.cohorts if c.is_significant]
        return max(flagged, key=lambda c: c.disparity) if flagged else None

    def headline(self) -> str | None:
        worst = self.worst()
        if worst is None:
            return None
        return (
            f"{worst.citizen_description} were rejected "
            f"{worst.rejection_rate.rate:.0%} of the time, against "
            f"{self.baseline_rate:.0%} for otherwise identical applicants, "
            f"a gap of {worst.disparity:.0%}."
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "audit_type": "fairness_red_team",
            "method": "synthetic edge-case cohorts vs. matched clean baseline, "
            "two-proportion z-test with Wilson intervals",
            "target_id": self.target_id,
            "baseline_rejection_rate": round(self.baseline_rate, 4),
            "baseline_profiles": self.baseline_n,
            "queries_used": self.queries_used,
            "headline": self.headline(),
            "cohorts": [c.to_dict() for c in self.cohorts],
            "disclosure": (
                "On the stand-in demo target the planted eligibility rule "
                "rewards Aadhaar seeding and complete documents, so these "
                "disparities are expected by construction. This validates that "
                "the method recovers a known bias; it is not the discovery of "
                "an unknown one."
            ),
        }


def _two_proportion_p(
    successes_a: int, n_a: int, successes_b: int, n_b: int
) -> float:
    """One-sided two-proportion z-test: is cohort A rejected more than B?"""
    if n_a == 0 or n_b == 0:
        return 1.0
    rate_a, rate_b = successes_a / n_a, successes_b / n_b
    pooled = (successes_a + successes_b) / (n_a + n_b)
    if pooled in (0.0, 1.0):
        return 1.0
    standard_error = (pooled * (1 - pooled) * (1 / n_a + 1 / n_b)) ** 0.5
    if standard_error == 0:
        return 1.0
    return float(norm_sf((rate_a - rate_b) / standard_error))


class RedTeamEngine:
    """Fairness stress tester."""

    def audit(
        self,
        target: BlackBoxClient,
        baseline: np.ndarray,
        *,
        target_id: str = "unknown",
        per_cohort: int = 500,
        categories: tuple[EdgeCase, ...] = TAXONOMY,
        seed: int = 0,
    ) -> RedTeamReport:
        """Submit each cohort and compare rejection rates to the baseline."""
        baseline = np.atleast_2d(np.asarray(baseline, dtype=float))

        baseline_rejected = target.predict_proba(baseline)[:, 1] < 0.5
        baseline_count = int(baseline_rejected.sum())
        baseline_rate = float(baseline_rejected.mean())
        queries = len(baseline)

        cohorts: list[CohortResult] = []
        for offset, case in enumerate(categories):
            profiles = generate_cohort(baseline, case, per_cohort, seed=seed + offset)
            rejected = target.predict_proba(profiles)[:, 1] < 0.5
            queries += len(profiles)

            count = int(rejected.sum())
            cohorts.append(
                CohortResult(
                    category=case.name,
                    description=case.description,
                    citizen_description=case.citizen_description,
                    n=len(profiles),
                    rejection_rate=wilson_interval(count, len(profiles)),
                    baseline_rate=baseline_rate,
                    disparity=count / len(profiles) - baseline_rate,
                    p_value=_two_proportion_p(
                        count, len(profiles), baseline_count, len(baseline)
                    ),
                )
            )

        cohorts.sort(key=lambda c: c.disparity, reverse=True)

        return RedTeamReport(
            target_id=target_id,
            baseline_rate=baseline_rate,
            baseline_n=len(baseline),
            cohorts=cohorts,
            queries_used=queries,
        )
