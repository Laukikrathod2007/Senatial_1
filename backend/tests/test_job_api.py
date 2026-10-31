"""Route-level job contract tests; TCP behavior is covered by the manual smoke script."""

from __future__ import annotations

import pytest
from fastapi import BackgroundTasks, HTTPException

from sentinel.api.routes import audits
from sentinel.gateway.auth import AuditorIdentity
from sentinel.gateway.roles import Role
from sentinel.ledger.models import create_session_factory


def _database(tmp_path, monkeypatch):
    from sentinel.config import get_settings

    settings = get_settings()
    state = tmp_path / "var-demo"
    state.mkdir()
    monkeypatch.setattr(settings, "var_dir", state)
    monkeypatch.setattr(settings, "database_url", f"sqlite:///{(state / 'sentinel.db').as_posix()}")
    return settings, create_session_factory(settings.database_url)


def test_fairness_job_lifecycle_owner_poll_and_seal(tmp_path, monkeypatch):
    from sentinel.ledger.service import verify_report

    _, factory = _database(tmp_path, monkeypatch)
    owner = AuditorIdentity("job-owner", Role.JOURNALIST, "unit-token")
    tasks = BackgroundTasks()
    with factory() as session:
        queued = audits.queue_fairness_job(audits.FairnessRequest(per_cohort=50), tasks, owner, session)
        assert queued["status"] == "queued"
        assert queued["total_probes"] == 1100
        assert len(tasks.tasks) == 1
        task = tasks.tasks[0]
        task.func(*task.args, **task.kwargs)

    with factory() as session:
        job = audits.poll_audit_job(queued["job_id"], owner, session)
        assert job["status"] == "completed"
        assert job["completed_probes"] == job["attempted_probes"] == 1100
        assert job["failed_probes"] == job["unattempted_probes"] == 0
        assert job["result"]["report"]["job_id"] == queued["job_id"]
        assert verify_report(session, job["result"]["sealed"]["sequence"])[0] is True
        with pytest.raises(HTTPException) as wrong_owner:
            audits.poll_audit_job(queued["job_id"], AuditorIdentity("other", Role.JOURNALIST, "t"), session)
        assert wrong_owner.value.status_code == 404
        with pytest.raises(HTTPException) as missing:
            audits.poll_audit_job("not-a-real-id", owner, session)
        assert missing.value.status_code == 404

    route = next(r for r in audits.router.routes if getattr(r, "endpoint", None) is audits.queue_fairness_job)
    assert route.status_code == 202


def test_http_gate_quota_and_validation_before_job_creation(tmp_path, monkeypatch):
    settings, factory = _database(tmp_path, monkeypatch)
    monkeypatch.setattr(settings, "enable_http_demo_target", False)
    citizen = AuditorIdentity("low-quota", Role.CITIZEN, "unit-token")
    tasks = BackgroundTasks()
    with factory() as session:
        with pytest.raises(HTTPException) as disabled:
            audits.queue_http_fairness_job(audits.FairnessRequest(per_cohort=50), tasks, citizen, session)
        assert disabled.value.status_code == 404
        with pytest.raises(HTTPException) as over_quota:
            audits.queue_fairness_job(audits.FairnessRequest(per_cohort=50), tasks, citizen, session)
        assert over_quota.value.status_code == 429
        with pytest.raises(ValueError):
            audits.FairnessRequest(per_cohort=1)
        assert tasks.tasks == []
