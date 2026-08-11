"""End-to-end: the path the live demo takes, start to finish.

Guards the demo itself. Every one of these steps happens on stage, so a
regression here is a regression in the thing being presented.
"""

from __future__ import annotations

import json
import sqlite3

import numpy as np
import pytest

from sentinel.data.welfare import generate_welfare_dataset
from sentinel.engines.explainability import ExplainabilityAuditEngine
from sentinel.engines.membership import MembershipAuditEngine
from sentinel.ledger.service import seal_report, verify_chain
from sentinel.privacy.guardian import BudgetGuardian
from sentinel.reporting.plain import plain_language_explain, plain_language_membership

pytestmark = pytest.mark.slow

_TARGET = "welfare-eligibility-demo"


def test_full_audit_seal_and_verify_cycle(demo_target, ledger_session):
    """Audit -> seal -> verify, the way the demo runs it."""
    target, dataset = demo_target
    session = ledger_session

    # M5 preflight, before any probe.
    guardian = BudgetGuardian(session)
    decision = guardian.preflight(_TARGET, planned_queries=2100, max_epsilon=8.0)
    assert decision.allowed

    # M1 against a planted record.
    membership = MembershipAuditEngine()
    index = dataset.canary_indices[7]
    m1 = membership.audit(
        target,
        dataset.x_train[[index]],
        dataset.y_train[[index]],
        ["planted-record-7"],
        target_id=_TARGET,
        with_decoys=True,
    )
    assert m1.findings[0].score.z_score > 3.0

    # M2 across a population of rejections.
    reference = generate_welfare_dataset(
        n_train=10, n_test=1500, n_canaries=0, seed=555001
    ).x_test
    m2 = ExplainabilityAuditEngine().audit(
        target, dataset.x_test[:1500], reference, target_id=_TARGET
    )
    assert m2.headline() is not None

    # M3 sealing, both reports chained.
    first = seal_report(
        session,
        {**m1.to_dict(), "plain_language": plain_language_membership(m1.findings[0])},
        audit_type="membership_inference",
        target_id=_TARGET,
    )
    second = seal_report(
        session,
        {**m2.to_dict(), "plain_language": plain_language_explain(m2)},
        audit_type="explainability_consistency",
        target_id=_TARGET,
    )
    assert second.previous_hash == first.report_hash

    # M5 spend recorded.
    guardian.record_spend(_TARGET, m1.queries_used + m2.queries_used)
    assert guardian.spent(_TARGET) > 0

    # M3 verification passes.
    result = verify_chain(session)
    assert result.valid
    assert result.checked == 2
    assert result.merkle_root


def test_tampering_with_a_sealed_finding_is_caught(demo_target, ledger_session):
    """The demo's closing beat: bury a finding, get caught."""
    target, dataset = demo_target
    session = ledger_session

    engine = MembershipAuditEngine()
    index = dataset.canary_indices[3]
    report = engine.audit(
        target,
        dataset.x_train[[index]],
        dataset.y_train[[index]],
        ["planted-record-3"],
        target_id=_TARGET,
    )
    seal_report(
        session,
        {**report.to_dict(), "plain_language": plain_language_membership(report.findings[0])},
        audit_type="membership_inference",
        target_id=_TARGET,
    )
    assert verify_chain(session).valid

    database = session.get_bind().url.database
    session.close()

    # An operator with full database access rewrites the finding.
    connection = sqlite3.connect(database)
    row = connection.execute(
        "SELECT payload_json FROM audit_reports WHERE sequence = 0"
    ).fetchone()
    payload = json.loads(row[0])
    payload["body"]["plain_language"]["what_we_found"] = "No problems were found."
    connection.execute(
        "UPDATE audit_reports SET payload_json = ? WHERE sequence = 0",
        (json.dumps(payload, sort_keys=True, separators=(",", ":")),),
    )
    connection.commit()
    connection.close()

    from sentinel.ledger.models import create_session_factory

    reopened = create_session_factory(f"sqlite:///{database}")()
    result = verify_chain(reopened)
    assert not result.valid
    assert result.broken_sequence == 0
    reopened.close()


def test_reports_survive_the_json_round_trip_they_are_sealed_through(demo_target):
    """Findings must serialize losslessly; the signature covers these bytes."""
    target, dataset = demo_target
    engine = MembershipAuditEngine()
    report = engine.audit(
        target,
        dataset.x_train[dataset.canary_indices[:3]],
        dataset.y_train[dataset.canary_indices[:3]],
        [f"r{i}" for i in range(3)],
        target_id=_TARGET,
    )
    encoded = json.dumps(report.to_dict(), allow_nan=False)
    assert json.loads(encoded)["findings"][0]["record_id"] == "r0"


def test_demo_numbers_match_what_is_presented(demo_target):
    """Regression guard on the figures quoted on stage."""
    target, dataset = demo_target

    train_accuracy = (target.predict(dataset.x_train) == dataset.y_train).mean()
    test_accuracy = (target.predict(dataset.x_test) == dataset.y_test).mean()

    assert train_accuracy == 1.0
    assert 0.68 < test_accuracy < 0.75
    assert 0.53 < dataset.y_train.mean() < 0.62
    assert len(dataset.canary_indices) == 25
