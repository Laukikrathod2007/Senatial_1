"""M1 validation (docs §7.2): confirm planted canaries are flagged and
held-out non-members are not.

Marked slow: these train a 16-model shadow ensemble on first run (~10s, then
cached to var/artifacts/).
"""

from __future__ import annotations

import numpy as np
import pytest
from sklearn.metrics import roc_auc_score

from sentinel.engines.membership import MembershipAuditEngine
from sentinel.engines.membership.decoys import generate_decoys
from sentinel.engines.membership.lira import GlobalCalibration, logit_scale
from sentinel.reporting.intervals import leakage_verdict

pytestmark = pytest.mark.slow

_SAMPLE = 150


@pytest.fixture(scope="module")
def scored(demo_target):
    """Score canary, ordinary-member, and held-out populations once."""
    target, dataset = demo_target
    engine = MembershipAuditEngine()

    canary_idx = dataset.canary_indices
    ordinary_mask = np.ones(len(dataset.x_train), dtype=bool)
    ordinary_mask[canary_idx] = False
    rng = np.random.default_rng(0)
    ordinary_idx = rng.choice(np.where(ordinary_mask)[0], _SAMPLE, replace=False)
    heldout_idx = rng.choice(len(dataset.x_test), _SAMPLE, replace=False)

    def run(x, y, tag):
        return engine.audit(
            target, x, y, [f"{tag}-{i}" for i in range(len(x))], target_id="demo"
        )

    return {
        "engine": engine,
        "target": target,
        "dataset": dataset,
        "canary": run(
            dataset.x_train[canary_idx], dataset.y_train[canary_idx], "canary"
        ),
        "ordinary": run(
            dataset.x_train[ordinary_idx], dataset.y_train[ordinary_idx], "ordinary"
        ),
        "heldout": run(dataset.x_test[heldout_idx], dataset.y_test[heldout_idx], "test"),
    }


def _z(report) -> np.ndarray:
    return np.array([f.score.z_score for f in report.findings])


# -- the core claim ----------------------------------------------------------


def test_canaries_score_above_ordinary_members_above_heldout(scored):
    """The ordering the whole module rests on."""
    canary, ordinary, heldout = (
        _z(scored["canary"]).mean(),
        _z(scored["ordinary"]).mean(),
        _z(scored["heldout"]).mean(),
    )
    assert canary > ordinary > heldout


def test_canary_detection_auc_is_high(scored):
    """Docs §7.2: flags the known-memorized record, not the held-out one."""
    canary, heldout = _z(scored["canary"]), _z(scored["heldout"])
    labels = np.r_[np.ones(len(canary)), np.zeros(len(heldout))]
    assert roc_auc_score(labels, np.r_[canary, heldout]) >= 0.90


def test_most_canaries_reach_strong_evidence(scored):
    verdicts = [f.verdict for f in scored["canary"].findings]
    strong = sum(v.startswith("strong") for v in verdicts)
    assert strong / len(verdicts) >= 0.60


def test_heldout_records_are_almost_never_flagged_strongly(scored):
    """False positives here would accuse a system of leaking a record it never saw."""
    verdicts = [f.verdict for f in scored["heldout"].findings]
    strong = sum(v.startswith("strong") for v in verdicts)
    assert strong / len(verdicts) <= 0.02


def test_ordinary_members_rarely_reach_strong_evidence(scored):
    """The failure mode global calibration exists to prevent.

    An overfit model memorizes much of its training set weakly, so ordinary
    members legitimately show *some* signal. What must not happen is ordinary
    members reaching the same band as planted canaries — before calibration,
    74% of them did.
    """
    verdicts = [f.verdict for f in scored["ordinary"].findings]
    strong = sum(v.startswith("strong") for v in verdicts)
    assert strong / len(verdicts) <= 0.10


# -- trap #1: probabilistic, never absolute ----------------------------------


def test_findings_carry_no_boolean_leaked_field(scored):
    """A bare yes/no would be technically wrong and legally risky."""
    payload = scored["canary"].findings[0].to_dict()
    assert not any(isinstance(v, bool) for v in payload.values())
    assert "leaked" not in payload


def test_verdict_wording_never_asserts_certainty(scored):
    for report in (scored["canary"], scored["ordinary"], scored["heldout"]):
        for finding in report.findings:
            assert "evidence" in finding.verdict
            assert "leaked" not in finding.verdict.lower()


def test_confidence_interval_brackets_the_score(scored):
    for finding in scored["canary"].findings:
        score = finding.score
        assert score.ci_low <= score.leakage_score <= score.ci_high


def test_wide_interval_downgrades_the_strong_verdict():
    """A high z with an uncertain interval is reported one band lower."""
    assert leakage_verdict(6.0, ci_low=0.99).startswith("strong")
    assert leakage_verdict(6.0, ci_low=0.50).startswith("moderate")


# -- decoy control -----------------------------------------------------------


def test_decoys_stay_close_to_their_source_record(demo_target):
    """A decoy must be a near-neighbour, not a different applicant."""
    _, dataset = demo_target
    record = dataset.x_train[dataset.canary_indices[0]]
    decoys = generate_decoys(record, n=32, seed=3)

    assert decoys.shape == (32, len(record))
    # Binary features are structural, not continuous — they must not drift.
    for column in (4, 5):  # aadhaar_seeded, documents_complete
        assert np.all(decoys[:, column] == record[column])
    # Continuous features move, but only slightly.
    relative = np.abs(decoys[:, 0] - record[0]) / max(record[0], 1.0)
    assert relative.max() < 0.30


def test_decoy_scores_are_reported_alongside_the_record(demo_target):
    target, dataset = demo_target
    engine = MembershipAuditEngine()
    canary = dataset.x_train[dataset.canary_indices[:1]]
    label = dataset.y_train[dataset.canary_indices[:1]]

    report = engine.audit(
        target, canary, label, ["canary-0"], target_id="demo", with_decoys=True, n_decoys=16
    )
    finding = report.findings[0]
    assert finding.decoy_mean_score is not None
    assert finding.decoy_separation is not None
    # Decoy probing costs queries, which M5 must be able to meter.
    # First use also profiles the target against 500 synthetic non-members.
    assert report.queries_used == 1 + 16 + 500


def test_calibration_queries_are_counted_once_per_engine(demo_target):
    target, dataset = demo_target
    engine = MembershipAuditEngine()
    record = dataset.x_train[dataset.canary_indices[:1]]
    label = dataset.y_train[dataset.canary_indices[:1]]

    first = engine.audit(target, record, label, ["first"], with_decoys=False)
    second = engine.audit(target, record, label, ["second"], with_decoys=False)

    assert first.queries_used == 1 + 500
    assert second.queries_used == 1


# -- calibration -------------------------------------------------------------


def test_calibration_centres_heldout_records_near_zero(scored):
    """A correctly calibrated null puts non-members at z ~= 0.

    This is the property that makes the score interpretable: without it the
    z-scores measure "is the target more overfit than my shadows" (true of every
    member) rather than "is this record unusual for this target".
    """
    assert abs(_z(scored["heldout"]).mean()) < 1.0


def test_calibration_is_computed_once_per_target(demo_target):
    target, _ = demo_target
    engine = MembershipAuditEngine()
    first = engine.calibrate(target)
    assert engine.calibrate(target) is first


def test_uncalibrated_scoring_is_not_reachable_by_accident():
    """``score_records`` requires a calibration; it has no default."""
    import inspect

    from sentinel.engines.membership.lira import score_records

    parameter = inspect.signature(score_records).parameters["calibration"]
    assert parameter.default is inspect.Parameter.empty


def test_logit_scale_is_finite_at_the_boundaries():
    """Confidence of exactly 0 or 1 must not produce infinities."""
    assert np.all(np.isfinite(logit_scale(np.array([0.0, 1.0, 0.5]))))


def test_calibration_survives_a_degenerate_reference():
    """Zero-variance reference gaps must not yield an infinite z."""
    calibration = GlobalCalibration.from_reference(
        np.full(20, 0.9), np.full((4, 20), 0.9)
    )
    assert calibration.gap_std > 0.0
