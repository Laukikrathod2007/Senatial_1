"""Edge-case taxonomy for synthetic citizen red-teaming (PRD 4.2).

Each category encodes a documented real-world failure mode from India's welfare
delivery stack, not an invented corner case:

- ``address_mismatch``   migrants whose documents disagree across databases
- ``income_volatility``  informal and seasonal workers with no stable monthly figure
- ``documentation_gap``  applicants missing one paper in a multi-document chain
- ``seeding_failure``    Aadhaar-bank linking that silently never completed
- ``elderly_isolated``   old, long-settled applicants -- the pension-denial profile
- ``compound``           several at once, which is the realistic case

The point is that these applicants are *legitimately eligible*. They differ from
a clean applicant only in ways that reflect how real lives are recorded, so a
system that rejects them at a higher rate is failing the people least able to
contest it -- and aggregate accuracy hides that, because the failure is
concentrated rather than random.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

import numpy as np

from sentinel.data.welfare import FEATURE_NAMES


@dataclass(frozen=True)
class EdgeCase:
    """One documented failure mode, and how to express it in the feature space."""

    name: str
    description: str
    citizen_description: str
    mutate: Callable[[np.ndarray, np.random.Generator], None]


def _index(name: str) -> int:
    return FEATURE_NAMES.index(name)


def _address_mismatch(row: np.ndarray, rng: np.random.Generator) -> None:
    # Recently moved: short tenure at the current address.
    row[_index("years_at_address")] = rng.uniform(0.0, 1.5)


def _income_volatility(row: np.ndarray, rng: np.random.Generator) -> None:
    # Seasonal work reported at a peak-month figure rather than an average.
    row[_index("monthly_income")] *= rng.uniform(1.6, 2.4)


def _documentation_gap(row: np.ndarray, rng: np.random.Generator) -> None:
    row[_index("documents_complete")] = 0.0


def _seeding_failure(row: np.ndarray, rng: np.random.Generator) -> None:
    row[_index("aadhaar_seeded")] = 0.0


def _elderly_isolated(row: np.ndarray, rng: np.random.Generator) -> None:
    row[_index("age")] = rng.uniform(78.0, 95.0)
    row[_index("years_at_address")] = rng.uniform(35.0, 55.0)
    row[_index("household_size")] = rng.integers(1, 3)


def _compound(row: np.ndarray, rng: np.random.Generator) -> None:
    _address_mismatch(row, rng)
    _income_volatility(row, rng)
    _seeding_failure(row, rng)


TAXONOMY: tuple[EdgeCase, ...] = (
    EdgeCase(
        "address_mismatch",
        "Recently migrated; short tenure at the current address.",
        "People who moved recently for work",
        _address_mismatch,
    ),
    EdgeCase(
        "income_volatility",
        "Seasonal or informal earnings captured at a peak month.",
        "People whose income changes month to month",
        _income_volatility,
    ),
    EdgeCase(
        "documentation_gap",
        "One document missing from an otherwise complete submission.",
        "People missing one document",
        _documentation_gap,
    ),
    EdgeCase(
        "seeding_failure",
        "Aadhaar-bank linking never completed.",
        "People whose Aadhaar is not linked to their bank account",
        _seeding_failure,
    ),
    EdgeCase(
        "elderly_isolated",
        "Very old, long-settled, small household.",
        "Elderly people living alone",
        _elderly_isolated,
    ),
    EdgeCase(
        "compound",
        "Migration, volatile income, and failed seeding together.",
        "Migrant workers facing several problems at once",
        _compound,
    ),
)


def category(name: str) -> EdgeCase:
    for case in TAXONOMY:
        if case.name == name:
            return case
    raise KeyError(f"Unknown edge-case category {name!r}")
