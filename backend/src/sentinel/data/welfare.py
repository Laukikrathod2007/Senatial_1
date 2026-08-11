"""Synthetic welfare-eligibility dataset.

Stands in for a real government eligibility system's training data. The feature
structure mirrors what Indian welfare/subsidy scoring actually keys on (income,
household size, land holding, Aadhaar seeding status, documentation completeness)
so that audit findings read as plausible to a domain reviewer, per PRD §8's note
that demo fidelity is the main credibility risk.

Nothing here is real citizen data and none of it is derived from any real record.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

# Ordered feature contract. Every engine and the target model rely on this order,
# so it is defined once here and imported everywhere else.
FEATURE_NAMES: list[str] = [
    "monthly_income",  # INR, log-normal-ish, informal work makes this volatile
    "household_size",  # count of dependents in the ration card
    "land_holding_acres",  # 0 for landless / urban applicants
    "years_at_address",  # low for migrant workers
    "aadhaar_seeded",  # 1 if bank account is Aadhaar-linked
    "documents_complete",  # 1 if the submitted document set has no gaps
    "prior_scheme_count",  # how many other schemes the applicant is enrolled in
    "age",
]

# Applicant-facing labels, used by the plain-language report layer so a citizen
# reads "monthly income" rather than a column name.
FEATURE_LABELS: dict[str, str] = {
    "monthly_income": "monthly income",
    "household_size": "household size",
    "land_holding_acres": "land holding",
    "years_at_address": "years at current address",
    "aadhaar_seeded": "Aadhaar-bank linking status",
    "documents_complete": "completeness of submitted documents",
    "prior_scheme_count": "number of other schemes enrolled in",
    "age": "age",
}


@dataclass
class WelfareDataset:
    """A split synthetic dataset plus the canary records planted inside it.

    ``canary_indices`` point into the *training* arrays. These are the rare,
    outlier records M1 is expected to detect as memorized -- they are the ground
    truth the membership-inference engine is validated against (docs §7.2).
    """

    x_train: np.ndarray
    y_train: np.ndarray
    x_test: np.ndarray
    y_test: np.ndarray
    canary_indices: np.ndarray
    feature_names: list[str]

    def train_frame(self):
        """The training split as a DataFrame, for interactive inspection.

        pandas is imported here rather than at module scope because it costs
        ~1s to import and nothing on the audit path uses it. That second was
        being paid on every CLI invocation and every API startup for a
        convenience method used only in a notebook.
        """
        import pandas as pd

        frame = pd.DataFrame(self.x_train, columns=self.feature_names)
        frame["eligible"] = self.y_train
        return frame

    def canaries(self) -> np.ndarray:
        """The planted outlier records, as a feature matrix."""
        return self.x_train[self.canary_indices]


def _eligibility_rule(x: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """Ground-truth eligibility, as a noisy means-test.

    Deliberately *not* a clean linear boundary: real eligibility rules combine a
    means test with documentation gates, and the interaction is where silent
    failures live. The label noise keeps the target model from being perfectly
    separable, which would make membership inference trivially easy and the
    demo unrealistic.
    """
    income = x[:, FEATURE_NAMES.index("monthly_income")]
    household = x[:, FEATURE_NAMES.index("household_size")]
    land = x[:, FEATURE_NAMES.index("land_holding_acres")]
    seeded = x[:, FEATURE_NAMES.index("aadhaar_seeded")]
    documents = x[:, FEATURE_NAMES.index("documents_complete")]

    # Per-capita income is the real means test.
    per_capita = income / np.maximum(household, 1)

    # Intercept is tuned so the eligible rate lands near 55-60%. A near-universal
    # approval rate would make both accuracy and disparity metrics meaningless.
    score = (
        2.2 * (per_capita < 3500).astype(float)
        + 0.9 * (land < 2.0).astype(float)
        + 0.8 * seeded
        + 1.1 * documents
        - 3.4
    )
    probability = 1.0 / (1.0 + np.exp(-score))
    return (rng.random(len(x)) < probability).astype(int)


def _sample_applicants(n: int, rng: np.random.Generator) -> np.ndarray:
    """Draw a population of ordinary applicants."""
    monthly_income = rng.lognormal(mean=9.1, sigma=0.75, size=n)
    household_size = np.clip(rng.poisson(4.2, size=n), 1, 14)
    # Most applicants are landless or near-landless; a long tail holds land.
    land_holding = np.where(
        rng.random(n) < 0.55, 0.0, np.abs(rng.exponential(1.8, size=n))
    )
    years_at_address = np.clip(rng.exponential(7.0, size=n), 0, 60)
    aadhaar_seeded = (rng.random(n) < 0.82).astype(float)
    documents_complete = (rng.random(n) < 0.74).astype(float)
    prior_scheme_count = np.clip(rng.poisson(1.3, size=n), 0, 8)
    age = np.clip(rng.normal(43, 15, size=n), 18, 99)

    return np.column_stack(
        [
            monthly_income,
            household_size,
            land_holding,
            years_at_address,
            aadhaar_seeded,
            documents_complete,
            prior_scheme_count,
            age,
        ]
    )


def _sample_canaries(n: int, rng: np.random.Generator) -> np.ndarray:
    """Draw rare outlier records.

    These sit far out in the tails on several features at once. Models memorize
    such records instead of generalizing from them (PRD §4.1) precisely because
    there is nothing else nearby to generalize against -- which is what makes
    them the right ground truth for validating M1.
    """
    monthly_income = rng.uniform(140_000, 320_000, size=n)  # far above the tail
    household_size = rng.integers(11, 15, size=n).astype(float)
    land_holding = rng.uniform(18.0, 40.0, size=n)
    years_at_address = rng.uniform(45, 60, size=n)
    aadhaar_seeded = np.zeros(n)
    documents_complete = np.zeros(n)
    prior_scheme_count = rng.integers(6, 9, size=n).astype(float)
    age = rng.uniform(92, 99, size=n)

    return np.column_stack(
        [
            monthly_income,
            household_size,
            land_holding,
            years_at_address,
            aadhaar_seeded,
            documents_complete,
            prior_scheme_count,
            age,
        ]
    )


def generate_welfare_dataset(
    n_train: int = 4000,
    n_test: int = 2000,
    n_canaries: int = 25,
    seed: int = 20260811,
) -> WelfareDataset:
    """Generate the synthetic welfare-eligibility dataset.

    The test split is drawn from the same ordinary-applicant distribution but is
    never seen by the target model, giving M1 a genuine non-member population to
    score against.
    """
    rng = np.random.default_rng(seed)

    ordinary_train = _sample_applicants(n_train, rng)
    canaries = _sample_canaries(n_canaries, rng)
    x_train = np.vstack([ordinary_train, canaries])
    y_train = _eligibility_rule(x_train, rng)

    # Canaries occupy the final rows; record their positions before any shuffle.
    canary_indices = np.arange(n_train, n_train + n_canaries)

    # Shuffle so canaries are not positionally distinguishable during training,
    # tracking where each canary lands.
    permutation = rng.permutation(len(x_train))
    x_train = x_train[permutation]
    y_train = y_train[permutation]
    # inverse[old_position] -> new position
    inverse = np.empty_like(permutation)
    inverse[permutation] = np.arange(len(permutation))
    canary_indices = inverse[canary_indices]

    x_test = _sample_applicants(n_test, rng)
    y_test = _eligibility_rule(x_test, rng)

    return WelfareDataset(
        x_train=x_train,
        y_train=y_train,
        x_test=x_test,
        y_test=y_test,
        canary_indices=canary_indices,
        feature_names=list(FEATURE_NAMES),
    )
