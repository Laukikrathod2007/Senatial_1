"""M5: Differential-Privacy Query-Budget Guardian.

Two jobs:

1. **Preflight.** Refuse an audit whose projected privacy cost would exceed the
   requester's budget -- *before* any probe is sent, so a denied audit leaks
   nothing (docs §3.3 step 3).
2. **Privatize.** Add calibrated noise to aggregate statistics before release.

Noise is applied to aggregates only, never to per-record leakage scores. PRD §4.4
says to noise "final report output", but applied per-record that destroys the
finding it is meant to protect -- and is incoherent besides, since a per-record
score is *about* one individual by construction. Privacy for that record comes
from access control (M4) and the query budget here, not from noise.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sqlalchemy import Float, Integer, String, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from sentinel.config import get_settings
from sentinel.ledger.models import Base
from sentinel.privacy.accountant import RDPAccountant, naive_linear_epsilon
from sentinel.privacy.mechanisms import privatize_count, privatize_rate


class PrivacyBudgetRow(Base):
    """Cumulative privacy spend against one target.

    Persisted so the budget survives restarts. A guardian that forgot its spend
    on every process restart would let an attacker reset it by crashing the
    service -- the budget has to outlive the process to mean anything.
    """

    __tablename__ = "privacy_budget"

    target_id: Mapped[str] = mapped_column(String(128), primary_key=True)
    queries_spent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rdp_json: Mapped[str] = mapped_column(String, nullable=False, default="[]")
    epsilon_spent: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)


@dataclass(frozen=True)
class BudgetDecision:
    """Outcome of a preflight check."""

    allowed: bool
    projected_epsilon: float
    current_epsilon: float
    max_epsilon: float
    planned_queries: int
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "allowed": self.allowed,
            "current_epsilon": round(self.current_epsilon, 4),
            "projected_epsilon": round(self.projected_epsilon, 4),
            "max_epsilon": self.max_epsilon,
            "planned_queries": self.planned_queries,
            "reason": self.reason,
        }


class BudgetGuardian:
    """Tracks and enforces cumulative privacy loss per target."""

    def __init__(
        self,
        session: Session,
        noise_multiplier: float | None = None,
        delta: float | None = None,
    ) -> None:
        settings = get_settings()
        self.session = session
        self.noise_multiplier = noise_multiplier or settings.dp_noise_multiplier
        self.delta = delta or settings.dp_delta

    # -- budget state ------------------------------------------------------

    def _row(self, target_id: str) -> PrivacyBudgetRow:
        row = self.session.get(PrivacyBudgetRow, target_id)
        if row is None:
            row = PrivacyBudgetRow(target_id=target_id, queries_spent=0)
            self.session.add(row)
            self.session.commit()
        return row

    def accountant_for(self, target_id: str) -> RDPAccountant:
        """Rebuild the accountant from persisted spend."""
        row = self._row(target_id)
        accountant = RDPAccountant()
        if row.queries_spent:
            accountant.compose_gaussian(self.noise_multiplier, row.queries_spent)
        return accountant

    def spent(self, target_id: str) -> float:
        return self.accountant_for(target_id).epsilon(self.delta)

    # -- enforcement -------------------------------------------------------

    def preflight(
        self, target_id: str, planned_queries: int, max_epsilon: float
    ) -> BudgetDecision:
        """Decide whether an audit may proceed, before any probe is sent."""
        accountant = self.accountant_for(target_id)
        current = accountant.epsilon(self.delta)
        projected = accountant.projected(self.noise_multiplier, planned_queries)

        if projected > max_epsilon:
            return BudgetDecision(
                allowed=False,
                projected_epsilon=projected,
                current_epsilon=current,
                max_epsilon=max_epsilon,
                planned_queries=planned_queries,
                reason=(
                    f"This audit would raise cumulative privacy loss to "
                    f"eps={projected:.2f}, beyond the eps={max_epsilon:.2f} allowed "
                    f"for this role. Further probing of this system is refused."
                ),
            )

        return BudgetDecision(
            allowed=True,
            projected_epsilon=projected,
            current_epsilon=current,
            max_epsilon=max_epsilon,
            planned_queries=planned_queries,
            reason=f"Within budget (eps={projected:.2f} of {max_epsilon:.2f}).",
        )

    def record_spend(self, target_id: str, queries: int) -> float:
        """Commit spend after an audit has run. Returns the new cumulative eps."""
        row = self._row(target_id)
        row.queries_spent += queries
        accountant = RDPAccountant()
        accountant.compose_gaussian(self.noise_multiplier, row.queries_spent)
        row.epsilon_spent = accountant.epsilon(self.delta)
        self.session.commit()
        return row.epsilon_spent

    # -- release -----------------------------------------------------------

    def privatize_explainability(
        self, report: dict[str, Any], epsilon: float = 1.0, seed: int = 0
    ) -> dict[str, Any]:
        """Noise an explainability report's aggregate rates.

        The privacy budget is split evenly across the released statistics, since
        each is a separate release over the same underlying individuals.
        """
        rng = np.random.default_rng(seed)
        private = dict(report)
        per_feature = report.get("per_feature", [])
        # +1 for the overall rate released alongside the per-feature ones.
        share = epsilon / max(len(per_feature) + 1, 1)

        private["overall_mismatch_rate"] = round(
            privatize_rate(
                report["overall_mismatch_rate"], report["cases_tested"], share, rng
            ),
            4,
        )
        private["per_feature"] = [
            {
                **feature,
                "mismatch_rate": round(
                    privatize_rate(
                        feature["mismatch_rate"], feature["cases_tested"], share, rng
                    ),
                    4,
                ),
                "cases_tested": int(
                    round(privatize_count(feature["cases_tested"], share, rng))
                ),
            }
            for feature in per_feature
        ]
        private["privacy"] = {
            "mechanism": "Laplace, applied to aggregate statistics only",
            "epsilon": epsilon,
            "note": "Per-record scores are not noised -- noise cannot protect a "
            "statistic that is about one individual by construction. Those are "
            "protected by access control (M4) and the query budget (M5).",
        }
        return private

    def status(self, target_id: str, max_epsilon: float) -> dict[str, Any]:
        """Budget status, with the naive comparison for reporting."""
        row = self._row(target_id)
        accountant = self.accountant_for(target_id)
        epsilon = accountant.epsilon(self.delta)
        naive = naive_linear_epsilon(
            self.noise_multiplier, row.queries_spent, self.delta
        )
        return {
            "target_id": target_id,
            "queries_spent": row.queries_spent,
            "epsilon_spent": round(epsilon, 4),
            "max_epsilon": max_epsilon,
            "remaining_fraction": round(max(0.0, 1 - epsilon / max_epsilon), 4),
            "optimal_alpha": accountant.optimal_alpha(self.delta),
            "naive_linear_epsilon": round(naive, 4),
            "composition_saving": (
                f"{naive / epsilon:.1f}x" if epsilon > 0 else "n/a"
            ),
            "note": "Naive linear eps-summation would report the larger figure and "
            "deny audits that are in fact within budget (docs §3.4).",
        }
