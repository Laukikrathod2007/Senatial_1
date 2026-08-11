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
    """Restate a memorization finding for a non-technical reader."""
    verdict = finding.verdict

    if verdict.startswith("strong"):
        what = (
            "This system appears to have remembered this specific person's "
            "record, rather than only learning general patterns."
        )
        means = (
            "If the people running this system said the data was made anonymous, "
            "this finding does not support that claim."
        )
        action = (
            "This report can be attached to a complaint or a Right to "
            "Information request asking how this record is stored and protected."
        )
    elif verdict.startswith("moderate"):
        what = (
            "There are signs this system may have remembered this specific "
            "person's record, but the evidence is not as clear-cut."
        )
        means = (
            "This is worth asking about, though on its own it does not settle "
            "the question."
        )
        action = "Consider testing more records from the same group."
    elif verdict.startswith("weak"):
        what = (
            "There is only a faint sign that this record was remembered. Most "
            "records in a system like this show something similar."
        )
        means = "On its own, this is not strong enough to act on."
        action = "No action suggested based on this record alone."
    else:
        what = "This system does not appear to have remembered this record."
        means = "Nothing here contradicts a claim that the data was anonymised."
        action = "No action needed."

    return {
        "what_we_found": what,
        "what_it_means": means,
        "what_you_can_do": action,
        "how_sure_are_we": (
            "This is a measurement, not a certainty. It compares how this system "
            "responds to this record against how similar systems respond to "
            "records they have never seen."
        ),
    }


def plain_language_explain(report: "ExplainabilityReport") -> dict[str, str]:
    """Restate an explainability finding for a non-technical reader."""
    headline = report.headline()

    if headline is None:
        return {
            "what_we_found": (
                "When this system gave a reason for rejecting someone, fixing "
                "that reason generally changed the decision."
            ),
            "what_it_means": "The reasons this system gives appear to be genuine.",
            "what_you_can_do": "No action needed.",
            "how_sure_are_we": (
                "We tested this by changing one detail at a time and resubmitting "
                f"{report.total_cases} rejected applications."
            ),
        }

    return {
        "what_we_found": headline,
        "what_it_means": (
            "Some people are being told the wrong reason for their rejection. "
            "If you fix the problem you were told about, you can still be "
            "refused -- which makes it very hard to appeal successfully."
        ),
        "what_you_can_do": (
            "If you were rejected and fixed the reason you were given but were "
            "still refused, this report is evidence that the reason may not have "
            "been the real one. It can support a grievance or an appeal."
        ),
        "how_sure_are_we": (
            f"We tested {report.total_cases} rejected applications by changing "
            "only the one detail the system blamed, keeping everything else the "
            "same, and checking whether the answer changed."
        ),
    }
