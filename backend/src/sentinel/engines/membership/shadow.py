"""Shadow model ensemble for calibrating the membership-inference null (M1).

Threat model, following Shokri et al. (2017): the auditor is assumed to know the
target's *domain* and *model family* -- public facts, or inferable from an RTI
disclosure -- but never its training data. Each shadow is therefore trained on a
freshly generated dataset with a different seed and no canaries.

The consequence that makes offline LiRA work: no shadow has ever seen any record
we will later query, so every shadow is an OUT-model for every such record. The
distribution of shadow confidences on a record is exactly the null hypothesis
"this record was not memorized."
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

import numpy as np

from sentinel.cache import cache_key, cached_artifact
from sentinel.config import get_settings
from sentinel.data.welfare import generate_welfare_dataset

if TYPE_CHECKING:
    from sklearn.ensemble import RandomForestClassifier

# Deferred for the same reason as in target/system.py: scikit-learn costs ~4s to
# import and is only needed to *train* shadows. Loading a cached ensemble --
# which is what every run after the first does -- needs it only for unpickling,
# which imports it on demand.


@dataclass(frozen=True)
class ShadowEnsemble:
    """Reference models standing in for "a model like the target, without this record"."""

    models: list[RandomForestClassifier]
    feature_names: list[str]

    def __len__(self) -> int:
        return len(self.models)

    def confidence_matrix(self, records: np.ndarray, labels: np.ndarray) -> np.ndarray:
        """Per-shadow probability of each record's true label.

        Returns shape (n_shadows, n_records). Batched deliberately: a per-record
        loop over a 180-tree forest is dominated by per-call overhead.
        """
        records = np.atleast_2d(records)
        labels = np.asarray(labels, dtype=int)
        out = np.empty((len(self.models), len(records)), dtype=float)
        row_index = np.arange(len(records))

        self._ensure_serial_prediction()
        for i, model in enumerate(self.models):
            out[i] = model.predict_proba(records)[row_index, labels]
        return out

    def _ensure_serial_prediction(self) -> None:
        """Force single-threaded prediction across the ensemble.

        The shadows are trained with n_jobs=-1, which is right for fitting but
        wrong for the tiny batches audits actually predict on: joblib's
        thread-pool setup costs more per call than the parallelism saves, and it
        is paid once per shadow. Measured on this ensemble, predicting 20 rows
        took 0.81s with n_jobs=-1 and 0.35s with n_jobs=1.

        Applied here rather than at training time so ensembles already cached to
        disk get the benefit without a retrain.
        """
        for model in self.models:
            if getattr(model, "n_jobs", 1) != 1:
                model.n_jobs = 1


def _train_one_shadow(seed: int, n_train: int) -> RandomForestClassifier:
    """Train a single shadow on its own freshly drawn population.

    Hyperparameters mirror ``train_target_system``. They must match: the null
    distribution is meant to answer "what confidence would a model *like this
    one* show on an unseen record", and a differently-regularized shadow would
    answer a different question.
    """
    from sklearn.ensemble import RandomForestClassifier

    dataset = generate_welfare_dataset(
        n_train=n_train, n_test=10, n_canaries=0, seed=seed
    )
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
    return model


def train_shadow_ensemble(
    n_shadows: int | None = None,
    n_train: int | None = None,
    base_seed: int = 770001,
    refresh: bool = False,
) -> ShadowEnsemble:
    """Train (or load) the shadow ensemble.

    Seeds are offset far from the target's own seed (20260811) so no shadow can
    accidentally reproduce the target's training population -- which would
    contaminate the null with genuine member records.
    """
    settings = get_settings()
    n_shadows = n_shadows if n_shadows is not None else settings.shadow_count
    n_train = n_train if n_train is not None else settings.shadow_train_size

    from sentinel.data.welfare import FEATURE_NAMES

    key = cache_key(kind="shadows", n=n_shadows, size=n_train, seed=base_seed, v=1)

    def build() -> ShadowEnsemble:
        models = [_train_one_shadow(base_seed + i, n_train) for i in range(n_shadows)]
        return ShadowEnsemble(models=models, feature_names=list(FEATURE_NAMES))

    return cached_artifact("shadows", key, build, refresh=refresh)
