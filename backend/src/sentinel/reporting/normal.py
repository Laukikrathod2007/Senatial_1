"""Standard-normal CDF, survival function, and quantile.

These are the only distribution functions SENTINEL needs -- M1's z-scores, the
red-team's two-proportion test, and Wilson intervals all use nothing else.
``scipy.stats`` provides them but costs ~1.6s to import, which was the single
largest component of CLI and API startup. The closed forms below are exact to
double precision and import instantly.

``numpy`` is already a hard dependency (the engines are array code throughout),
so vectorised inputs stay supported.
"""

from __future__ import annotations

import math

import numpy as np

_SQRT2 = math.sqrt(2.0)


def norm_cdf(x: float | np.ndarray) -> np.ndarray:
    """P(Z <= x) for a standard normal."""
    return 0.5 * (1.0 + _erf(np.asarray(x, dtype=float) / _SQRT2))


def norm_sf(x: float | np.ndarray) -> np.ndarray:
    """P(Z > x), the survival function.

    Computed via erfc rather than ``1 - cdf``: in the far upper tail the
    subtraction cancels to zero, which would report p = 0.0 for exactly the
    strongly-memorized records M1 exists to find.
    """
    return 0.5 * _erfc(np.asarray(x, dtype=float) / _SQRT2)


def norm_ppf(p: float) -> float:
    """The inverse CDF (quantile function).

    Acklam's rational approximation refined by one Halley step, giving full
    double precision. Only ever called with fixed confidence levels (0.975 for
    a 95% interval), so a scalar implementation is sufficient.
    """
    if not 0.0 < p < 1.0:
        raise ValueError("p must lie strictly between 0 and 1")

    # Coefficients for Acklam's algorithm.
    a = (
        -3.969683028665376e01, 2.209460984245205e02, -2.759285104469687e02,
        1.383577518672690e02, -3.066479806614716e01, 2.506628277459239e00,
    )
    b = (
        -5.447609879822406e01, 1.615858368580409e02, -1.556989798598866e02,
        6.680131188771972e01, -1.328068155288572e01,
    )
    c = (
        -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e00,
        -2.549732539343734e00, 4.374664141464968e00, 2.938163982698783e00,
    )
    d = (
        7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e00,
        3.754408661907416e00,
    )

    p_low, p_high = 0.02425, 1.0 - 0.02425

    if p < p_low:
        q = math.sqrt(-2.0 * math.log(p))
        x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0
        )
    elif p <= p_high:
        q = p - 0.5
        r = q * q
        x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (
            ((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1.0
        )
    else:
        q = math.sqrt(-2.0 * math.log(1.0 - p))
        x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / (
            (((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1.0
        )

    # One Halley refinement takes the ~1e-9 approximation to machine precision.
    error = 0.5 * math.erfc(-x / _SQRT2) - p
    correction = error * math.sqrt(2.0 * math.pi) * math.exp(x * x / 2.0)
    return x - correction / (1.0 + x * correction / 2.0)


# math.erf/erfc are scalar-only; vectorize once at import rather than per call.
_erf = np.vectorize(math.erf, otypes=[float])
_erfc = np.vectorize(math.erfc, otypes=[float])
