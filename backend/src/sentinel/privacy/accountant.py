"""Renyi Differential Privacy accountant (M5).

Docs §3.4 trap #2: privacy budget accounting must use proper composition, not
naive linear eps-summation. Adding eps per query is not merely pessimistic -- it
misstates the guarantee, and a tool that overstates how much privacy it has
spent will refuse legitimate audits while claiming rigor it did not apply.

RDP is used because it composes *additively in alpha-space*: running k queries adds
k times the per-query RDP at each alpha, and only at the end is that converted to
(eps, δ)-DP by minimizing over alpha. That conversion is where the saving comes from --
the sub-linear growth is real, not an approximation.

Implemented directly rather than via Opacus. Opacus is a PyTorch DP-SGD training
library; nothing here trains with DP, and importing it would pull in all of
PyTorch to reach one accountant class.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np

# Renyi orders to track. Spanning small (tight at low eps) through large (tight at
# high eps) means the alpha-minimization has a good candidate wherever the budget
# lands. Values below 1 are excluded: RDP is undefined at alpha <= 1.
ALPHAS: tuple[float, ...] = (
    1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0,
    12.0, 16.0, 24.0, 32.0, 48.0, 64.0, 128.0, 256.0,
)


@dataclass
class RDPAccountant:
    """Tracks cumulative privacy loss across repeated queries to one target."""

    alphas: tuple[float, ...] = ALPHAS
    rdp: np.ndarray = field(
        default_factory=lambda: np.zeros(len(ALPHAS), dtype=float)
    )

    def compose_gaussian(
        self, noise_multiplier: float, queries: int = 1, sensitivity: float = 1.0
    ) -> None:
        """Account for ``queries`` Gaussian-mechanism releases.

        The Gaussian mechanism satisfies (alpha, alpha·Δ²/(2σ²))-RDP. Composition is
        addition at each alpha -- that is the entire reason this representation is
        worth the extra machinery.
        """
        if noise_multiplier <= 0:
            raise ValueError("noise_multiplier must be positive")
        if queries < 0:
            raise ValueError("queries cannot be negative")

        per_query = (
            np.asarray(self.alphas, dtype=float)
            * sensitivity**2
            / (2.0 * noise_multiplier**2)
        )
        self.rdp = self.rdp + queries * per_query

    def epsilon(self, delta: float = 1e-5) -> float:
        """Convert accumulated RDP to (eps, δ)-DP.

        Uses the tightened conversion of Balle et al. / Canonne et al.:

            eps = min_alpha [ RDP(alpha) + log1p(-1/alpha) - (log δ + log alpha)/(alpha - 1) ]

        rather than the looser classical ``RDP(alpha) + log(1/δ)/(alpha-1)``. The extra
        terms matter at the budgets this tool operates in; using the loose form
        would systematically overstate spend and deny audits that are in fact
        within budget.
        """
        if not 0 < delta < 1:
            raise ValueError("delta must lie in (0, 1)")

        alphas = np.asarray(self.alphas, dtype=float)
        epsilons = (
            self.rdp
            + np.log1p(-1.0 / alphas)
            - (math.log(delta) + np.log(alphas)) / (alphas - 1.0)
        )
        return float(max(np.min(epsilons), 0.0))

    def optimal_alpha(self, delta: float = 1e-5) -> float:
        """The Renyi order currently giving the tightest eps -- useful for reports."""
        alphas = np.asarray(self.alphas, dtype=float)
        epsilons = (
            self.rdp
            + np.log1p(-1.0 / alphas)
            - (math.log(delta) + np.log(alphas)) / (alphas - 1.0)
        )
        return float(alphas[int(np.argmin(epsilons))])

    def copy(self) -> "RDPAccountant":
        return RDPAccountant(alphas=self.alphas, rdp=self.rdp.copy())

    def projected(
        self, noise_multiplier: float, queries: int, sensitivity: float = 1.0
    ) -> float:
        """eps if ``queries`` more were spent -- without mutating this accountant.

        The preflight check needs to know the cost of a plan before committing
        to it, so that an over-budget audit is refused rather than half-run.
        """
        trial = self.copy()
        trial.compose_gaussian(noise_multiplier, queries, sensitivity)
        return trial.epsilon()

    def to_dict(self, delta: float = 1e-5) -> dict[str, object]:
        return {
            "epsilon": round(self.epsilon(delta), 4),
            "delta": delta,
            "optimal_alpha": self.optimal_alpha(delta),
            "composition": "Renyi DP (additive in alpha), converted via "
            "alpha-minimization -- not linear eps-summation",
        }


def naive_linear_epsilon(
    noise_multiplier: float, queries: int, delta: float = 1e-5, sensitivity: float = 1.0
) -> float:
    """eps under naive linear summation -- the mistake trap #2 warns against.

    Exists so the demo and tests can show the gap side by side. Never used to
    make a budget decision.
    """
    single = RDPAccountant()
    single.compose_gaussian(noise_multiplier, 1, sensitivity)
    return single.epsilon(delta) * queries
