"""Contract and black-box integration tests for the local HTTP decision target."""

from __future__ import annotations

import json
import time
from threading import Lock

import httpx
import numpy as np
import pytest

from sentinel.data.welfare import FEATURE_NAMES
from sentinel.engines.redteam import RedTeamEngine, category
from sentinel.target.http import HTTPDecisionTarget, validate_loopback_base_url


def _transport(handler):
    def dispatch(request):
        result = handler(json.loads(request.content))
        if isinstance(result, httpx.Response):
            return httpx.Response(result.status_code, headers=result.headers, content=result.content, request=request)
        return httpx.Response(200, json=result, request=request)

    return httpx.MockTransport(dispatch)


def _error_transport(error_type):
    def dispatch(request):
        raise error_type("private transport detail", request=request)
    return httpx.MockTransport(dispatch)


def _success(payload):
    score = 0.8 if payload["features"]["aadhaar_seeded"] >= 0.5 else 0.2
    return {
        "model_id": "welfare-eligibility-demo",
        "model_version": "test-v1",
        "decision": "eligible" if score >= 0.5 else "ineligible",
        "probability_eligible": score,
        "reason": "synthetic test response",
    }


def test_http_adapter_normalizes_real_http_responses_and_limits_concurrency():
    active = peak = 0
    lock = Lock()

    def handler(payload):
        nonlocal active, peak
        with lock:
            active += 1
            peak = max(peak, active)
        time.sleep(0.01)
        with lock:
            active -= 1
        return _success(payload)

    client = HTTPDecisionTarget("http://127.0.0.1:8010", concurrency=3, transport=_transport(handler))
    rows = np.zeros((8, len(FEATURE_NAMES)))
    rows[:, FEATURE_NAMES.index("aadhaar_seeded")] = [0, 1] * 4
    result = client.query_batch(rows)
    assert result.attempted == result.completed == 8
    assert result.failures == {}
    assert result.model_id == "welfare-eligibility-demo"
    assert result.model_version == "test-v1"
    assert result.probabilities[:, 1].tolist() == [0.2, 0.8] * 4
    assert peak <= 3


def test_http_adapter_records_partial_http_and_schema_failures():
    def handler(payload):
        value = payload["features"]["monthly_income"]
        if value == 1:
            return httpx.Response(503, json={"detail": "unavailable"})
        if value in (2, 3):
            return {"model_id": "wrong", "decision": "eligible"}
        return _success(payload)

    client = HTTPDecisionTarget("http://127.0.0.1:8010", transport=_transport(handler))
    rows = np.zeros((4, len(FEATURE_NAMES)))
    rows[:, 0] = [0, 1, 2, 3]
    result = client.query_batch(rows)
    assert result.attempted == 4
    assert result.completed == 1
    assert result.failures == {"non_success_http": 1, "invalid_response": 2}
    assert result.succeeded.tolist() == [True, False, False, False]
    assert np.isnan(result.probabilities[1:]).all()


@pytest.mark.parametrize("error_type,expected", [(httpx.ConnectError, "connection_error"), (httpx.ReadTimeout, "timeout")])
def test_http_adapter_handles_connection_and_timeout_failures(error_type, expected):
    target = HTTPDecisionTarget("http://127.0.0.1:8010", transport=_error_transport(error_type))
    result = target.query_batch(np.zeros((2, len(FEATURE_NAMES))))
    assert result.completed == 0
    assert result.failures == {expected: 2}


@pytest.mark.parametrize("url", ["http://example.com:8010", "http://127.0.0.1:8010/path", "http://user:pass@127.0.0.1:8010", "https://127.0.0.1:8010", "http://127.0.0.1:8010?next=http://127.0.0.1"])
def test_only_plain_numeric_loopback_target_urls_are_allowed(url):
    with pytest.raises(ValueError):
        validate_loopback_base_url(url)


def test_redteam_engine_uses_http_predictions_and_handles_partial_batches():
    from sentinel.target.registry import PredictionBatch

    class PartialHttpTarget:
        def query_batch(self, records):
            success = np.ones(len(records), dtype=bool)
            success[::4] = False
            scores = np.full((len(records), 2), np.nan)
            eligible = records[:, FEATURE_NAMES.index("aadhaar_seeded")] > 0.5
            scores[success, 1] = eligible[success].astype(float) * 0.8 + 0.1
            scores[success, 0] = 1.0 - scores[success, 1]
            failed = int((~success).sum())
            return PredictionBatch(scores, success, len(records), int(success.sum()), {"timeout": failed}, "welfare-eligibility-demo", "test-v1")

        def predict_proba(self, _records):
            raise AssertionError("engine must use target HTTP responses")

    baseline = np.ones((12, len(FEATURE_NAMES)))
    report = RedTeamEngine().audit(PartialHttpTarget(), baseline, target_id="http-test", per_cohort=12, categories=(category("seeding_failure"),))
    cohort = report.cohorts[0].to_dict()
    assert report.baseline_n == 9
    assert report.baseline_attempted == 12
    assert report.queries_used == 24
    assert cohort["profiles_tested"] == 9
    assert cohort["profiles_failed"] == 3
    assert cohort["failed_probe_types"] == {"timeout": 3}
    assert cohort["metric_available"] is True
    assert cohort["disparity"] == pytest.approx(1.0)


def test_probe_limit_and_response_size_are_bounded():
    client = HTTPDecisionTarget("http://127.0.0.1:8010", max_probes=1, transport=_transport(_success))
    result = client.query_batch(np.zeros((3, len(FEATURE_NAMES))))
    assert result.attempted == 1 and result.completed == 1
    assert result.failures == {}

    oversized = httpx.MockTransport(lambda request: httpx.Response(200, content=b"x" * 5000, request=request))
    client = HTTPDecisionTarget("http://127.0.0.1:8010", transport=oversized)
    result = client.query_batch(np.zeros((1, len(FEATURE_NAMES))))
    assert result.failures == {"response_too_large": 1}
