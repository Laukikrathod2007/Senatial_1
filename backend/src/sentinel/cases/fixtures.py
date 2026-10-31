"""Deterministic public-benefit fixtures with documented planted defects.

The fixture is intentionally small and synthetic. Its detection counts validate
these rules on these rows; they are not estimates of real-world accuracy.
"""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from typing import Any

from sentinel.reporting.intervals import wilson_interval

FIXTURE_ID = "sentinel-public-benefit-fixture"
FIXTURE_VERSION = "1.0.0"
FIXTURE_SEED = 771_029

CRITERIA: list[dict[str, Any]] = [
    {
        "id": "REC-CONFLICT-STATUS",
        "version": "1.0",
        "name": "Conflicting application statuses",
        "source": "SENTINEL controlled fixture rule: one application identifier should not have conflicting current statuses.",
        "comparison": "Rows sharing application_id are compared for status agreement.",
        "threshold": "Any disagreement is a signal; exact consistency check.",
        "threshold_type": "internal screening rule, not a legal standard",
        "required_inputs": "Synthetic application identifiers and status rows.",
        "conclusion_limit": "Identifies a conflict planted in this fixture; does not establish a real person's record mismatch.",
    },
    {
        "id": "NOTICE-REASON-PRESENT",
        "version": "1.0",
        "name": "Decision notice reason present",
        "source": "SENTINEL controlled fixture checklist; not a legal notice-compliance checklist.",
        "comparison": "Rejected synthetic applications are checked for a non-empty reason field.",
        "threshold": "Any rejected row without a reason is a signal; exact completeness check.",
        "threshold_type": "internal screening rule, not a legal standard",
        "required_inputs": "Synthetic decision and notice_reason fields.",
        "conclusion_limit": "Checks field presence only; does not assess whether a reason is legally adequate or factually correct.",
    },
    {
        "id": "GROUP-APPROVAL-GAP",
        "version": "1.0",
        "name": "Synthetic subgroup approval-rate gap",
        "source": "SENTINEL demo measurement; no external legal or policy source is claimed.",
        "comparison": "Rural-access group compared with the explicitly named urban reference group in the same synthetic fixture.",
        "threshold": "Absolute gap of 0.15 or more is reported as a potential risk signal; both group sizes and Wilson 95% intervals are shown.",
        "threshold_type": "internal screening threshold, not a legal standard",
        "required_inputs": "Synthetic group labels and decisions for the stated reference population.",
        "conclusion_limit": "A rate gap alone does not establish discrimination, causation, legal breach, or a real-world outcome.",
    },
]


def fixture_rows(variant: str) -> list[dict[str, Any]]:
    if variant not in {"clean", "known_flawed"}:
        raise ValueError("variant must be clean or known_flawed")
    rows: list[dict[str, Any]] = []
    for group in ("urban_reference", "rural_access"):
        for index in range(1, 51):
            approved_limit = 35 if group == "urban_reference" else (
                35 if variant == "clean" else 20
            )
            approved = index <= approved_limit
            rows.append({
                "application_id": f"{group[:1].upper()}-{index:03d}",
                "input_signature": f"{group}-{index:03d}",
                "group": group,
                "status": "approved" if approved else "rejected",
                "decision": "approved" if approved else "rejected",
                "notice_reason": None if approved else "Synthetic rule threshold not met.",
            })
    if variant == "known_flawed":
        # Planted defect 1: one identifier appears with conflicting statuses.
        rows.append({
            "application_id": "U-001",
            "input_signature": "duplicate-record-fixture",
            "group": "urban_reference",
            "status": "rejected",
            "decision": "rejected",
            "notice_reason": "Synthetic duplicate row.",
        })
        # Planted defect 2: a rejected application has no notice reason.
        next(row for row in rows if row["application_id"] == "U-036")["notice_reason"] = None
    return rows


def _criterion_results(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_application: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        by_application[row["application_id"]].append(row)
    conflicts = [
        {"application_id": app_id, "statuses": sorted({row["status"] for row in items})}
        for app_id, items in sorted(by_application.items())
        if len({row["status"] for row in items}) > 1
    ]
    missing_reasons = [
        row["application_id"] for row in rows
        if row["decision"] == "rejected" and not (row["notice_reason"] or "").strip()
    ]

    group_counts: dict[str, dict[str, int]] = {}
    for group in ("urban_reference", "rural_access"):
        group_rows = [row for row in rows if row["group"] == group]
        approved = sum(row["decision"] == "approved" for row in group_rows)
        count = len(group_rows)
        interval = wilson_interval(approved, count)
        group_counts[group] = {
            "sample_size": count,
            "approved": approved,
            "rejected": count - approved,
        }
        group_counts[group]["approval_rate"] = round(approved / count, 4) if count else None
        group_counts[group]["approval_rate_ci_95"] = [
            round(interval.ci_low, 4), round(interval.ci_high, 4)
        ]
    urban_rate = group_counts["urban_reference"]["approval_rate"] or 0.0
    rural_rate = group_counts["rural_access"]["approval_rate"] or 0.0
    gap = round(urban_rate - rural_rate, 4)
    subgroup_signal = gap >= 0.15

    return [
        {
            "criterion_id": "REC-CONFLICT-STATUS",
            "execution_status": "COMPLETED",
            "evidentiary_status": "observed" if conflicts else "no_signal",
            "signal": bool(conflicts),
            "observations": conflicts,
            "summary": f"{len(conflicts)} application identifier(s) have conflicting statuses.",
        },
        {
            "criterion_id": "NOTICE-REASON-PRESENT",
            "execution_status": "COMPLETED",
            "evidentiary_status": "observed" if missing_reasons else "no_signal",
            "signal": bool(missing_reasons),
            "observations": missing_reasons,
            "summary": f"{len(missing_reasons)} rejected synthetic application(s) lack a reason field.",
        },
        {
            "criterion_id": "GROUP-APPROVAL-GAP",
            "execution_status": "COMPLETED",
            "evidentiary_status": "potential_risk_signal" if subgroup_signal else "no_signal",
            "signal": subgroup_signal,
            "observations": {
                "reference_group": "urban_reference",
                "comparison_group": "rural_access",
                "groups": group_counts,
                "approval_rate_gap_reference_minus_comparison": gap,
                "screening_threshold": 0.15,
            },
            "summary": (
                f"Urban reference approval rate exceeds rural-access rate by {gap:.1%}; "
                "this is a synthetic screening signal, not a discrimination finding."
                if subgroup_signal else
                f"Observed approval-rate gap is {gap:.1%}, below the internal 15% screening threshold."
            ),
        },
    ]


def criteria_hash() -> str:
    return hashlib.sha256(json.dumps(CRITERIA, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def evaluate_fixture(variant: str) -> dict[str, Any]:
    rows = fixture_rows(variant)
    results = _criterion_results(rows)
    manifest_rows = json.dumps(rows, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()
    return {
        "variant": variant,
        "fixture_id": FIXTURE_ID,
        "fixture_version": FIXTURE_VERSION,
        "row_count": len(rows),
        "results": results,
        "dataset_hash": hashlib.sha256(manifest_rows).hexdigest(),
    }


def validate_known_outcomes() -> dict[str, Any]:
    clean = evaluate_fixture("clean")
    flawed = evaluate_fixture("known_flawed")
    clean_flags = {result["criterion_id"]: result["signal"] for result in clean["results"]}
    flawed_flags = {result["criterion_id"]: result["signal"] for result in flawed["results"]}
    expected_clean = {result["id"]: False for result in CRITERIA}
    expected_flawed = {result["id"]: True for result in CRITERIA}
    planted = len(CRITERIA)
    detected = sum(flawed_flags[key] and expected_flawed[key] for key in expected_flawed)
    false_alarms = sum(clean_flags[key] and not expected_clean[key] for key in expected_clean)
    missed = planted - detected
    return {
        "scope": "these fixed synthetic fixtures only; not a real-world accuracy estimate",
        "planted_defects": planted,
        "detected_known_defects": detected,
        "missed_known_defects": missed,
        "false_alarm_criteria_on_clean_fixture": false_alarms,
        "clean_expected": expected_clean,
        "clean_actual": clean_flags,
        "known_flawed_expected": expected_flawed,
        "known_flawed_actual": flawed_flags,
        "per_criterion": [
            {
                "criterion_id": criterion["id"],
                "planted_defect": expected_flawed[criterion["id"]],
                "clean_expected": expected_clean[criterion["id"]],
                "clean_actual_signal": clean_flags[criterion["id"]],
                "flawed_expected": expected_flawed[criterion["id"]],
                "flawed_actual_signal": flawed_flags[criterion["id"]],
                "detected": flawed_flags[criterion["id"]],
            }
            for criterion in CRITERIA
        ],
    }
