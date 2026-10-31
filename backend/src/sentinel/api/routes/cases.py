"""Owner-scoped public-interest audit case workflow.

The only executable test in this first case MVP is the named synthetic fixture
benchmark. Case notes are private metadata, are never copied into signed reports,
and uploaded evidence is intentionally unsupported.
"""

from __future__ import annotations

import json
import hashlib
import platform
import subprocess
import uuid
from datetime import datetime, timezone
from enum import StrEnum
from importlib.metadata import PackageNotFoundError, version
from typing import Any

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from sentinel.cases.fixtures import (
    CRITERIA,
    FIXTURE_ID,
    FIXTURE_VERSION,
    FIXTURE_SEED,
    criteria_hash,
    evaluate_fixture,
    validate_known_outcomes,
)
from sentinel.cases.models import AuditCaseRow, AuditCaseRunRow, utc_now
from sentinel.config import get_settings
from sentinel.gateway.deps import AuthDep, SessionDep
from sentinel.ledger.service import seal_report
from sentinel.ledger.signing import load_public_key

router = APIRouter(prefix="/cases", tags=["public-interest audit cases"])


class EvidenceSource(StrEnum):
    CITIZEN_OR_NGO_REPORT = "citizen_or_ngo_report"
    PUBLIC_DOCUMENT = "public_document"
    PUBLIC_INTERFACE = "public_interface"
    AUTHORISED_DATASET = "authorised_dataset"
    SYNTHETIC_DEMO = "synthetic_demo"
    OTHER = "other"


class AccessState(StrEnum):
    NOT_PROVIDED = "not_provided"
    PUBLIC_SOURCE = "public_source"
    CONSENT_RECORDED = "consent_recorded"
    WRITTEN_AUTHORITY = "written_authority"
    DENIED = "denied"
    NOT_APPLICABLE = "not_applicable"


class RunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    variant: str = Field(pattern="^(clean|known_flawed)$")


class AuditCaseCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=4, max_length=120)
    target_name: str = Field(min_length=2, max_length=160)
    investigation_question: str = Field(min_length=8, max_length=2000)
    evidence_source: EvidenceSource
    provenance_note: str = Field(default="", max_length=1500)
    evidence_reference: str = Field(default="", max_length=600)
    access_state: AccessState = AccessState.NOT_PROVIDED


class AuditCaseUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    human_review_status: str | None = Field(default=None, pattern="^(unreviewed|reviewed)$")
    human_review_notes: str | None = Field(default=None, max_length=3000)
    rti_draft: str | None = Field(default=None, max_length=12000)
    system_owner_response: str | None = Field(default=None, max_length=8000)
    remediation_status: str | None = Field(
        default=None,
        pattern="^(not_contacted|draft_prepared|awaiting_response|response_received|action_reported|no_action_reported)$",
    )


EXECUTION_STATES = {
    "NOT_APPLICABLE", "PREREQUISITE_MISSING", "ACCESS_DENIED", "QUOTA_EXCEEDED",
    "RUNNING", "COMPLETED", "FAILED", "DEGRADED", "SUPERSEDED",
}
EVIDENTIARY_STATES = {
    "observed", "potential_risk_signal", "inconclusive", "no_signal", "requires_human_review",
}


def _get_owned_case(session, case_id: str, owner: str) -> AuditCaseRow | None:
    return session.execute(
        select(AuditCaseRow).where(
            AuditCaseRow.case_id == case_id,
            AuditCaseRow.owner_subject == owner,
        )
    ).scalar_one_or_none()


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _run_payload(run: AuditCaseRunRow, *, include_result: bool = True) -> dict[str, Any]:
    return {
        "run_id": run.run_id,
        "execution_status": run.execution_status,
        "evidentiary_status": run.evidentiary_status,
        "report_sequence": run.report_sequence,
        "result": json.loads(run.result_json) if include_result and run.result_json else None,
        "error_message": run.error_message,
        "created_at": _iso(run.created_at),
        "started_at": _iso(run.started_at),
        "finished_at": _iso(run.finished_at),
    }


def _prerequisites(case: AuditCaseRow, latest_run: AuditCaseRunRow | None) -> list[dict[str, str]]:
    synthetic_status = (
        latest_run.execution_status
        if latest_run is not None
        else "PREREQUISITE_MISSING"
    )
    external_state = "ACCESS_DENIED" if case.access_state == AccessState.DENIED.value else "PREREQUISITE_MISSING"
    external_reason = (
        "Access was recorded as denied; no external request was made."
        if case.access_state == AccessState.DENIED.value
        else "No external target connector, verified scope, and permission review are implemented in this MVP."
    )
    return [
        {
            "test_id": "synthetic_known_fixture_benchmark",
            "label": "Controlled synthetic defect benchmark",
            "execution_status": synthetic_status,
            "reason": "Runs only against SENTINEL-owned fictional fixture rows; it does not test the target named in this case.",
        },
        {
            "test_id": "external_black_box",
            "label": "Public-facing or authorised black-box test",
            "execution_status": external_state,
            "reason": external_reason,
        },
        {
            "test_id": "submitted_evidence_review",
            "label": "Review submitted citizen/NGO evidence",
            "execution_status": "PREREQUISITE_MISSING",
            "reason": "The case records source and provenance metadata only. File uploads and human evidence review are not implemented.",
        },
        {
            "test_id": "authorised_record_quality",
            "label": "Authorised record-quality audit",
            "execution_status": "ACCESS_DENIED" if case.access_state == AccessState.DENIED.value else "PREREQUISITE_MISSING",
            "reason": "No permission-reviewed real dataset, retention controls, or record schema is connected.",
        },
    ]


def _case_payload(case: AuditCaseRow, *, include_runs: bool = True) -> dict[str, Any]:
    runs = sorted(case.runs, key=lambda item: (item.created_at, item.run_id))
    latest = runs[-1] if runs else None
    return {
        "case_id": case.case_id,
        "title": case.title,
        "target_name": case.target_name,
        "investigation_question": case.investigation_question,
        "evidence_source": case.evidence_source,
        "provenance_note": case.provenance_note,
        "evidence_reference": case.evidence_reference,
        "access_state": case.access_state,
        "human_review_status": case.human_review_status,
        "human_review_notes": case.human_review_notes,
        "rti_draft": case.rti_draft,
        "system_owner_response": case.system_owner_response,
        "remediation_status": case.remediation_status,
        "created_at": _iso(case.created_at),
        "updated_at": _iso(case.updated_at),
        "prerequisites": _prerequisites(case, latest),
        "runs": [_run_payload(run) for run in runs] if include_runs else [],
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_case(request: AuditCaseCreate, identity: AuthDep, session: SessionDep) -> dict[str, Any]:
    now = utc_now()
    case = AuditCaseRow(
        case_id=str(uuid.uuid4()),
        owner_subject=identity.subject,
        title=request.title.strip(),
        target_name=request.target_name.strip(),
        investigation_question=request.investigation_question.strip(),
        evidence_source=request.evidence_source.value,
        provenance_note=request.provenance_note.strip(),
        evidence_reference=request.evidence_reference.strip(),
        access_state=request.access_state.value,
        created_at=now,
        updated_at=now,
    )
    session.add(case)
    session.commit()
    session.refresh(case)
    return _case_payload(case)


@router.get("")
def list_cases(identity: AuthDep, session: SessionDep) -> list[dict[str, Any]]:
    rows = session.execute(
        select(AuditCaseRow)
        .where(AuditCaseRow.owner_subject == identity.subject)
        .order_by(AuditCaseRow.updated_at.desc())
    ).scalars()
    return [_case_payload(row, include_runs=False) for row in rows]


@router.get("/{case_id}")
def get_case(case_id: str, identity: AuthDep, session: SessionDep) -> dict[str, Any]:
    case = _get_owned_case(session, case_id, identity.subject)
    if case is None:
        raise HTTPException(status_code=404, detail="Audit case not found.")
    return _case_payload(case)


@router.patch("/{case_id}")
def update_case(
    case_id: str, request: AuditCaseUpdate, identity: AuthDep, session: SessionDep
) -> dict[str, Any]:
    case = _get_owned_case(session, case_id, identity.subject)
    if case is None:
        raise HTTPException(status_code=404, detail="Audit case not found.")
    changes = request.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one case field to update.")
    for field, value in changes.items():
        setattr(case, field, value)
    case.updated_at = utc_now()
    session.commit()
    session.refresh(case)
    return _case_payload(case)


def _source_revision() -> str:
    try:
        from pathlib import Path

        root = Path(__file__).resolve().parents[4]
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=root, capture_output=True, text=True, timeout=2, check=True
        )
        return result.stdout.strip()
    except Exception:
        return "unknown"


def _package_version(name: str) -> str:
    try:
        return version(name)
    except PackageNotFoundError:
        return "unknown"


@router.post("/{case_id}/demo-run", status_code=status.HTTP_201_CREATED)
def run_synthetic_benchmark(
    case_id: str,
    request: RunRequest,
    identity: AuthDep,
    session: SessionDep,
) -> dict[str, Any]:
    case = _get_owned_case(session, case_id, identity.subject)
    if case is None:
        raise HTTPException(status_code=404, detail="Audit case not found.")

    for prior in case.runs:
        if prior.execution_status in {"COMPLETED", "DEGRADED"}:
            prior.execution_status = "SUPERSEDED"
    now = utc_now()
    run = AuditCaseRunRow(
        run_id=str(uuid.uuid4()),
        case_id=case.case_id,
        owner_subject=identity.subject,
        execution_status="RUNNING",
        evidentiary_status="inconclusive",
        created_at=now,
        started_at=now,
    )
    session.add(run)
    session.commit()

    try:
        selected = evaluate_fixture(request.variant)
        validation = validate_known_outcomes()
        actual_signals = [finding for finding in selected["results"] if finding["signal"]]
        overall_status = "requires_human_review" if actual_signals else "no_signal"
        try:
            dirty = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=__import__("pathlib").Path(__file__).resolve().parents[4],
                capture_output=True,
                text=True,
                timeout=2,
                check=True,
            ).stdout.strip() != ""
        except Exception:
            dirty = None
        settings = get_settings()
        load_public_key()
        signer_key_id = hashlib.sha256(settings.public_key_path.read_bytes()).hexdigest()
        report = {
            "report_type": "controlled_synthetic_public_benefit_fixture_audit",
            "scope": "This report evaluates only SENTINEL's deterministic fictional fixture rows. It is not evidence about the real service named in the case.",
            "target": {
                "id": FIXTURE_ID,
                "version": FIXTURE_VERSION,
                "variant": request.variant,
                "identity_status": "known synthetic fixture",
            },
            "criterion_definitions": CRITERIA,
            "test_results": selected["results"],
            "overall_evidentiary_status": overall_status,
            "validation_against_known_fixtures": validation,
            "signing": {
                "algorithm": "Ed25519",
                "signer_key_id_sha256": signer_key_id,
                "proves": "The configured key signed these canonical report bytes; later changes to the retained bytes are detectable.",
                "does_not_prove": "Truth of the findings, government authority, secure key custody, or an externally trusted timestamp.",
            },
            "reproducibility_manifest": {
                "test_suite_version": FIXTURE_VERSION,
                "test_configuration": {"variant": request.variant, "criteria_count": len(CRITERIA)},
                "seed": FIXTURE_SEED,
                "profile_generation_method": "deterministic rule-generated fictional rows; no randomness",
                "query_count": 0,
                "timestamps_utc": {"started": now.isoformat(), "finished": utc_now().isoformat()},
                "timestamp_trusted": False,
                "software_versions": {
                    "python": platform.python_version(),
                    "numpy": _package_version("numpy"),
                    "pydantic": _package_version("pydantic"),
                    "sqlalchemy": _package_version("sqlalchemy"),
                },
                "source_revision": _source_revision(),
                "working_tree_dirty": dirty,
                "test_specification_sha256": criteria_hash(),
                "dataset_manifest_sha256": selected["dataset_hash"],
                "raw_personal_evidence_included": False,
            },
            "limitations": [
                "The fixture contains fictional records and known planted defects.",
                "Detection counts describe these fixtures only and are not general sensitivity or accuracy estimates.",
                "The 15% subgroup threshold is an internal screening rule, not a legal standard.",
                "An observed record or notice issue does not establish a real person's record error or a legal violation.",
                "Approval-rate differences alone do not establish discrimination or causation.",
                "A signature establishes integrity of the stored report bytes under the configured key; it does not prove truth, authority, or external timestamping.",
            ],
        }
        sealed = seal_report(
            session,
            report,
            audit_type="synthetic_case_fixture_audit",
            target_id=FIXTURE_ID,
        )
        run.result_json = json.dumps(
            {"report": report, "sealed": {
                "sequence": sealed.sequence,
                "report_hash": sealed.report_hash,
                "signature": sealed.signature,
            }},
            sort_keys=True,
            separators=(",", ":"),
            allow_nan=False,
        )
        run.report_sequence = sealed.sequence
        run.execution_status = "COMPLETED"
        run.evidentiary_status = overall_status
        run.finished_at = utc_now()
        case.updated_at = run.finished_at
        session.commit()
    except Exception:
        session.rollback()
        failed = session.get(AuditCaseRunRow, run.run_id)
        if failed is not None:
            failed.execution_status = "FAILED"
            failed.evidentiary_status = "inconclusive"
            failed.error_message = "Synthetic fixture run failed; internal diagnostics are withheld."
            failed.finished_at = utc_now()
            session.commit()
        raise HTTPException(status_code=500, detail="Synthetic fixture run failed.") from None

    session.refresh(run)
    return _run_payload(run)


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_case(case_id: str, identity: AuthDep, session: SessionDep) -> None:
    case = _get_owned_case(session, case_id, identity.subject)
    if case is None:
        raise HTTPException(status_code=404, detail="Audit case not found.")
    # The signed report contains only synthetic fixture results and no case notes.
    # Deleting the case removes its private metadata and run linkage, not the ledger.
    session.delete(case)
    session.commit()
