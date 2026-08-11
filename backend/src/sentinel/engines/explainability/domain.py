"""Realistic per-feature input ranges for counterfactual probing (M2).

Docs §3.4 trap #4: an explainability audit that perturbs a feature to an
implausible value proves nothing. If you "test" a rejection reason by setting
monthly income to zero, a decision that fails to flip may just mean the model
never saw such an applicant -- an artifact of the probe, not a defect in the
system's explanation.

The constraint is enforced here, in the generator, rather than left to a review
checklist. There is no code path in M2 that can emit an out-of-domain probe.

Ranges are derived from the auditor's OWN reference sample. An auditor cannot
see the target's training data, so deriving them from it would break the
black-box premise the whole project rests on.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

import numpy as np

FeatureKind = Literal["continuous", "binary", "count"]

# Which features are structurally discrete rather than continuous. Perturbing a
# binary flag to 0.5, or a household size to 4.3, produces an applicant who
# cannot exist.
_KINDS: dict[str, FeatureKind] = {
    "monthly_income": "continuous",
    "household_size": "count",
    "land_holding_acres": "continuous",
    "years_at_address": "continuous",
    "aadhaar_seeded": "binary",
    "documents_complete": "binary",
    "prior_scheme_count": "count",
    "age": "continuous",
}

# Absolute limits that hold regardless of what the reference sample happens to
# contain -- legal and physical facts about the domain.
_HARD_LIMITS: dict[str, tuple[float, float]] = {
    "monthly_income": (0.0, 1_000_000.0),
    "household_size": (1.0, 20.0),
    "land_holding_acres": (0.0, 100.0),
    "years_at_address": (0.0, 100.0),
    "aadhaar_seeded": (0.0, 1.0),
    "documents_complete": (0.0, 1.0),
    "prior_scheme_count": (0.0, 15.0),
    "age": (18.0, 110.0),  # welfare applicants are adults
}


@dataclass(frozen=True)
class FeatureDomain:
    """The range within which a counterfactual for this feature is plausible."""

    name: str
    kind: FeatureKind
    p5: float
    p95: float
    hard_min: float
    hard_max: float

    def clamp(self, value: float) -> float:
        """Force a value into the plausible range."""
        bounded = float(np.clip(value, self.p5, self.p95))
        bounded = float(np.clip(bounded, self.hard_min, self.hard_max))
        if self.kind in ("count", "binary"):
            bounded = float(round(bounded))
        return bounded

    def contains(self, value: float) -> bool:
        """Whether a value is one M2 may legitimately *introduce* into a probe.

        This is a constraint on values the auditor synthesizes, not a claim that
        real applicants fall in this band -- genuine records routinely sit in the
        tails (someone really has lived at one address for 32 years). Untouched
        features are copied from a real applicant and are not checked against it.

        Binary features are checked against their hard limits alone: a flag's
        p5 and p95 collapse to whichever value is more common, which would
        wrongly reject the other legal state.
        """
        if self.kind == "binary":
            return self.hard_min <= value <= self.hard_max
        # Small tolerance absorbs floating-point drift from rounding counts.
        return (self.p5 - 1e-9) <= value <= (self.p95 + 1e-9)

    @property
    def favorable_value(self) -> float:
        """The most applicant-favorable plausible value for this feature.

        "Favorable" is domain knowledge, not arithmetic: for a means-tested
        benefit, low income helps an applicant and complete documents help; for
        age it is not meaningful, so the median stands in.
        """
        return _FAVORABLE[self.name](self)


# Direction of benefit per feature, given a means-tested welfare scheme.
_FAVORABLE = {
    "monthly_income": lambda d: d.p5,  # poorer applicants qualify
    "household_size": lambda d: d.p95,  # more dependents lowers per-capita income
    "land_holding_acres": lambda d: d.p5,  # landless applicants qualify
    "years_at_address": lambda d: d.p95,  # settled residence helps
    "aadhaar_seeded": lambda d: d.hard_max,  # linked is better
    "documents_complete": lambda d: d.hard_max,  # complete is better
    "prior_scheme_count": lambda d: d.p5,  # fewer existing schemes helps
    "age": lambda d: (d.p5 + d.p95) / 2,  # no clear direction
}


def derive_domains(
    reference: np.ndarray, feature_names: list[str]
) -> dict[str, FeatureDomain]:
    """Derive plausible ranges from a reference sample of applicants."""
    reference = np.atleast_2d(np.asarray(reference, dtype=float))
    domains: dict[str, FeatureDomain] = {}

    for index, name in enumerate(feature_names):
        column = reference[:, index]
        kind = _KINDS.get(name, "continuous")
        hard_min, hard_max = _HARD_LIMITS.get(name, (-np.inf, np.inf))
        domains[name] = FeatureDomain(
            name=name,
            kind=kind,
            p5=float(np.percentile(column, 5)),
            p95=float(np.percentile(column, 95)),
            hard_min=hard_min,
            hard_max=hard_max,
        )

    return domains
