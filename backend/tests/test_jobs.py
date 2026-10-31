"""Persistent audit job lifecycle, ownership and restart behaviour."""

from __future__ import annotations

import pytest
from sqlalchemy import select

from sentinel.gateway.jobs import (
    COMPLETED,
    FAILED,
    INTERRUPTED_MESSAGE,
    QUEUED,
    RUNNING,
    AuditJobRow,
    add_progress,
    get_owned_job,
    job_payload,
    make_job,
    recover_interrupted_jobs,
    transition_job,
)
from sentinel.ledger.models import create_session_factory


def _session(tmp_path):
    url = f"sqlite:///{(tmp_path / 'jobs.db').as_posix()}"
    return url, create_session_factory(url)()


def test_job_creation_persists_queued_state_and_scopes_ownership(tmp_path):
    _, session = _session(tmp_path)
    job = make_job(
        session,
        owner_subject="auditor-1",
        audit_type="fairness_red_team_http",
        target_id="welfare-eligibility-http-demo",
        total_probes=1100,
    )
    session.expunge_all()
    saved = session.get(AuditJobRow, job.job_id)

    assert saved is not None
    assert saved.status == QUEUED
    assert saved.progress_pct == 0
    assert saved.total_probes == 1100
    assert get_owned_job(session, saved.job_id, "auditor-1") is not None
    assert get_owned_job(session, saved.job_id, "auditor-2") is None
    assert job_payload(saved)["unattempted_probes"] == 1100
    session.close()


def test_job_progress_counts_success_failure_and_unattempted_separately(tmp_path):
    _, session = _session(tmp_path)
    job = make_job(
        session,
        owner_subject="auditor",
        audit_type="fairness_red_team",
        target_id="welfare-eligibility-demo",
        total_probes=100,
    )
    transition_job(job, RUNNING)
    session.commit()

    updated = add_progress(session, job.job_id, attempted=30, completed=24, failed=6)
    payload = job_payload(updated)
    assert payload["progress_pct"] == 30
    assert payload["completed_probes"] == 24
    assert payload["attempted_probes"] == 30
    assert payload["failed_probes"] == 6
    assert payload["unattempted_probes"] == 70

    with pytest.raises(ValueError, match="inconsistent"):
        add_progress(session, job.job_id, attempted=5, completed=4, failed=0)
    with pytest.raises(ValueError, match="planned total"):
        add_progress(session, job.job_id, attempted=71, completed=71, failed=0)
    session.close()


def test_job_terminal_result_requires_sealed_result_and_transitions_are_one_way(tmp_path):
    _, session = _session(tmp_path)
    job = make_job(
        session,
        owner_subject="auditor",
        audit_type="fairness_red_team",
        target_id="welfare-eligibility-demo",
        total_probes=10,
    )
    with pytest.raises(ValueError, match="Invalid audit job transition"):
        transition_job(job, COMPLETED)
    transition_job(job, RUNNING)
    session.commit()
    with pytest.raises(ValueError, match="sealed result"):
        transition_job(job, COMPLETED)
    add_progress(session, job.job_id, attempted=10, completed=9, failed=1)
    job = session.get(AuditJobRow, job.job_id)
    result = {"report": {"target_id": job.target_id}, "sealed": {"report_hash": "abc"}}
    transition_job(job, COMPLETED, result=result)
    session.commit()
    payload = job_payload(job)
    assert payload["status"] == COMPLETED
    assert payload["result"] == result
    assert payload["progress_pct"] == 100
    with pytest.raises(ValueError, match="Invalid audit job transition"):
        transition_job(job, FAILED, error_message="safe")
    session.close()


def test_failed_job_has_sanitized_diagnostic_and_restart_fails_stale_jobs(tmp_path):
    url, session = _session(tmp_path)
    queued = make_job(
        session,
        owner_subject="auditor",
        audit_type="fairness_red_team",
        target_id="welfare-eligibility-demo",
        total_probes=10,
    )
    running = make_job(
        session,
        owner_subject="auditor",
        audit_type="fairness_red_team_http",
        target_id="welfare-eligibility-http-demo",
        total_probes=10,
    )
    transition_job(running, RUNNING)
    session.commit()
    session.close()

    assert recover_interrupted_jobs(url) == 2
    check = create_session_factory(url)()
    rows = list(check.execute(select(AuditJobRow)).scalars())
    assert {row.status for row in rows} == {FAILED}
    assert all(row.error_message == INTERRUPTED_MESSAGE for row in rows)
    assert all(job_payload(row)["result"] is None for row in rows)
    check.close()
