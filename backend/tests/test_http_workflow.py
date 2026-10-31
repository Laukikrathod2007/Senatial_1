"""Service schema and signed end-to-end HTTP-target workflow checks."""

from __future__ import annotations

import json
import httpx
import pytest
from sqlalchemy import select

from sentinel.data.welfare import FEATURE_NAMES
from sentinel.engines.redteam import TAXONOMY
from sentinel.ledger.models import AuditReportRow, create_session_factory
from sentinel.ledger.service import verify_chain, verify_report
from sentinel.target.http import HTTPDecisionTarget


def _request_features():
    return {name: 1.0 for name in FEATURE_NAMES}


def test_mock_decision_service_validates_schema_and_returns_model_output(monkeypatch):
    from sentinel.mock_target import DecisionRequest, decide, health
    from sentinel.target.system import Decision
    from pydantic import ValidationError

    class FakeTarget:
        def decide(self, record):
            assert record.shape == (1, len(FEATURE_NAMES))
            return Decision(True, 0.83, "documents_complete", "Synthetic reason")

    monkeypatch.setattr("sentinel.mock_target.load_demo_target", lambda: (FakeTarget(), None))
    monkeypatch.setattr("sentinel.mock_target._target", None)
    assert health()["status"] == "ok"
    assert decide(DecisionRequest(features=_request_features())).model_dump() == {
        "model_id": "welfare-eligibility-demo",
        "model_version": "synthetic-welfare-v1",
        "decision": "eligible",
        "probability_eligible": pytest.approx(0.83),
        "reason": "Synthetic reason",
    }
    with pytest.raises(ValidationError):
        DecisionRequest(features={"monthly_income": 1})
    with pytest.raises(ValidationError):
        DecisionRequest(features={**_request_features(), "secret": 1})


def test_http_target_route_is_disabled_by_default(monkeypatch):
    from fastapi import HTTPException
    from sentinel.api.routes.audits import FairnessRequest, audit_http_fairness
    from sentinel.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "enable_http_demo_target", False)
    monkeypatch.setattr(
        "sentinel.api.routes.audits.load_http_demo_target",
        lambda: pytest.fail("disabled target must not be constructed"),
    )
    with pytest.raises(HTTPException) as denied:
        audit_http_fairness(FairnessRequest(), identity=None, session=None)
    assert denied.value.status_code == 404


def test_http_fairness_route_seals_report_and_verifies_then_detects_tamper(
    tmp_path, monkeypatch
):
    from sentinel.api.routes.audits import FairnessRequest, audit_http_fairness
    from sentinel.api.routes.verify import TamperRequest, require_demo_controls, tamper_report
    from sentinel.config import get_settings
    from sentinel.gateway.auth import AuditorIdentity
    from sentinel.gateway.roles import Role

    def decide(payload):
        seeded = payload["features"]["aadhaar_seeded"] >= 0.5
        score = 0.8 if seeded else 0.2
        return httpx.Response(200, json={
            "model_id": "welfare-eligibility-demo",
            "model_version": "integration-v1",
            "decision": "eligible" if seeded else "ineligible",
            "probability_eligible": score,
            "reason": "Synthetic local service response",
        })

    settings = get_settings()
    state_dir = tmp_path / "var-demo"
    state_dir.mkdir()
    monkeypatch.setattr(settings, "var_dir", state_dir)
    monkeypatch.setattr(settings, "database_url", f"sqlite:///{(state_dir / 'sentinel.db').as_posix()}")
    monkeypatch.setattr(settings, "enable_http_demo_target", True)
    monkeypatch.setattr(settings, "enable_demo_auth", True)
    monkeypatch.setattr(settings, "enable_demo_controls", True)
    class ServiceTransport(httpx.BaseTransport):
        def handle_request(self, request):
            return decide(json.loads(request.content))

    monkeypatch.setattr(
        "sentinel.api.routes.audits.load_http_demo_target",
        lambda: HTTPDecisionTarget(
            "http://127.0.0.1:8010", concurrency=16,
            transport=ServiceTransport(),
        ),
    )
    session = create_session_factory(settings.database_url)()
    identity = AuditorIdentity("local-auditor", Role.JOURNALIST, "test-token")

    result = audit_http_fairness(FairnessRequest(per_cohort=50), identity, session)
    report = result["report"]
    seal = result["sealed"]

    assert report["audit_type"] == "fairness_red_team"
    assert report["target_id"] == "welfare-eligibility-http-demo"
    assert report["target"]["type"] == "controlled_local_http"
    assert report["target"]["model_id"] == "welfare-eligibility-demo"
    assert report["target"]["model_version"] == "integration-v1"
    assert report["queries_used"] == 800 + 50 * len(TAXONOMY)
    assert report["baseline_profiles_completed"] == 800
    assert all(c["profiles_tested"] == 50 for c in report["cohorts"])
    assert all(c["profiles_failed"] == 0 for c in report["cohorts"])
    stored = session.execute(
        select(AuditReportRow).where(AuditReportRow.sequence == seal["sequence"])
    ).scalar_one()
    assert json.loads(stored.payload_json)["body"] == report
    assert stored.report_hash == seal["report_hash"]
    assert verify_chain(session).valid
    assert verify_report(session, seal["sequence"])[0]

    assert require_demo_controls() is None
    assert tamper_report(TamperRequest(sequence=seal["sequence"]), session)["success"]
    assert verify_report(session, seal["sequence"])[0] is False
    session.close()
