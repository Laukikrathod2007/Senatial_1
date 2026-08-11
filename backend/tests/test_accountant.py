"""M5 validation: RDP composition, budget enforcement, and DP release."""

from __future__ import annotations

import numpy as np
import pytest

from sentinel.privacy.accountant import RDPAccountant, naive_linear_epsilon
from sentinel.privacy.guardian import BudgetGuardian
from sentinel.privacy.mechanisms import privatize_rate

_SIGMA = 40.0


@pytest.fixture
def guardian(ledger_session) -> BudgetGuardian:
    return BudgetGuardian(ledger_session, noise_multiplier=_SIGMA)


# -- trap #2: proper composition, not linear summation -----------------------


def test_composition_is_sublinear():
    """The single assertion that proves trap #2 was handled.

    If ε were summed linearly per query, this would be an equality. RDP composes
    additively in α-space and converts once at the end, so k queries cost
    materially less than k times one query.
    """
    single = RDPAccountant()
    single.compose_gaussian(_SIGMA, 1)

    hundred = RDPAccountant()
    hundred.compose_gaussian(_SIGMA, 100)

    assert hundred.epsilon() < 100 * single.epsilon()


def test_composition_saving_is_substantial_at_audit_scale():
    """At the query counts a real audit uses, the saving is large.

    Not cosmetic: a naive accountant would deny audits that are within budget.
    """
    accountant = RDPAccountant()
    accountant.compose_gaussian(_SIGMA, 2000)
    naive = naive_linear_epsilon(_SIGMA, 2000)
    assert naive / accountant.epsilon() > 10


def test_epsilon_increases_monotonically_with_queries():
    previous = 0.0
    for queries in (1, 10, 100, 1000, 10000):
        accountant = RDPAccountant()
        accountant.compose_gaussian(_SIGMA, queries)
        epsilon = accountant.epsilon()
        assert epsilon > previous
        previous = epsilon


def test_more_noise_costs_less_privacy():
    epsilons = []
    for sigma in (10.0, 20.0, 40.0, 80.0):
        accountant = RDPAccountant()
        accountant.compose_gaussian(sigma, 500)
        epsilons.append(accountant.epsilon())
    assert epsilons == sorted(epsilons, reverse=True)


def test_composition_is_additive_in_alpha_space():
    """Two batches must cost exactly what one combined batch costs."""
    split = RDPAccountant()
    split.compose_gaussian(_SIGMA, 30)
    split.compose_gaussian(_SIGMA, 70)

    combined = RDPAccountant()
    combined.compose_gaussian(_SIGMA, 100)

    assert split.epsilon() == pytest.approx(combined.epsilon())


def test_projection_does_not_mutate_the_accountant():
    """Preflight must be able to price a plan without spending the budget."""
    accountant = RDPAccountant()
    accountant.compose_gaussian(_SIGMA, 100)
    before = accountant.epsilon()

    accountant.projected(_SIGMA, 5000)

    assert accountant.epsilon() == before


def test_rejects_invalid_parameters():
    accountant = RDPAccountant()
    with pytest.raises(ValueError):
        accountant.compose_gaussian(0.0, 1)
    with pytest.raises(ValueError):
        accountant.epsilon(delta=0.0)
    with pytest.raises(ValueError):
        accountant.epsilon(delta=1.0)


# -- budget enforcement ------------------------------------------------------


def test_audit_within_budget_is_allowed(guardian):
    decision = guardian.preflight("demo", planned_queries=200, max_epsilon=2.0)
    assert decision.allowed
    assert decision.projected_epsilon <= 2.0


def test_audit_over_budget_is_refused(guardian):
    """Docs §7.2: a query beyond the allotted budget is correctly rejected."""
    decision = guardian.preflight("demo", planned_queries=50_000, max_epsilon=2.0)
    assert not decision.allowed
    assert decision.projected_epsilon > 2.0
    assert "refused" in decision.reason


def test_budget_accumulates_across_audits(guardian):
    guardian.record_spend("demo", 1000)
    first = guardian.spent("demo")
    guardian.record_spend("demo", 1000)
    assert guardian.spent("demo") > first


def test_budget_persists_across_guardian_instances(ledger_session):
    """A budget that reset on restart could be cleared by crashing the service."""
    BudgetGuardian(ledger_session, noise_multiplier=_SIGMA).record_spend("demo", 5000)
    reloaded = BudgetGuardian(ledger_session, noise_multiplier=_SIGMA)
    assert reloaded.spent("demo") > 0


def test_exhausted_budget_blocks_further_probing(guardian):
    guardian.record_spend("demo", 40_000)
    decision = guardian.preflight("demo", planned_queries=1000, max_epsilon=2.0)
    assert not decision.allowed


def test_status_reports_the_naive_comparison(guardian):
    guardian.record_spend("demo", 2000)
    status = guardian.status("demo", max_epsilon=8.0)
    assert status["naive_linear_epsilon"] > status["epsilon_spent"]
    assert status["queries_spent"] == 2000


# -- DP release --------------------------------------------------------------


def test_noise_preserves_an_aggregate_finding(guardian):
    """PRD §6: the noise-adjusted report must preserve the finding.

    At n=436 the Laplace scale on a rate is 1/436/ε ~ 0.0023, negligible against
    a measured 0.094 mismatch. Checked over many draws rather than one, so this
    asserts a property rather than a lucky seed.
    """
    report = {
        "cases_tested": 570,
        "overall_mismatch_rate": 0.107,
        "per_feature": [
            {"feature": "monthly_income", "cases_tested": 436, "mismatch_rate": 0.094}
        ],
    }
    for seed in range(50):
        private = guardian.privatize_explainability(report, epsilon=1.0, seed=seed)
        income = private["per_feature"][0]["mismatch_rate"]
        assert 0.05 < income < 0.15


def test_privatized_rates_stay_in_range():
    rng = np.random.default_rng(0)
    for _ in range(200):
        assert 0.0 <= privatize_rate(0.02, 30, 0.5, rng) <= 1.0


def test_privatized_report_documents_what_was_not_noised(guardian):
    report = {"cases_tested": 100, "overall_mismatch_rate": 0.1, "per_feature": []}
    private = guardian.privatize_explainability(report)
    assert "aggregate statistics only" in private["privacy"]["mechanism"]
    assert "Per-record scores are not noised" in private["privacy"]["note"]
