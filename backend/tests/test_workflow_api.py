"""Judge-facing fairness audit -> sealed report -> verification workflow."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

pytestmark = pytest.mark.slow


def test_fairness_report_is_sealed_and_tampering_is_detected(tmp_path, monkeypatch):
    from sentinel.api.routes.audits import FairnessRequest, audit_fairness
    from sentinel.api.routes.verify import (
        TamperRequest,
        require_demo_controls,
        tamper_report,
        verify_whole_chain,
        verify_single_report,
    )
    from sentinel.config import get_settings
    from sentinel.gateway.auth import AuditorIdentity
    from sentinel.gateway.roles import Role
    from sentinel.ledger.models import create_session_factory
    from sentinel.ledger.service import verify_chain

    settings = get_settings()
    demo_dir = tmp_path / "var-demo"
    demo_dir.mkdir()
    monkeypatch.setattr(settings, "var_dir", demo_dir)
    monkeypatch.setattr(settings, "database_url", f"sqlite:///{(demo_dir / 'sentinel.db').as_posix()}")
    monkeypatch.setattr(settings, "enable_demo_auth", False)
    monkeypatch.setattr(settings, "enable_demo_controls", False)
    session = create_session_factory(settings.database_url)()
    identity = AuditorIdentity("local-demo", Role.JOURNALIST, "test-token")

    result = audit_fairness(FairnessRequest(), identity, session)
    report = result["report"]
    seal = result["sealed"]

    assert report["audit_type"] == "fairness_red_team"
    assert report["target_id"] == "welfare-eligibility-demo"
    assert report["baseline_profiles"] == 800
    assert report["queries_used"] == 800 + sum(
        cohort["profiles_tested"] for cohort in report["cohorts"]
    )
    assert all(cohort["profiles_tested"] == 200 for cohort in report["cohorts"])
    assert all(
        cohort["rejection_rate_ci"][0]
        <= cohort["rejection_rate"]
        <= cohort["rejection_rate_ci"][1]
        for cohort in report["cohorts"]
    )

    from sentinel.ledger.models import AuditReportRow
    from sqlalchemy import select

    stored = session.execute(
        select(AuditReportRow).where(AuditReportRow.sequence == seal["sequence"])
    ).scalar_one()
    import json

    assert json.loads(stored.payload_json)["body"] == report
    assert stored.report_hash == seal["report_hash"]
    assert verify_whole_chain(session)["valid"] is True
    assert verify_single_report(seal["sequence"], session)["valid"] is True

    # Mutation is denied by default and the unchanged report still verifies.
    with pytest.raises(HTTPException) as denied:
        require_demo_controls()
    assert denied.value.status_code == 404
    assert verify_chain(session).valid is True

    # Explicit demo mode only mutates the test's disposable SQLite ledger.
    monkeypatch.setattr(settings, "enable_demo_auth", True)
    monkeypatch.setattr(settings, "enable_demo_controls", True)
    assert require_demo_controls() is None
    assert tamper_report(TamperRequest(sequence=seal["sequence"]), session)["success"]
    broken = verify_whole_chain(session)
    assert broken["valid"] is False
    assert broken["broken_at_sequence"] == seal["sequence"]
    session.close()
