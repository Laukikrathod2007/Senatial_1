"""M2: Explainability-Decision Consistency Auditor.

Tests whether a system's stated reason for a rejection is the actual cause of
that rejection. For each rejected applicant the engine takes the reason the
system gave, changes only the named feature to its most favorable plausible
value, resubmits, and checks whether the decision flips.

If it does not flip, the stated reason was not operative: the applicant was told
something that would not have changed their outcome, and any appeal built on it
is doomed before it starts.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np

from sentinel.data.welfare import FEATURE_LABELS
from sentinel.engines.explainability.domain import FeatureDomain, derive_domains
from sentinel.engines.explainability.perturb import counterfactual_batch
from sentinel.reporting.intervals import ProportionInterval, wilson_interval
from sentinel.target.system import TargetSystem


@dataclass(frozen=True)
class FeatureReliability:
    """How often a stated reason holds up, for one feature."""

    feature: str
    label: str
    n_cases: int
    n_flipped: int
    reliability: float
    mismatch: ProportionInterval

    @property
    def verdict(self) -> str:
        if not self.mismatch.is_significant:
            return "no evidence of inconsistency"
        if self.mismatch.rate >= 0.30:
            return "frequently inconsistent"
        if self.mismatch.rate >= 0.10:
            return "sometimes inconsistent"
        return "occasionally inconsistent"

    def to_dict(self) -> dict[str, Any]:
        return {
            "feature": self.feature,
            "citizen_label": self.label,
            "cases_tested": self.n_cases,
            "decision_changed": self.n_flipped,
            "reliability": round(self.reliability, 4),
            "mismatch_rate": round(self.mismatch.rate, 4),
            # Wilson, not normal-approximation: one feature here has n=9, where
            # the normal interval runs outside [0,1] and understates uncertainty.
            "mismatch_rate_ci": [
                round(self.mismatch.ci_low, 4),
                round(self.mismatch.ci_high, 4),
            ],
            "verdict": self.verdict,
        }


@dataclass
class ExplainabilityReport:
    """Per-feature reliability across all tested rejections."""

    target_id: str
    features: list[FeatureReliability] = field(default_factory=list)
    total_cases: int = 0
    total_mismatches: int = 0
    queries_used: int = 0

    @property
    def overall_mismatch(self) -> ProportionInterval:
        return wilson_interval(self.total_mismatches, self.total_cases)

    def headline(self) -> str | None:
        """The single most citizen-legible finding.

        Chooses the feature with the most tested cases among those showing
        significant inconsistency -- a large-n moderate effect is more defensible
        to put in front of a grievance officer than a small-n dramatic one.
        """
        significant = [f for f in self.features if f.mismatch.is_significant]
        if not significant:
            return None
        best = max(significant, key=lambda f: f.n_cases)
        if best.mismatch.rate <= 0:
            return None
        one_in = round(1 / best.mismatch.rate)
        # Straight quotes: this string reaches Windows consoles and printed
        # grievance filings, where smart quotes mojibake under cp1252.
        return (
            f'About 1 in {one_in} people told "{best.label} is why you were '
            f'rejected" would still have been rejected after that was fixed.'
        )

    def to_dict(self) -> dict[str, Any]:
        overall = self.overall_mismatch
        return {
            "audit_type": "explainability_consistency",
            "method": "counterfactual perturbation testing within "
            "auditor-derived realistic input ranges",
            "target_id": self.target_id,
            "scope": "rejected applications only",
            "cases_tested": self.total_cases,
            "queries_used": self.queries_used,
            "overall_mismatch_rate": round(overall.rate, 4),
            "overall_mismatch_ci": [round(overall.ci_low, 4), round(overall.ci_high, 4)],
            "headline": self.headline(),
            "per_feature": [f.to_dict() for f in self.features],
        }


class ExplainabilityAuditEngine:
    """Black-box auditor for stated-reason consistency."""

    def __init__(self, domains: dict[str, FeatureDomain] | None = None) -> None:
        self._domains = domains

    def domains_for(self, reference: np.ndarray, feature_names: list[str]):
        if self._domains is None:
            self._domains = derive_domains(reference, feature_names)
        return self._domains

    def audit(
        self,
        target: TargetSystem,
        applicants: np.ndarray,
        reference: np.ndarray,
        *,
        target_id: str = "unknown",
        max_cases: int = 600,
    ) -> ExplainabilityReport:
        """Audit the target's stated rejection reasons.

        Scoped to rejections deliberately: the stand-in system returns one canned
        reason for every approval, so including approvals would inflate the
        denominator with cases that carry no testable claim.
        """
        applicants = np.atleast_2d(np.asarray(applicants, dtype=float))
        feature_names = target.feature_names
        domains = self.domains_for(reference, feature_names)

        # Pass 1: one batched call for baseline decisions.
        baseline_proba = target.predict_proba(applicants)[:, 1]
        queries = len(applicants)
        rejected_mask = baseline_proba < 0.5
        rejected = applicants[rejected_mask][:max_cases]

        if len(rejected) == 0:
            return ExplainabilityReport(target_id=target_id, queries_used=queries)

        # Stated reasons come from the explanation generator, which is cheap and
        # local -- it never calls the classifier, which is precisely the flaw
        # being audited.
        reasons = [target.stated_reason_for(record) for record in rejected]

        # Pass 2: one batched call for all counterfactuals.
        probes = counterfactual_batch(rejected, reasons, feature_names, domains)
        probe_proba = target.predict_proba(probes)[:, 1]
        queries += len(probes)

        flipped = probe_proba >= 0.5

        features: list[FeatureReliability] = []
        for feature in sorted(set(reasons)):
            selector = np.array([r == feature for r in reasons])
            n_cases = int(selector.sum())
            n_flipped = int(flipped[selector].sum())
            features.append(
                FeatureReliability(
                    feature=feature,
                    label=FEATURE_LABELS.get(feature, feature),
                    n_cases=n_cases,
                    n_flipped=n_flipped,
                    reliability=n_flipped / n_cases if n_cases else 0.0,
                    mismatch=wilson_interval(n_cases - n_flipped, n_cases),
                )
            )

        features.sort(key=lambda f: f.mismatch.rate, reverse=True)

        return ExplainabilityReport(
            target_id=target_id,
            features=features,
            total_cases=len(rejected),
            total_mismatches=int((~flipped).sum()),
            queries_used=queries,
        )
