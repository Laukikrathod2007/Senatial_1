"""Plain-language restatement of audit findings.

Docs §5.2 makes this a design constraint, not a nicety: the output must be
understandable to a 7th-9th standard reader, because the people most affected by
a wrongful automated decision are the least equipped to parse a confidence
interval -- and are the ones who have to carry this to a grievance office.

Rules followed throughout:
- No statistical vocabulary in the headline sentence.
- Never claim certainty. Findings are evidence, and the wording says so.
- Say what the reader can do next, since a finding they cannot act on is
  indistinguishable from no finding at all.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sentinel.engines.explainability.engine import ExplainabilityReport
    from sentinel.engines.membership.engine import MembershipFinding


def plain_language_membership(finding: "MembershipFinding") -> dict[str, str]:
    """Restate a synthetic-demo finding without implying a real person's data."""
    verdict = finding.verdict

    if verdict.startswith("strong"):
        what = (
            "In this synthetic demonstration, the model responded unusually "
            "strongly to this planted test record."
        )
        means = (
            "This only describes SENTINEL's stand-in model. It says nothing "
            "about a real person's data or a government service."
        )
        action = (
            "Use this result to understand the demonstration. Do not use it as "
            "evidence about a real person or service."
        )
    elif verdict.startswith("moderate"):
        what = (
            "The synthetic stand-in shows a modest signal for this test record; "
            "the result is uncertain."
        )
        means = (
            "This is a result about the demonstration model only, not a real "
            "system or person's data."
        )
        action = "No real-world action follows from this synthetic result."
    elif verdict.startswith("weak"):
        what = (
            "The synthetic test found only a faint signal for this record."
        )
        means = "This describes the synthetic stand-in, not a deployed service."
        action = "No real-world action follows from this synthetic result."
    else:
        what = "This synthetic test did not find a strong signal for the record."
        means = "This result does not assess a real person's data or service."
        action = "No real-world action follows from this synthetic result."

    return {
        "what_we_found": what,
        "what_it_means": means,
        "what_you_can_do": action,
        "how_sure_are_we": (
            "This is a statistical comparison against synthetic shadow models. "
            "It is not proof that any real service used this record."
        ),
    }


def plain_language_explain(report: "ExplainabilityReport") -> dict[str, str]:
    """Restate an explainability finding for a non-technical reader."""
    headline = report.headline()

    if headline is None:
        return {
            "what_we_found": (
                "In this synthetic demo, changing the stated feature alone "
                "usually changed the decision for the cases tested."
            ),
            "what_it_means": "This does not establish explanation quality in a real service.",
            "what_you_can_do": "No real-world action follows from this synthetic result.",
            "how_sure_are_we": (
                "The test changed one feature in the stand-in model across "
                f"{report.total_cases} synthetic rejected cases."
            ),
        }

    return {
        "what_we_found": "Synthetic demo finding: " + (headline or "no stable finding"),
        "what_it_means": (
            "Changing the named feature alone did not flip the outcome in some "
            "stand-in cases. Other eligibility conditions may still explain "
            "the result; this does not prove the stated reason was false."
        ),
        "what_you_can_do": (
            "This result concerns only the synthetic model. It is not evidence "
            "about a real decision and should not be attached to a real appeal."
        ),
        "how_sure_are_we": (
            f"We tested {report.total_cases} synthetic rejected cases by changing "
            "only the feature named by the stand-in explanation. A no-flip result "
            "does not identify the true cause of the decision."
        ),
    }
