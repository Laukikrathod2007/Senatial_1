"""Audit execution endpoints.

Every route here runs the full trust chain: authenticate (M4) -> rate limit (M4)
-> privacy preflight (M5) -> engine (M1/M2) -> seal (M3) -> record spend (M5).
"""

from __future__ import annotations

from typing import Any

import numpy as np
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from sentinel.data.welfare import generate_welfare_dataset
from sentinel.engines.explainability import ExplainabilityAuditEngine
from sentinel.engines.membership import MembershipAuditEngine
from sentinel.gateway.budget import record_audit
from sentinel.gateway.deps import AuthDep, SessionDep, enforce_budget
from sentinel.ledger.service import seal_report
from sentinel.privacy.guardian import BudgetGuardian
from sentinel.reporting.plain import plain_language_membership, plain_language_explain
from sentinel.target.registry import DEMO_TARGET_ID, load_demo_target

router = APIRouter(prefix="/audits", tags=["audits (M1/M2)"])

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


@router.post("/membership", summary="Test whether a system memorized a record")
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


@router.post("/explainability", summary="Test whether stated reasons are true")
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
    per_cohort: int = Field(default=500, ge=50, le=2000)


@router.post("/fairness", summary="Stress-test the system against edge-case citizens")
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


@router.get("/budget", summary="Privacy budget status for the demo target")
def budget_status(identity: AuthDep, session: SessionDep) -> dict[str, Any]:
    """Cumulative privacy loss (M5), with the naive comparison."""
    from sentinel.gateway.roles import quota_for

    quota = quota_for(identity.role)
    return BudgetGuardian(session).status(DEMO_TARGET_ID, quota.max_epsilon)
