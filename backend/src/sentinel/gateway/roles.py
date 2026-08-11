"""Auditor roles and their query/privacy allowances (M4).

The tiers reflect a real asymmetry: a citizen checking their own rejection needs
a handful of probes, while a certified auditor running a systematic study needs
thousands. Granting everyone the maximum would turn SENTINEL into exactly the
privacy-leak vector it exists to guard against -- an attacker could chain
unlimited queries to reconstruct the data the tool is protecting.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class Role(StrEnum):
    CITIZEN = "citizen"
    JOURNALIST = "journalist"
    CERTIFIED_AUDITOR = "certified_auditor"
    GOV_SELF_AUDIT = "gov_self_audit"


@dataclass(frozen=True)
class Quota:
    """What one role may spend."""

    queries_per_audit: int
    audits_per_day: int
    max_epsilon: float
    may_probe_arbitrary_records: bool


# Epsilon caps are set against the measured cost of a real audit at sigma=40:
# ~200 queries costs eps~1.5, ~2,000 costs eps~5.5, ~20,000 costs eps~22.
QUOTAS: dict[Role, Quota] = {
    # A citizen checks their own case: enough for one membership probe with
    # decoys, and not enough to sweep a population.
    Role.CITIZEN: Quota(
        queries_per_audit=200,
        audits_per_day=3,
        max_epsilon=2.0,
        may_probe_arbitrary_records=False,
    ),
    Role.JOURNALIST: Quota(
        queries_per_audit=2_000,
        audits_per_day=20,
        max_epsilon=8.0,
        may_probe_arbitrary_records=True,
    ),
    Role.CERTIFIED_AUDITOR: Quota(
        queries_per_audit=20_000,
        audits_per_day=100,
        max_epsilon=30.0,
        may_probe_arbitrary_records=True,
    ),
    # A body auditing its own system is not exposing anyone else's data to a
    # third party, so the cap is loosest -- but still finite and still logged.
    Role.GOV_SELF_AUDIT: Quota(
        queries_per_audit=50_000,
        audits_per_day=500,
        max_epsilon=60.0,
        may_probe_arbitrary_records=True,
    ),
}


def quota_for(role: Role) -> Quota:
    return QUOTAS[Role(role)]
