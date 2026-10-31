"""Bounded HTTP client for the explicitly configured local demo target."""

from __future__ import annotations

import ipaddress
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Callable
from urllib.parse import urlsplit

import httpx
import numpy as np
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from sentinel.data.welfare import FEATURE_NAMES
from sentinel.target.registry import DEMO_TARGET_ID, PredictionBatch

MAX_RESPONSE_BYTES = 4096


class DecisionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model_id: str = Field(min_length=1, max_length=100)
    model_version: str = Field(min_length=1, max_length=100)
    decision: str = Field(pattern="^(eligible|ineligible)$")
    probability_eligible: float = Field(ge=0.0, le=1.0, allow_inf_nan=False)
    reason: str | None = Field(default=None, max_length=256)


def validate_loopback_base_url(value: str) -> str:
    """Reject URLs that could turn this client into an SSRF primitive."""
    parsed = urlsplit(value)
    if (
        parsed.scheme != "http"
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or parsed.path not in ("", "/")
        or not parsed.hostname
    ):
        raise ValueError("HTTP demo target must be a plain loopback HTTP URL")
    try:
        address = ipaddress.ip_address(parsed.hostname)
    except ValueError as exc:
        raise ValueError("HTTP demo target must use a numeric loopback address") from exc
    if not address.is_loopback or address.version != 4:
        raise ValueError("HTTP demo target must use an IPv4 loopback address")
    if parsed.port is None or not (1 <= parsed.port <= 65535):
        raise ValueError("HTTP demo target must specify a valid port")
    return f"http://{address.compressed}:{parsed.port}"


class HTTPDecisionTarget:
    """Query a fixed local HTTP contract; never loads or calls the target model."""

    def __init__(
        self,
        base_url: str,
        *,
        timeout_seconds: float = 2.0,
        concurrency: int = 16,
        max_probes: int = 20_000,
        transport: httpx.BaseTransport | None = None,
        progress_callback: Callable[[int, int, int], None] | None = None,
    ) -> None:
        self.base_url = validate_loopback_base_url(base_url)
        if not 0 < timeout_seconds <= 10:
            raise ValueError("HTTP demo timeout must be between 0 and 10 seconds")
        if not 1 <= concurrency <= 32:
            raise ValueError("HTTP demo concurrency must be between 1 and 32")
        if not 1 <= max_probes <= 20_000:
            raise ValueError("HTTP demo probe limit must be between 1 and 20000")
        self.timeout_seconds = timeout_seconds
        self.concurrency = concurrency
        self.max_probes = max_probes
        self.transport = transport
        self.progress_callback = progress_callback
        self._attempted = 0
        self.model_id: str | None = None
        self.model_version: str | None = None

    def query_batch(self, records: np.ndarray) -> PredictionBatch:
        rows = np.atleast_2d(np.asarray(records, dtype=float))
        if rows.ndim != 2 or rows.shape[1] != len(FEATURE_NAMES):
            raise ValueError(f"Expected records with {len(FEATURE_NAMES)} features")
        if not np.isfinite(rows).all():
            raise ValueError("All target features must be finite numbers")
        remaining = max(0, self.max_probes - self._attempted)
        allowed = min(len(rows), remaining)
        self._attempted += allowed
        probabilities = np.full((len(rows), 2), np.nan, dtype=float)
        succeeded = np.zeros(len(rows), dtype=bool)
        failures: dict[str, int] = {}

        limits = httpx.Limits(
            max_connections=self.concurrency,
            max_keepalive_connections=self.concurrency,
        )
        timeout = httpx.Timeout(self.timeout_seconds)
        with httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            limits=limits,
            follow_redirects=False,
            transport=self.transport,
            trust_env=False,
        ) as client:

            def one(index: int) -> tuple[int, DecisionResponse | None, str | None]:
                payload = {
                    "features": {
                        name: float(value)
                        for name, value in zip(FEATURE_NAMES, rows[index], strict=True)
                    }
                }
                if len(json.dumps(payload, separators=(",", ":"))) > 8192:
                    return index, None, "invalid_request"
                try:
                    with client.stream("POST", "/api/v1/decide", json=payload) as response:
                        if response.status_code != 200:
                            return index, None, "non_success_http"
                        raw = bytearray()
                        for chunk in response.iter_bytes(chunk_size=1024):
                            raw.extend(chunk)
                            if len(raw) > MAX_RESPONSE_BYTES:
                                return index, None, "response_too_large"
                    try:
                        parsed: Any = json.loads(raw)
                        decision = DecisionResponse.model_validate(parsed)
                    except (json.JSONDecodeError, ValidationError, UnicodeDecodeError):
                        return index, None, "invalid_response"
                    if (decision.probability_eligible >= 0.5) != (
                        decision.decision == "eligible"
                    ):
                        return index, None, "invalid_response"
                    if decision.model_id != DEMO_TARGET_ID:
                        return index, None, "unexpected_target"
                    return index, decision, None
                except httpx.TimeoutException:
                    return index, None, "timeout"
                except httpx.ConnectError:
                    return index, None, "connection_error"
                except httpx.RequestError:
                    return index, None, "request_error"

            with ThreadPoolExecutor(max_workers=self.concurrency) as executor:
                futures = [executor.submit(one, index) for index in range(allowed)]
                results = []
                for future in as_completed(futures):
                    item = future.result()
                    results.append(item)
                    if self.progress_callback is not None:
                        self.progress_callback(1, int(item[1] is not None and item[2] is None), int(item[2] is not None))

        observed = {
            (decision.model_id, decision.model_version)
            for _, decision, failure in results
            if decision is not None and failure is None
        }
        if observed and (
            len(observed) != 1
            or next(iter(observed))[0] != DEMO_TARGET_ID
            or (self.model_id is not None and observed != {(self.model_id, self.model_version)})
        ):
            results = [(i, None, "inconsistent_target_metadata") if decision is not None and failure is None else (i, decision, failure)
                       for i, decision, failure in results]
            observed = set()
        if observed:
            self.model_id, self.model_version = next(iter(observed))
        for index, score, failure in results:
            if failure:
                failures[failure] = failures.get(failure, 0) + 1
            elif score is not None:
                probabilities[index] = (1.0 - score.probability_eligible, score.probability_eligible)
                succeeded[index] = True

        return PredictionBatch(
            probabilities=probabilities,
            succeeded=succeeded,
            attempted=allowed,
            completed=int(succeeded.sum()),
            failures=failures,
            model_id=self.model_id,
            model_version=self.model_version,
        )
