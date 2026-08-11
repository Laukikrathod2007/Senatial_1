"""The stand-in "government welfare eligibility system" under audit.

Per docs §4.3 this is explicitly a locally-trained substitute for a real
government system, not a real one. What is realistic is its *architecture*:

  1. A classifier that actually decides eligibility.
  2. A separate, rule-based explanation generator that never reads the
     classifier.

That separation is the whole point. It reproduces "explainability theater"
(PRD §4.3) structurally rather than by faking a mismatch: the stated reason is
produced by different logic than the decision, so the two can silently diverge
exactly as they do in deployed systems that bolt a reason-generator onto a model.

SENTINEL treats this object as a black box: engines may call ``predict``,
``predict_proba`` and ``decide`` only. They never read ``_model`` or any
training data, because a real auditor could not (PRD §4.1 constraint).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

import numpy as np

from sentinel.data.welfare import FEATURE_LABELS, FEATURE_NAMES, WelfareDataset

if TYPE_CHECKING:
    from sklearn.ensemble import RandomForestClassifier

# scikit-learn costs ~4s to import and is only needed to *train* a model.
# Loading a cached target, verifying the ledger, or listing reports needs none
# of it, so the import is deferred into train_target_system(). Annotations are
# strings here (`from __future__ import annotations`), so the type reference
# above costs nothing at runtime.


@dataclass(frozen=True)
class Decision:
    """A single citizen-facing decision, as the target system would emit it."""

    eligible: bool
    confidence: float
    stated_reason_feature: str
    stated_reason_text: str


class TargetSystem:
    """Black-box interface to the system under audit.

    Every method here is something an outside auditor could reach through a
    public API or an RTI-disclosed sample decision set.
    """

    def __init__(
        self, model: RandomForestClassifier, feature_names: list[str]
    ) -> None:
        self._model = model
        self.feature_names = feature_names
        self.query_count = 0

    # -- black-box surface -------------------------------------------------

    def predict_proba(self, x: np.ndarray) -> np.ndarray:
        """Class probabilities. The only confidence signal M1 gets."""
        x = np.atleast_2d(x)
        self.query_count += len(x)
        return self._model.predict_proba(x)

    def predict(self, x: np.ndarray) -> np.ndarray:
        return (self.predict_proba(x)[:, 1] >= 0.5).astype(int)

    def decide(self, record: np.ndarray) -> Decision:
        """Full decision for one applicant, including its stated reason."""
        record = np.asarray(record, dtype=float).ravel()
        probability = float(self.predict_proba(record)[0, 1])
        eligible = probability >= 0.5
        feature, text = self._explain(record, eligible)
        return Decision(
            eligible=eligible,
            confidence=probability if eligible else 1.0 - probability,
            stated_reason_feature=feature,
            stated_reason_text=text,
        )

    # -- the bolted-on explanation generator -------------------------------

    def _explain(self, record: np.ndarray, eligible: bool) -> tuple[str, str]:
        """Produce a stated reason WITHOUT consulting the classifier.

        This is the deliberate architectural flaw described in the module
        docstring. It walks a fixed priority order of plausible-sounding rules
        and returns the first that matches, which is how hand-written reason
        generators are typically built. Because the classifier weighs features
        differently (and non-linearly), the reason it returns is frequently not
        the feature actually driving the decision.
        """
        if eligible:
            return (
                "documents_complete",
                "Your application met the eligibility criteria for this scheme.",
            )

        values = dict(zip(self.feature_names, record, strict=True))
        per_capita = values["monthly_income"] / max(values["household_size"], 1)

        # Priority-ordered rejection rules. Income is checked first because it
        # is the most defensible-sounding reason to give a rejected applicant --
        # which is precisely why a reason-generator author would put it first,
        # and precisely why it is the one most likely to be stated falsely.
        if per_capita >= 3500:
            return (
                "monthly_income",
                "Your household income exceeds the limit set for this scheme.",
            )
        if values["land_holding_acres"] >= 2.0:
            return (
                "land_holding_acres",
                "Your recorded land holding exceeds the limit for this scheme.",
            )
        if values["aadhaar_seeded"] < 0.5:
            return (
                "aadhaar_seeded",
                "Your bank account is not linked to your Aadhaar number.",
            )
        if values["documents_complete"] < 0.5:
            return (
                "documents_complete",
                "Your submitted documents were incomplete.",
            )
        return (
            "prior_scheme_count",
            "You are already enrolled in the maximum number of schemes allowed.",
        )

    def stated_reason_for(self, record: np.ndarray) -> str:
        """The feature this system would blame for rejecting ``record``.

        Part of the black-box surface: a real system publishes its rejection
        reason to the applicant, so an auditor can read it without privileged
        access. Costs no model query, because the explanation generator does not
        consult the classifier -- the architectural flaw M2 exists to detect.
        """
        record = np.asarray(record, dtype=float).ravel()
        feature, _ = self._explain(record, eligible=False)
        return feature

    def plain_language_reason(self, decision: Decision) -> str:
        label = FEATURE_LABELS.get(
            decision.stated_reason_feature, decision.stated_reason_feature
        )
        return f"{decision.stated_reason_text} (stated basis: {label})"


def train_target_system(
    dataset: WelfareDataset,
    seed: int = 20260811,
) -> TargetSystem:
    """Train the stand-in classifier.

    Hyperparameters are chosen to *overfit deliberately* (deep trees, no leaf-size
    floor). Docs §7.2 calls for exactly this: a model that memorizes its planted
    canary records, so M1 can be validated against known ground truth rather than
    against a guess. A production audit target would be less overfit -- and M1's
    scores against it would correctly come out lower.
    """
    from sklearn.ensemble import RandomForestClassifier

    # bootstrap=True matters and is not the obvious choice: with bootstrap=False
    # every tree sees every record, the forest memorizes the whole training set
    # uniformly, and member confidence saturates at 1.0 for canaries and ordinary
    # records alike -- erasing the very differential M1 measures. Bagging leaves
    # each record out of ~37% of trees, so only records the model cannot
    # generalize to (the canaries) stay confidently fitted. That differential is
    # the signal.
    model = RandomForestClassifier(
        n_estimators=180,
        max_depth=None,
        min_samples_leaf=1,
        min_samples_split=2,
        bootstrap=True,
        random_state=seed,
        n_jobs=-1,
    )
    model.fit(dataset.x_train, dataset.y_train)
    return TargetSystem(model=model, feature_names=list(FEATURE_NAMES))
