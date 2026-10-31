"""Audit execution endpoints.

Every route here runs the full trust chain: authenticate (M4) -> rate limit (M4)
-> privacy preflight (M5) -> engine (M1/M2) -> seal (M3) -> record spend (M5).
"""

from __future__ import annotations

from typing import Any

import numpy as np
from fastapi import APIRouter, BackgroundTasks, HTTPException, status
from pydantic import BaseModel, Field

from sentinel.data.welfare import generate_welfare_dataset
from sentinel.engines.explainability import ExplainabilityAuditEngine
from sentinel.engines.membership import MembershipAuditEngine
from sentinel.gateway.budget import record_audit
from sentinel.gateway.deps import AuthDep, SessionDep, enforce_budget
from sentinel.gateway.jobs import (
    COMPLETED,
    FAILED,
    QUEUED,
    RUNNING,
    AuditJobRow,
    JobProgress,
    get_owned_job,
    job_payload,
    make_job,
    transition_job,
)
from sentinel.ledger.service import seal_report
from sentinel.privacy.guardian import BudgetGuardian
from sentinel.reporting.plain import plain_language_membership, plain_language_explain
from sentinel.target.registry import (
    DEMO_TARGET_ID,
    HTTP_DEMO_TARGET_ID,
    load_demo_target,
    load_http_demo_target,
)

router = APIRouter(prefix="/audits", tags=["synthetic demo audits"])

# Engines are expensive to construct (the shadow ensemble loads from cache), so
# they are built once and reused across requests.
_membership_engine: MembershipAuditEngine | None = None
_explainability_engine: ExplainabilityAuditEngine | None = None


def _membership() -> MembershipAuditEngine:
    global _membership_engine
    if _membership_engine is None:
        _membership_engine = MembershipAuditEngine()
    return _membership_engine


def _explainability() -> ExplainabilityAuditEngine:
    global _explainability_engine
    if _explainability_engine is None:
        _explainability_engine = ExplainabilityAuditEngine()
    return _explainability_engine


class MembershipRequest(BaseModel):
    record: list[float] = Field(
        description="The applicant record to test, in the target's feature order"
    )
    label: int = Field(default=1, description="The outcome recorded for this applicant")
    record_id: str = Field(default="record-under-test")
    with_decoys: bool = Field(
        default=True, description="Also probe near-neighbours as a control"
    )


class ExplainabilityRequest(BaseModel):
    sample_size: int = Field(default=1500, ge=50, le=5000)


@router.post("/membership", summary="Estimate a membership signal on the synthetic model")
def audit_membership(
    request: MembershipRequest, identity: AuthDep, session: SessionDep
) -> dict[str, Any]:
    """Run M1 against the demo target."""
    # Budget check first, before the target or engine is touched (docs §3.3
    # step 3). Calibration probes count against the budget too -- they are real
    # queries against the target, and excluding them would understate the cost.
    planned = 1 + (20 if request.with_decoys else 0) + 500
    enforce_budget(identity, session, DEMO_TARGET_ID, planned)

    target, _ = load_demo_target()
    engine = _membership()

    record = np.asarray([request.record], dtype=float)
    if record.shape[1] != len(target.feature_names):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Expected {len(target.feature_names)} features "
                f"({', '.join(target.feature_names)}), got {record.shape[1]}."
            ),
        )

    report = engine.audit(
        target,
        record,
        np.asarray([request.label]),
        [request.record_id],
        target_id=DEMO_TARGET_ID,
        with_decoys=request.with_decoys,
    )

    body = report.to_dict()
    body["plain_language"] = plain_language_membership(report.findings[0])

    sealed = seal_report(
        session, body, audit_type="membership_inference", target_id=DEMO_TARGET_ID
    )
    BudgetGuardian(session).record_spend(DEMO_TARGET_ID, report.queries_used)
    record_audit(session, identity.subject, report.queries_used)

    return {
        "report": body,
        "sealed": {
            "sequence": sealed.sequence,
            "report_hash": sealed.report_hash,
            "signature": sealed.signature,
        },
    }


@router.post("/explainability", summary="Test feature consistency on the synthetic model")
def audit_explainability(
    request: ExplainabilityRequest, identity: AuthDep, session: SessionDep
) -> dict[str, Any]:
    """Run M2 against the demo target."""
    # Budget check first, before the target or engine is touched. A refused
    # request must cost the target nothing and construct nothing (docs §3.3
    # step 3) -- otherwise "denied" still means the system was probed.
    #
    # Baseline pass plus one counterfactual per rejection; the rejection rate is
    # unknown before the baseline, so this bounds it conservatively.
    planned = request.sample_size * 2
    enforce_budget(identity, session, DEMO_TARGET_ID, planned)

    target, dataset = load_demo_target()
    engine = _explainability()

    reference = generate_welfare_dataset(
        n_train=10, n_test=1500, n_canaries=0, seed=555001
    ).x_test

    report = engine.audit(
        target,
        dataset.x_test[: request.sample_size],
        reference,
        target_id=DEMO_TARGET_ID,
    )

    body = report.to_dict()
    body["plain_language"] = plain_language_explain(report)

    sealed = seal_report(
        session, body, audit_type="explainability_consistency", target_id=DEMO_TARGET_ID
    )
    BudgetGuardian(session).record_spend(DEMO_TARGET_ID, report.queries_used)
    record_audit(session, identity.subject, report.queries_used)

    return {
        "report": body,
        "sealed": {
            "sequence": sealed.sequence,
            "report_hash": sealed.report_hash,
            "signature": sealed.signature,
        },
    }


class FairnessRequest(BaseModel):
    per_cohort: int = Field(default=200, ge=50, le=2000)


@router.post("/fairness", summary="Compare generated cohorts on the synthetic model")
def audit_fairness(
    request: FairnessRequest, identity: AuthDep, session: SessionDep
) -> dict[str, Any]:
    """Run the Synthetic Citizen Red-Team against the demo target."""
    from sentinel.engines.redteam import TAXONOMY, RedTeamEngine

    # Baseline pass plus one cohort per documented edge case.
    planned = 800 + request.per_cohort * len(TAXONOMY)
    enforce_budget(identity, session, DEMO_TARGET_ID, planned)

    target, _ = load_demo_target()
    baseline = generate_welfare_dataset(
        n_train=10, n_test=800, n_canaries=0, seed=771001
    ).x_test

    report = RedTeamEngine().audit(
        target, baseline, target_id=DEMO_TARGET_ID, per_cohort=request.per_cohort
    )

    body = report.to_dict()
    sealed = seal_report(
        session, body, audit_type="fairness_red_team", target_id=DEMO_TARGET_ID
    )
    BudgetGuardian(session).record_spend(DEMO_TARGET_ID, report.queries_used)
    record_audit(session, identity.subject, report.queries_used)

    return {
        "report": body,
        "sealed": {
            "sequence": sealed.sequence,
            "report_hash": sealed.report_hash,
            "signature": sealed.signature,
        },
    }


@router.post(
    "/fairness/http-demo",
    summary="Audit the controlled local HTTP decision service",
)
def audit_http_fairness(
    request: FairnessRequest, identity: AuthDep, session: SessionDep
) -> dict[str, Any]:
    """Run the same cohort workflow using only predictions returned over HTTP."""
    from fastapi import HTTPException
    from sentinel.config import get_settings
    from sentinel.engines.redteam import TAXONOMY, RedTeamEngine

    if not get_settings().enable_http_demo_target:
        raise HTTPException(status_code=404, detail="The local HTTP demo target is disabled.")

    planned = 800 + request.per_cohort * len(TAXONOMY)
    enforce_budget(identity, session, HTTP_DEMO_TARGET_ID, planned)
    target = load_http_demo_target()
    baseline = generate_welfare_dataset(
        n_train=10, n_test=800, n_canaries=0, seed=771001
    ).x_test

    report = RedTeamEngine().audit(
        target,
        baseline,
        target_id=HTTP_DEMO_TARGET_ID,
        per_cohort=request.per_cohort,
    )
    body = report.to_dict()
    body["target"] = {
        "type": "controlled_local_http",
        "model_id": target.model_id or HTTP_DEMO_TARGET_ID,
        "model_version": target.model_version,
        "scope": "local synthetic decision service; not a government system",
    }
    body["audit_config"] = {
        "baseline_profiles_requested": len(baseline),
        "profiles_per_cohort_requested": request.per_cohort,
        "cohorts": [case.name for case in TAXONOMY],
        "max_target_probes": get_settings().http_demo_max_probes,
    }
    body["disclosure"] = (
        "Predictions in this report were received from the controlled local HTTP "
        "decision service. Test profiles and cohorts are synthetic and generated "
        "for this demonstration; the target model is synthetic, not a government "
        "or production service. Observed differences are stress-test results, not "
        "proof of discrimination or causation. P-values are exploratory and are "
        "not adjusted for testing multiple cohorts. Failed and unattempted probes "
        "are listed; metrics use only successfully completed probes."
    )

    sealed = seal_report(
        session, body, audit_type="fairness_red_team_http", target_id=HTTP_DEMO_TARGET_ID
    )
    BudgetGuardian(session).record_spend(HTTP_DEMO_TARGET_ID, report.queries_used)
    record_audit(session, identity.subject, report.queries_used)
    return {
        "report": body,
        "sealed": {
            "sequence": sealed.sequence,
            "report_hash": sealed.report_hash,
            "signature": sealed.signature,
        },
    }


def _dispatch_fairness_job(
    background_tasks: BackgroundTasks,
    session,
    identity,
    request: FairnessRequest,
    *,
    http_target: bool,
) -> dict[str, Any]:
    from sentinel.engines.redteam import TAXONOMY

    from sentinel.config import get_settings

    settings = get_settings()
    if http_target and not settings.enable_http_demo_target:
        raise HTTPException(status_code=404, detail="The local HTTP demo target is disabled.")

    target_id = HTTP_DEMO_TARGET_ID if http_target else DEMO_TARGET_ID
    planned = 800 + request.per_cohort * len(TAXONOMY)
    enforce_budget(identity, session, target_id, planned)
    row = make_job(
        session,
        owner_subject=identity.subject,
        audit_type="fairness_red_team_http" if http_target else "fairness_red_team",
        target_id=target_id,
        total_probes=planned,
    )
    background_tasks.add_task(
        _execute_fairness_job,
        row.job_id,
        identity.subject,
        request.per_cohort,
        http_target,
    )
    return job_payload(row, include_result=False)


@router.post("/fairness/jobs", status_code=status.HTTP_202_ACCEPTED)
def queue_fairness_job(
    request: FairnessRequest,
    background_tasks: BackgroundTasks,
    identity: AuthDep,
    session: SessionDep,
) -> dict[str, Any]:
    """Queue the existing in-process synthetic fairness workflow."""
    return _dispatch_fairness_job(
        background_tasks, session, identity, request, http_target=False
    )


@router.post("/fairness/http-demo/jobs", status_code=status.HTTP_202_ACCEPTED)
def queue_http_fairness_job(
    request: FairnessRequest,
    background_tasks: BackgroundTasks,
    identity: AuthDep,
    session: SessionDep,
) -> dict[str, Any]:
    """Queue a fairness audit against the opt-in local HTTP target."""
    return _dispatch_fairness_job(
        background_tasks, session, identity, request, http_target=True
    )


@router.get("/jobs/{job_id}")
def poll_audit_job(
    job_id: str, identity: AuthDep, session: SessionDep
) -> dict[str, Any]:
    """Return an owner's persisted progress and, only when complete, its result."""
    row = get_owned_job(session, job_id, identity.subject)
    if row is None:
        # Same response for unknown ids and jobs owned by other subjects.
        raise HTTPException(status_code=404, detail="Audit job not found.")
    return job_payload(row)


def _execute_fairness_job(
    job_id: str,
    owner_subject: str,
    per_cohort: int,
    http_target: bool,
) -> None:
    """Run one job in the process-local background worker and persist outcome."""
    from sentinel.config import get_settings
    from sentinel.engines.redteam import TAXONOMY, RedTeamEngine
    from sentinel.gateway.budget import record_audit
    from sentinel.ledger.models import create_session_factory

    settings = get_settings()
    factory = create_session_factory(settings.database_url)
    session = factory()
    progress = JobProgress(job_id)
    target_id = HTTP_DEMO_TARGET_ID if http_target else DEMO_TARGET_ID
    try:
        job = session.get(AuditJobRow, job_id)
        if job is None or job.status != QUEUED:
            return
        transition_job(job, RUNNING)
        session.commit()

        if http_target:
            target = load_http_demo_target(progress_callback=progress.record)
        else:
            target, _ = load_demo_target()

        baseline = generate_welfare_dataset(
            n_train=10, n_test=800, n_canaries=0, seed=771001
        ).x_test
        report = RedTeamEngine().audit(
            target,
            baseline,
            target_id=target_id,
            per_cohort=per_cohort,
            progress_callback=None if http_target else progress.record,
        )
        progress.flush()
        body = report.to_dict()
        body["job_id"] = job_id
        if http_target:
            body["target"] = {
                "type": "controlled_local_http",
                "model_id": target.model_id or HTTP_DEMO_TARGET_ID,
                "model_version": target.model_version,
                "scope": "local synthetic decision service; not a government system",
            }
            body["audit_config"] = {
                "baseline_profiles_requested": len(baseline),
                "profiles_per_cohort_requested": per_cohort,
                "cohorts": [case.name for case in TAXONOMY],
                "max_target_probes": settings.http_demo_max_probes,
            }
            body["disclosure"] = (
                "Predictions were received from the controlled local HTTP decision "
                "service. Profiles are synthetic and generated for this demo; the "
                "target is not a government or production service. Differences are "
                "stress-test results, not proof of discrimination or causation. "
                "P-values are exploratory and unadjusted across cohorts. Metrics "
                "use successful responses; failed and unattempted probes are listed."
            )
        else:
            body["target"] = {
                "type": "in_process_synthetic_demo",
                "model_id": DEMO_TARGET_ID,
                "model_version": "synthetic-welfare-v1",
                "scope": "local synthetic model; not a government system",
            }

        sealed = seal_report(
            session,
            body,
            audit_type="fairness_red_team_http" if http_target else "fairness_red_team",
            target_id=target_id,
        )
        result = {
            "report": body,
            "sealed": {
                "sequence": sealed.sequence,
                "report_hash": sealed.report_hash,
                "signature": sealed.signature,
            },
        }
        BudgetGuardian(session).record_spend(target_id, report.queries_used)
        record_audit(session, owner_subject, report.queries_used)
        job = session.get(AuditJobRow, job_id)
        if job is None:
            raise RuntimeError("Audit job disappeared before completion")
        transition_job(job, COMPLETED, result=result)
        session.commit()
    except Exception:
        try:
            progress.flush()
        except Exception:
            pass
        try:
            session.rollback()
            job = session.get(AuditJobRow, job_id)
            if job is not None and job.status in (QUEUED, RUNNING):
                transition_job(
                    job,
                    FAILED,
                    error_message="Audit execution failed. Internal diagnostic details are withheld.",
                )
                session.commit()
        except Exception:
            session.rollback()
    finally:
        session.close()


@router.get("/budget", summary="Internal query-budget estimate for the demo target")
def budget_status(identity: AuthDep, session: SessionDep) -> dict[str, Any]:
    """Cumulative privacy loss (M5), with the naive comparison."""
    from sentinel.gateway.roles import quota_for

    quota = quota_for(identity.role)
    return BudgetGuardian(session).status(DEMO_TARGET_ID, quota.max_epsilon)
