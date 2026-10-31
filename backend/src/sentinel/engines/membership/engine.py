"""M1: Membership & Memorization Audit Engine.

Answers one question: does this system show evidence of having memorized this
specific record, given only the ability to query it?
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

import numpy as np

from sentinel.data.welfare import generate_welfare_dataset
from sentinel.engines.membership.decoys import generate_decoys
from sentinel.engines.membership.lira import (
    GlobalCalibration,
    RecordScore,
    score_records,
)
from sentinel.engines.membership.shadow import ShadowEnsemble, train_shadow_ensemble
from sentinel.reporting.intervals import leakage_verdict
from sentinel.target.registry import BlackBoxClient

# Reference records used to calibrate the target's global confidence offset.
# Drawn from a seed unrelated to the target's, so these are non-members by
# construction -- the auditor synthesized them, so the target cannot have
# trained on them. This is the one assumption the calibration rests on, and it
# is one an auditor can genuinely guarantee in the field.
_CALIBRATION_SEED = 990033
_CALIBRATION_SIZE = 500


@dataclass
class MembershipFinding:
    """One record's result, with the decoy control alongside it."""

    score: RecordScore
    verdict: str
    decoy_mean_score: float | None = None
    decoy_separation: float | None = None

    def to_dict(self) -> dict[str, Any]:
        # The primary quantity reported is the z-score (standard deviations above
        # the calibrated null), NOT the leakage probability. The probability is a
        # normal CDF and saturates to 1.0 for anything past z~2.5, so publishing
        # it as the headline would read as certainty -- "1.0, CI [1.0, 1.0]" --
        # where the evidence supports only "far above the null". Docs §3.4 trap
        # #1 forbids exactly that overstatement. The score is retained as a
        # secondary field for continuity with the LiRA literature.
        return {
            "record_id": self.score.record_id,
            "memorization_z": round(self.score.z_score, 2),
            "p_value": float(f"{self.score.p_value:.2e}"),
            "leakage_score": round(self.score.leakage_score, 4),
            "leakage_score_ci": [
                round(self.score.ci_low, 4),
                round(self.score.ci_high, 4),
            ],
            "null_mean_logit": round(self.score.null_mean, 3),
            "observed_logit": round(self.score.observed_logit, 3),
            "shadow_models": self.score.n_shadows,
            "verdict": self.verdict,
            "decoy_mean_score": (
                round(self.decoy_mean_score, 4)
                if self.decoy_mean_score is not None
                else None
            ),
            "decoy_separation": (
                round(self.decoy_separation, 4)
                if self.decoy_separation is not None
                else None
            ),
        }


@dataclass
class MembershipReport:
    """The engine's output for a batch of probed records."""

    target_id: str
    findings: list[MembershipFinding] = field(default_factory=list)
    queries_used: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "audit_type": "membership_inference",
            "method": "offline one-sided LiRA (Carlini et al. 2022) "
            "with shadow-model null calibration (Shokri et al. 2017)",
            "target_id": self.target_id,
            "queries_used": self.queries_used,
            "findings": [f.to_dict() for f in self.findings],
        }


class MembershipAuditEngine:
    """Black-box memorization auditor.

    Typed against ``BlackBoxClient``: it can query the target and nothing else.
    No weights, no training data, no gradients.
    """

    def __init__(self, shadows: ShadowEnsemble | None = None) -> None:
        self.shadows = shadows or train_shadow_ensemble()
        self._calibration: GlobalCalibration | None = None

    def calibrate(self, target: BlackBoxClient) -> GlobalCalibration:
        """Profile this target's global confidence offset against the shadows.

        Costs ``_CALIBRATION_SIZE`` queries once per target, then is reused for
        every record scored against it. Those queries are metered by M5 like any
        other probe -- calibration is not free of privacy cost.
        """
        if self._calibration is not None:
            return self._calibration

        reference = generate_welfare_dataset(
            n_train=10, n_test=_CALIBRATION_SIZE, n_canaries=0, seed=_CALIBRATION_SEED
        )
        records, labels = reference.x_test, reference.y_test
        row_index = np.arange(len(records))

        target_confidences = target.predict_proba(records)[row_index, labels]
        shadow_confidences = self.shadows.confidence_matrix(records, labels)

        self._calibration = GlobalCalibration.from_reference(
            target_confidences, shadow_confidences
        )
        return self._calibration

    def audit(
        self,
        target: BlackBoxClient,
        records: np.ndarray,
        labels: np.ndarray,
        record_ids: list[str],
        *,
        target_id: str = "unknown",
        with_decoys: bool = False,
        n_decoys: int = 20,
    ) -> MembershipReport:
        """Score each record for memorization evidence."""
        records = np.atleast_2d(np.asarray(records, dtype=float))
        labels = np.asarray(labels, dtype=int)
        row_index = np.arange(len(records))

        calibration_was_cached = self._calibration is not None
        calibration = self.calibrate(target)

        # One batched query for the whole set -- the only target access needed.
        target_confidences = target.predict_proba(records)[row_index, labels]
        shadow_confidences = self.shadows.confidence_matrix(records, labels)

        scores = score_records(
            target_confidences, shadow_confidences, record_ids, calibration
        )
        # Calibration is a real batch of target queries on the first audit.
        # Include it in the report so the API's persisted budget matches actual
        # target access instead of charging only the record/decoy probes.
        queries = len(records) + (
            0 if calibration_was_cached else calibration.n_reference
        )

        findings: list[MembershipFinding] = []
        for i, score in enumerate(scores):
            finding = MembershipFinding(
                score=score, verdict=leakage_verdict(score.z_score, score.ci_low)
            )
            if with_decoys:
                decoy_scores, decoy_queries = self._score_decoys(
                    target, records[i], int(labels[i]), n_decoys, seed=i
                )
                finding.decoy_mean_score = float(np.mean(decoy_scores))
                finding.decoy_separation = score.leakage_score - finding.decoy_mean_score
                queries += decoy_queries
            findings.append(finding)

        return MembershipReport(
            target_id=target_id, findings=findings, queries_used=queries
        )

    def _score_decoys(
        self,
        target: BlackBoxClient,
        record: np.ndarray,
        label: int,
        n_decoys: int,
        seed: int,
    ) -> tuple[np.ndarray, int]:
        """Score near-neighbours of a record as a control."""
        decoys = generate_decoys(record, n=n_decoys, seed=seed)
        decoy_labels = np.full(len(decoys), label, dtype=int)
        row_index = np.arange(len(decoys))

        target_confidences = target.predict_proba(decoys)[row_index, decoy_labels]
        shadow_confidences = self.shadows.confidence_matrix(decoys, decoy_labels)
        scores = score_records(
            target_confidences,
            shadow_confidences,
            [f"decoy-{i}" for i in range(len(decoys))],
            self.calibrate(target),
        )
        return np.array([s.leakage_score for s in scores]), len(decoys)
