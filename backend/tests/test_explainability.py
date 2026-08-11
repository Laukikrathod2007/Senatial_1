"""M2 validation (docs §7.2): the stand-in system's explanation generator is
deliberately decoupled from its classifier; confirm M2 detects the mismatch."""

from __future__ import annotations

import json

import numpy as np
import pytest

from sentinel.data.welfare import FEATURE_NAMES, generate_welfare_dataset
from sentinel.engines.explainability import (
    ExplainabilityAuditEngine,
    counterfactual,
    derive_domains,
)

_REFERENCE_SEED = 555001


@pytest.fixture(scope="module")
def reference_sample() -> np.ndarray:
    """The auditor's own applicant sample.

    Generated independently of the target's training data — an auditor has no
    access to that, so deriving domains from it would break the black-box premise.
    """
    return generate_welfare_dataset(
        n_train=10, n_test=1500, n_canaries=0, seed=_REFERENCE_SEED
    ).x_test


@pytest.fixture(scope="module")
def domains(reference_sample):
    return derive_domains(reference_sample, list(FEATURE_NAMES))


@pytest.fixture(scope="module")
def report(demo_target, reference_sample):
    target, dataset = demo_target
    engine = ExplainabilityAuditEngine()
    return engine.audit(
        target, dataset.x_test[:1500], reference_sample, target_id="demo"
    )


# -- the core claim ----------------------------------------------------------


def test_detects_at_least_one_inconsistent_feature(report):
    """PRD §6: show ≥1 case where perturbing the stated feature doesn't flip."""
    significant = [f for f in report.features if f.mismatch.is_significant]
    assert significant, "expected at least one feature with a real mismatch rate"


def test_income_reliability_matches_the_known_target_behaviour(report):
    """Regression guard on the stand-in model.

    monthly_income is the reason given for most rejections, and its measured
    reliability is ~0.906. A large move here means the target model or the
    eligibility rule changed and the demo numbers need re-checking.
    """
    income = next(f for f in report.features if f.feature == "monthly_income")
    assert income.n_cases > 300
    assert 0.80 < income.reliability < 0.95


def test_report_produces_a_citizen_legible_headline(report):
    headline = report.headline()
    assert headline is not None
    assert "1 in" in headline
    # Prefers the large-n finding over the dramatic small-n one.
    assert "monthly income" in headline


def test_audit_scope_is_limited_to_rejections(report):
    """Approvals carry one canned reason, so including them would inflate the
    denominator with untestable cases."""
    assert report.to_dict()["scope"] == "rejected applications only"
    assert report.total_cases > 0


# -- trap #4: perturbations must stay realistic ------------------------------


def test_every_counterfactual_stays_within_the_plausible_range(
    demo_target, reference_sample, domains
):
    """The trap #4 regression test.

    An out-of-domain probe (income set to zero, age set to 5) would make any
    "inconsistency" an artifact of an impossible applicant rather than a real
    defect in the system's explanation.

    The constraint applies to the value M2 *introduces*. Untouched features are
    copied from a real applicant and may legitimately sit outside the reference
    sample's 5th-95th percentile band — a person really can have lived at one
    address for 32 years. Forcing those into range would fabricate a different
    applicant and defeat the isolation the test depends on.
    """
    target, dataset = demo_target
    applicants = dataset.x_test[:400]
    rejected = applicants[target.predict_proba(applicants)[:, 1] < 0.5]

    for record in rejected:
        feature = target.stated_reason_for(record)
        probe = counterfactual(record, feature, list(FEATURE_NAMES), domains)
        index = FEATURE_NAMES.index(feature)

        assert domains[feature].contains(probe[index]), (
            f"introduced {feature}={probe[index]} is outside its plausible "
            f"range [{domains[feature].p5}, {domains[feature].p95}]"
        )
        # Everything else must be untouched, hence trivially as plausible as
        # the real applicant it came from.
        untouched = [i for i in range(len(record)) if i != index]
        assert np.array_equal(probe[untouched], record[untouched])


def test_counterfactual_changes_only_the_named_feature(domains):
    record = np.array([25000.0, 4, 1.0, 8.0, 1.0, 1.0, 2.0, 40.0])
    probe = counterfactual(record, "monthly_income", list(FEATURE_NAMES), domains)

    changed = [i for i in range(len(record)) if record[i] != probe[i]]
    assert changed == [FEATURE_NAMES.index("monthly_income")]


def test_favorable_direction_is_domain_correct(domains):
    """Favorability is domain knowledge: for a means test, lower income helps."""
    assert domains["monthly_income"].favorable_value < domains["monthly_income"].p95
    assert domains["documents_complete"].favorable_value == 1.0
    assert domains["aadhaar_seeded"].favorable_value == 1.0


def test_binary_features_are_never_given_fractional_values(domains):
    for name in ("aadhaar_seeded", "documents_complete"):
        assert domains[name].clamp(0.5) in (0.0, 1.0)


def test_count_features_stay_integral(domains):
    value = domains["household_size"].clamp(4.7)
    assert value == round(value)


# -- reporting ---------------------------------------------------------------


def test_small_sample_features_get_wide_wilson_intervals(report):
    """prior_scheme_count has n=9; its interval must reflect that.

    A normal-approximation interval at this n would be misleadingly narrow and
    could run outside [0,1].
    """
    small = [f for f in report.features if f.n_cases < 15]
    for feature in small:
        assert 0.0 <= feature.mismatch.ci_low <= feature.mismatch.ci_high <= 1.0
        assert feature.mismatch.ci_high - feature.mismatch.ci_low > 0.25


def test_report_is_json_serializable_for_the_ledger(report):
    """Reports get sealed into signed payloads, which cannot encode numpy types."""
    encoded = json.dumps(report.to_dict(), allow_nan=False)
    assert "NaN" not in encoded


def test_report_is_ascii_safe_for_console_and_filings(report):
    """Smart quotes mojibake on cp1252 consoles and in printed filings."""
    report.to_dict()["headline"].encode("ascii")


def test_batched_audit_is_fast_enough_to_run_live(demo_target, reference_sample):
    """A per-record decide() loop took minutes; batching must keep it seconds."""
    import time

    target, dataset = demo_target
    engine = ExplainabilityAuditEngine()
    start = time.perf_counter()
    engine.audit(target, dataset.x_test[:1500], reference_sample, target_id="demo")
    assert time.perf_counter() - start < 10.0
