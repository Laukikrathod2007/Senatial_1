"""Red-Team validation (PRD 6): show >=1 edge-case cluster with a measurably
higher rejection rate than baseline."""

from __future__ import annotations

import json

import numpy as np
import pytest

from sentinel.data.welfare import FEATURE_NAMES, generate_welfare_dataset
from sentinel.engines.redteam import RedTeamEngine, category, generate_cohort

pytestmark = pytest.mark.slow


@pytest.fixture(scope="module")
def baseline() -> np.ndarray:
    return generate_welfare_dataset(
        n_train=10, n_test=800, n_canaries=0, seed=771001
    ).x_test


@pytest.fixture(scope="module")
def report(demo_target, baseline):
    target, _ = demo_target
    return RedTeamEngine().audit(target, baseline, target_id="demo", per_cohort=500)


def test_detects_at_least_one_disadvantaged_cohort(report):
    """PRD 6's success metric for this module."""
    assert any(c.is_significant for c in report.cohorts)
    assert report.headline() is not None


def test_does_not_flag_every_cohort(report):
    """A test that flags everything distinguishes nothing.

    address_mismatch perturbs a feature the eligibility rule ignores, so it
    should come out clean -- evidence the disparity finding is specific.
    """
    unflagged = [c for c in report.cohorts if not c.is_significant]
    assert unflagged, "expected at least one cohort with no meaningful disparity"


def test_cohorts_are_matched_to_the_baseline(baseline):
    """Cohorts must differ from the baseline only in the mutated feature.

    Otherwise a rejection gap could be explained by the cohorts being different
    kinds of applicants, not by the edge case.
    """
    case = category("seeding_failure")
    cohort = generate_cohort(baseline, case, 200, seed=1)

    seeded = FEATURE_NAMES.index("aadhaar_seeded")
    assert np.all(cohort[:, seeded] == 0.0)

    # Untouched features keep the baseline's distribution.
    age = FEATURE_NAMES.index("age")
    assert abs(cohort[:, age].mean() - baseline[:, age].mean()) < 3.0


def test_disparity_is_reported_with_uncertainty(report):
    for cohort in report.cohorts:
        interval = cohort.rejection_rate
        assert 0.0 <= interval.ci_low <= interval.rate <= interval.ci_high <= 1.0


def test_practically_trivial_gaps_are_not_flagged():
    """Statistical significance alone is not enough to report to a citizen."""
    from sentinel.engines.redteam.engine import CohortResult
    from sentinel.reporting.intervals import wilson_interval

    trivial = CohortResult(
        category="x",
        description="d",
        citizen_description="c",
        n=100_000,
        rejection_rate=wilson_interval(40_100, 100_000),
        baseline_rate=0.40,
        disparity=0.001,
        p_value=1e-9,  # significant, but a 0.1-point gap
    )
    assert not trivial.is_significant


def test_report_discloses_that_the_bias_was_planted(report):
    """Framing this as discovery rather than recovery would be dishonest."""
    disclosure = report.to_dict()["disclosure"]
    assert "by construction" in disclosure
    assert "not the discovery" in disclosure


def test_report_is_json_serializable_for_the_ledger(report):
    json.dumps(report.to_dict(), allow_nan=False)


def test_reported_rates_match_independent_predictions(demo_target, baseline, report):
    """Recompute every reported rate from generated rows and target outputs."""
    from sentinel.engines.redteam import TAXONOMY

    target, _ = demo_target
    expected_baseline = float((target.predict_proba(baseline)[:, 1] < 0.5).mean())
    assert report.baseline_rate == pytest.approx(expected_baseline)

    by_name = {cohort.category: cohort for cohort in report.cohorts}
    for offset, case in enumerate(TAXONOMY):
        profiles = generate_cohort(baseline, case, 500, seed=offset)
        expected = float((target.predict_proba(profiles)[:, 1] < 0.5).mean())
        assert by_name[case.name].rejection_rate.rate == pytest.approx(expected)
