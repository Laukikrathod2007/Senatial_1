"""Case storage, controlled fixture outcomes, and report integrity tests."""

from __future__ import annotations

import json

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from sentinel.api.routes import cases
from sentinel.cases.fixtures import CRITERIA, evaluate_fixture, fixture_rows, validate_known_outcomes
from sentinel.cases.models import AuditCaseRow
from sentinel.gateway.auth import AuditorIdentity
from sentinel.gateway.roles import Role
from sentinel.ledger.models import AuditReportRow, create_session_factory
from sentinel.ledger.service import verify_report


def _setup(tmp_path, monkeypatch):
    from sentinel.config import get_settings

    settings = get_settings()
    state = tmp_path / "var-case-demo"
    state.mkdir()
    monkeypatch.setattr(settings, "var_dir", state)
    monkeypatch.setattr(settings, "database_url", f"sqlite:///{(state / 'sentinel.db').as_posix()}")
    return create_session_factory(settings.database_url)


def _create_case(session, identity):
    return cases.create_case(
        cases.AuditCaseCreate(
            title="Conflicting benefit status",
            target_name="District benefit application workflow",
            investigation_question="Why do the two notices show different statuses?",
            evidence_source="citizen_or_ngo_report",
            provenance_note="Reported by a local NGO after reviewing two notices.",
            evidence_reference="redacted-notice-pair-2026-01",
            access_state="consent_recorded",
        ),
        identity,
        session,
    )


def test_clean_and_flawed_fixture_oracle_has_expected_counts():
    clean = evaluate_fixture("clean")
    flawed = evaluate_fixture("known_flawed")
    clean_by_id = {row["criterion_id"]: row for row in clean["results"]}
    flawed_by_id = {row["criterion_id"]: row for row in flawed["results"]}

    # Independently count fixture rows instead of trusting the rule output.
    clean_rows = fixture_rows("clean")
    flawed_rows = fixture_rows("known_flawed")
    assert len(clean_rows) == 100
    assert len(flawed_rows) == 101
    assert sum(row["decision"] == "approved" and row["group"] == "urban_reference" for row in clean_rows) == 35
    assert sum(row["decision"] == "approved" and row["group"] == "rural_access" for row in clean_rows) == 35
    assert sum(row["decision"] == "approved" and row["group"] == "rural_access" for row in flawed_rows) == 20
    assert all(not result["signal"] for result in clean_by_id.values())
    assert all(result["signal"] for result in flawed_by_id.values())

    validation = validate_known_outcomes()
    assert validation["planted_defects"] == 3
    assert validation["detected_known_defects"] == 3
    assert validation["missed_known_defects"] == 0
    assert validation["false_alarm_criteria_on_clean_fixture"] == 0
    assert {item["threshold_type"] for item in CRITERIA} == {
        "internal screening rule, not a legal standard"
    } | {"internal screening threshold, not a legal standard"}


def test_case_owner_workflow_signed_run_review_and_delete(tmp_path, monkeypatch):
    factory = _setup(tmp_path, monkeypatch)
    owner = AuditorIdentity("case-owner", Role.JOURNALIST, "unit-token")
    other = AuditorIdentity("different-owner", Role.JOURNALIST, "other-token")

    with factory() as session:
        created = _create_case(session, owner)
        case_id = created["case_id"]
        assert created["prerequisites"][0]["execution_status"] == "PREREQUISITE_MISSING"
        assert created["prerequisites"][1]["execution_status"] == "PREREQUISITE_MISSING"
        assert all(item["execution_status"] in cases.EXECUTION_STATES for item in created["prerequisites"])
        with pytest.raises(HTTPException) as hidden:
            cases.get_case(case_id, other, session)
        assert hidden.value.status_code == 404

    with factory() as session:
        run = cases.run_synthetic_benchmark(case_id, cases.RunRequest(variant="known_flawed"), owner, session)
        assert run["execution_status"] == "COMPLETED"
        assert run["evidentiary_status"] == "requires_human_review"
        report = run["result"]["report"]
        assert report["target"]["variant"] == "known_flawed"
        assert report["validation_against_known_fixtures"]["detected_known_defects"] == 3
        assert report["validation_against_known_fixtures"]["false_alarm_criteria_on_clean_fixture"] == 0
        assert report["reproducibility_manifest"]["timestamp_trusted"] is False
        assert report["reproducibility_manifest"]["query_count"] == 0
        assert report["scope"].find("not evidence about the real service named in the case") >= 0
        sequence = run["result"]["sealed"]["sequence"]
        assert verify_report(session, sequence)[0] is True

        row = session.execute(select(AuditReportRow).where(AuditReportRow.sequence == sequence)).scalar_one()
        payload_text = row.payload_json
        assert "Conflicting benefit status" not in payload_text
        assert "two notices show different statuses" not in payload_text

    with factory() as session:
        updated = cases.update_case(
            case_id,
            cases.AuditCaseUpdate(
                human_review_status="reviewed",
                human_review_notes="Fixture output checked; it is not evidence about the reported real system.",
                rti_draft="To: [public authority]\nPlease provide [specific records].",
                remediation_status="draft_prepared",
            ),
            owner,
            session,
        )
        assert updated["human_review_status"] == "reviewed"
        assert updated["rti_draft"].startswith("To: [public authority]")
        assert len(updated["runs"]) == 1

        clean_run = cases.run_synthetic_benchmark(case_id, cases.RunRequest(variant="clean"), owner, session)
        detail = cases.get_case(case_id, owner, session)
        assert detail["runs"][0]["execution_status"] == "SUPERSEDED"
        assert detail["runs"][1]["execution_status"] == "COMPLETED"
        assert detail["runs"][1]["evidentiary_status"] == "no_signal"
        assert detail["prerequisites"][0]["execution_status"] == "COMPLETED"
        assert verify_report(session, clean_run["result"]["sealed"]["sequence"])[0] is True

    with factory() as session:
        cases.delete_case(case_id, owner, session)
        assert session.get(AuditCaseRow, case_id) is None
        # Deleting private case metadata does not mutate either signed report.
        assert verify_report(session, run["result"]["sealed"]["sequence"])[0] is True


def test_case_request_rejects_unknown_personal_fields():
    payload = {
        "title": "A report about a benefit decision",
        "target_name": "Demo service",
        "investigation_question": "Did the recorded notice match the stated status?",
        "evidence_source": "citizen_or_ngo_report",
        "full_name": "not-accepted",
        "aadhaar_number": "not-accepted",
    }
    with pytest.raises(Exception):
        cases.AuditCaseCreate.model_validate(payload)
