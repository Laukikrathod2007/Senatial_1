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
from typing import Any, Callable

import numpy as np

from sentinel.engines.redteam.generator import generate_cohort
from sentinel.engines.redteam.taxonomy import TAXONOMY, EdgeCase
from sentinel.reporting.intervals import ProportionInterval, wilson_interval
from sentinel.reporting.normal import norm_sf
from sentinel.target.registry import BlackBoxClient, PredictionBatch


@dataclass(frozen=True)
class CohortResult:
    """Outcome for one edge-case cohort against the baseline."""

    category: str
    description: str
    citizen_description: str
    n: int
    rejection_rate: ProportionInterval
    baseline_rate: float | None
    disparity: float | None
    p_value: float
    requested: int = 0
    attempted: int = 0
    failures: dict[str, int] = field(default_factory=dict)
    metric_available: bool = True

    @property
    def is_significant(self) -> bool:
        """Whether the gap is both statistically and practically meaningful.

        Both conditions matter: at n=500 a 1-point gap can be statistically
        significant while meaning nothing to a citizen, so a 5-point floor keeps
        the report honest about what is worth acting on.
        """
        return (
            self.metric_available
            and self.disparity is not None
            and self.p_value < 0.05
            and self.disparity >= 0.05
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "category": self.category,
            "description": self.description,
            "affected_group": self.citizen_description,
            "profiles_tested": self.n,
            "profiles_requested": self.requested,
            "profiles_attempted": self.attempted,
            "profiles_failed": self.attempted - self.n,
            "profiles_not_attempted": self.requested - self.attempted,
            "failed_probe_types": self.failures,
            "rejection_rate": round(self.rejection_rate.rate, 4) if self.n else None,
            "rejection_rate_ci": (
                [round(self.rejection_rate.ci_low, 4), round(self.rejection_rate.ci_high, 4)]
                if self.n else None
            ),
            "baseline_rejection_rate": (
                round(self.baseline_rate, 4) if self.baseline_rate is not None else None
            ),
            "disparity": round(self.disparity, 4) if self.disparity is not None else None,
            "p_value": float(f"{self.p_value:.2e}"),
            "flagged": self.is_significant,
            "metric_available": self.metric_available,
        }


@dataclass
class RedTeamReport:
    target_id: str
    baseline_rate: float | None = 0.0
    baseline_n: int = 0
    baseline_requested: int = 0
    baseline_attempted: int = 0
    baseline_failures: dict[str, int] = field(default_factory=dict)
    cohorts: list[CohortResult] = field(default_factory=list)
    queries_used: int = 0

    def worst(self) -> CohortResult | None:
        flagged = [c for c in self.cohorts if c.is_significant]
        return max(flagged, key=lambda c: c.disparity or 0.0) if flagged else None

    def headline(self) -> str | None:
        worst = self.worst()
        if worst is None or self.baseline_rate is None or worst.disparity is None:
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
            "one-sided two-proportion z-test with 95% Wilson intervals; "
            "p-values are unadjusted across cohorts",
            "target_id": self.target_id,
            "baseline_rejection_rate": (
                round(self.baseline_rate, 4) if self.baseline_rate is not None else None
            ),
            "baseline_profiles": self.baseline_n,
            "baseline_profiles_requested": self.baseline_requested,
            "baseline_profiles_attempted": self.baseline_attempted,
            "baseline_profiles_completed": self.baseline_n,
            "baseline_profiles_failed": self.baseline_attempted - self.baseline_n,
            "baseline_profiles_not_attempted": self.baseline_requested - self.baseline_attempted,
            "baseline_failed_probe_types": self.baseline_failures,
            "queries_used": self.queries_used,
            "headline": self.headline(),
            "cohorts": [c.to_dict() for c in self.cohorts],
            "disclosure": (
                "On the stand-in demo target the planted eligibility rule "
                "rewards Aadhaar seeding and complete documents, so these "
                "disparities are expected by construction. This validates that "
                "the method recovers a known bias; it is not the discovery of "
                "an unknown one. The reported p-values are exploratory and "
                "are not adjusted for testing multiple cohorts."
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
        progress_callback: Callable[[int, int, int], None] | None = None,
    ) -> RedTeamReport:
        """Submit each cohort and compare rejection rates to the baseline."""
        baseline = np.atleast_2d(np.asarray(baseline, dtype=float))
        baseline_result = self._query(target, baseline)
        if progress_callback is not None:
            progress_callback(
                baseline_result.attempted,
                baseline_result.completed,
                baseline_result.attempted - baseline_result.completed,
            )
        batches: list[tuple[EdgeCase, int, PredictionBatch]] = []
        for offset, case in enumerate(categories):
            profiles = generate_cohort(baseline, case, per_cohort, seed=seed + offset)
            prediction = self._query(target, profiles)
            if progress_callback is not None:
                progress_callback(
                    prediction.attempted,
                    prediction.completed,
                    prediction.attempted - prediction.completed,
                )
            batches.append((case, len(profiles), prediction))
        return self._build_report(target_id, len(baseline), baseline_result, batches)

    @staticmethod
    def _build_report(
        target_id: str,
        baseline_requested: int,
        baseline_result: PredictionBatch,
        batches: list[tuple[EdgeCase, int, PredictionBatch]],
    ) -> RedTeamReport:
        baseline_rows = baseline_result.probabilities[baseline_result.succeeded]
        baseline_rejected = baseline_rows[:, 1] < 0.5
        baseline_count = int(baseline_rejected.sum())
        baseline_rate = float(baseline_rejected.mean()) if len(baseline_rows) else None
        queries = baseline_result.attempted
        cohorts: list[CohortResult] = []

        for case, requested, prediction in batches:
            queries += prediction.attempted
            rejected = prediction.probabilities[prediction.succeeded, 1] < 0.5
            count = int(rejected.sum())
            metrics_available = bool(len(rejected) and len(baseline_rows))
            cohort_rate = count / len(rejected) if len(rejected) else 0.0
            disparity = cohort_rate - baseline_rate if metrics_available else None
            cohorts.append(
                CohortResult(
                    category=case.name,
                    description=case.description,
                    citizen_description=case.citizen_description,
                    n=len(rejected),
                    rejection_rate=wilson_interval(count, len(rejected)),
                    baseline_rate=baseline_rate,
                    disparity=disparity,
                    p_value=(
                        _two_proportion_p(
                            count, len(rejected), baseline_count, len(baseline_rows)
                        ) if metrics_available else 1.0
                    ),
                    requested=requested,
                    attempted=prediction.attempted,
                    failures=prediction.failures,
                    metric_available=metrics_available,
                )
            )

        cohorts.sort(key=lambda c: c.disparity if c.disparity is not None else -1.0, reverse=True)
        return RedTeamReport(
            target_id=target_id,
            baseline_rate=baseline_rate,
            baseline_n=len(baseline_rows),
            baseline_requested=baseline_requested,
            baseline_attempted=baseline_result.attempted,
            baseline_failures=baseline_result.failures,
            cohorts=cohorts,
            queries_used=queries,
        )

    @staticmethod
    def _query(target: BlackBoxClient, profiles: np.ndarray) -> PredictionBatch:
        query_batch = getattr(target, "query_batch", None)
        if callable(query_batch):
            return query_batch(profiles)
        probabilities = np.asarray(target.predict_proba(profiles), dtype=float)
        if probabilities.shape != (len(profiles), 2) or not np.isfinite(probabilities).all():
            raise ValueError("Target returned invalid probability output")
        return PredictionBatch(
            probabilities=probabilities,
            succeeded=np.ones(len(profiles), dtype=bool),
            attempted=len(profiles),
            completed=len(profiles),
            failures={},
        )
