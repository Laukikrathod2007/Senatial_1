"""Real TCP smoke test for the target service, SENTINEL API and audit jobs.

Run directly with `python -m pytest -q tests/test_socket_http_jobs.py -m slow`.
Both Uvicorn services are started as separate child processes and use isolated
temporary SQLite/artifact directories.
"""

from __future__ import annotations

import os
import secrets
import socket
import subprocess
import sys
import time
from pathlib import Path

import httpx
import pytest

from sentinel.data.welfare import FEATURE_NAMES

pytestmark = pytest.mark.slow
BACKEND_DIR = Path(__file__).resolve().parents[1]


def _port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def _start_uvicorn(app: str, port: int, env: dict[str, str], log_path: Path) -> subprocess.Popen:
    log = log_path.open("w+", encoding="utf-8")
    process = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn", app,
            "--host", "127.0.0.1", "--port", str(port),
            "--no-access-log", "--log-level", "warning",
        ],
        cwd=BACKEND_DIR,
        env=env,
        stdin=subprocess.DEVNULL,
        stdout=log,
        stderr=subprocess.STDOUT,
    )
    process._sentinel_log = log  # type: ignore[attr-defined]
    return process


def _socket_permission_denied(message: str) -> bool:
    lowered = message.lower()
    return "forbidden by its access permissions" in lowered or "winerror 10013" in lowered


def _wait_health(url: str, process: subprocess.Popen, timeout: float = 30) -> None:
    deadline = time.monotonic() + timeout
    last_error = ""
    while time.monotonic() < deadline:
        if process.poll() is not None:
            log = getattr(process, "_sentinel_log", None)
            details = ""
            if log is not None:
                log.flush()
                log.seek(0)
                details = log.read()
            if _socket_permission_denied(details):
                pytest.skip("Sandbox denied local TCP listener creation; use start-mock-target.ps1 and start-backend.ps1 outside this sandbox.")
            raise AssertionError(f"A local Uvicorn process exited before health was ready: {details[-1200:]}")
        try:
            response = httpx.get(f"{url}/health", timeout=0.5, trust_env=False)
            if response.status_code == 200 and response.json().get("status") == "ok":
                return
        except httpx.RequestError as exc:
            last_error = str(exc)
            if _socket_permission_denied(last_error):
                pytest.skip("Sandbox denied local TCP connections; use the documented PowerShell smoke workflow outside this sandbox.")
        time.sleep(0.1)
    raise AssertionError(f"Health endpoint did not become ready: {url}. Last error: {last_error}")


def _stop(process: subprocess.Popen | None) -> None:
    if process is None:
        return
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=5)
    log = getattr(process, "_sentinel_log", None)
    if log is not None:
        log.close()


def _service_env(state: Path, *, target_url: str | None = None, max_probes: int = 20_000) -> dict[str, str]:
    env = os.environ.copy()
    source = str(BACKEND_DIR / "src")
    env["PYTHONPATH"] = source + os.pathsep + env.get("PYTHONPATH", "")
    env["SENTINEL_VAR_DIR"] = str(state)
    env["SENTINEL_DATABASE_URL"] = f"sqlite:///{(state / 'sentinel.db').as_posix()}"
    env["SENTINEL_ENABLE_DEMO_AUTH"] = "true"
    env["SENTINEL_ENABLE_DEMO_CONTROLS"] = "false"
    env["SENTINEL_ENABLE_HTTP_DEMO_TARGET"] = "true"
    env["SENTINEL_JWT_SECRET"] = "socket-test-" + secrets.token_hex(32)
    env["SENTINEL_HTTP_DEMO_MAX_PROBES"] = str(max_probes)
    if target_url:
        env["SENTINEL_HTTP_DEMO_TARGET_URL"] = target_url
    return env


def _login(client: httpx.Client) -> str:
    response = client.post(
        "/auth/login", json={"subject": "socket-auditor", "role": "journalist"}
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _poll(client: httpx.Client, job_id: str, headers: dict[str, str], timeout: float = 90):
    deadline = time.monotonic() + timeout
    seen_progress = 0.0
    latest = None
    while time.monotonic() < deadline:
        response = client.get(f"/audits/jobs/{job_id}", headers=headers, timeout=3)
        assert response.status_code == 200, response.text
        latest = response.json()
        assert latest["progress_pct"] >= seen_progress
        seen_progress = latest["progress_pct"]
        assert latest["completed_probes"] + latest["failed_probes"] == latest["attempted_probes"]
        if latest["status"] in ("completed", "failed"):
            return latest
        time.sleep(0.1)
    raise AssertionError(f"Audit job did not reach a terminal state: {latest}")


def test_socket_backed_mock_target_and_http_audit_jobs(tmp_path):
    target_port = _port()
    api_port = _port()
    target_url = f"http://127.0.0.1:{target_port}"
    api_url = f"http://127.0.0.1:{api_port}"
    target_state = tmp_path / "mock-target"
    api_state = tmp_path / "sentinel-api"
    target_state.mkdir()
    api_state.mkdir()
    target_process = api_process = failure_api = None
    try:
        target_process = _start_uvicorn(
            "sentinel.mock_target:app", target_port, _service_env(target_state), tmp_path / "mock-target.log"
        )
        _wait_health(target_url, target_process)
        api_process = _start_uvicorn(
            "sentinel.api.app:app",
            api_port,
            _service_env(api_state, target_url=target_url),
            tmp_path / "sentinel-api.log",
        )
        _wait_health(api_url, api_process)

        with httpx.Client(base_url=target_url, timeout=10, trust_env=False) as target_client:
            features = {
                "monthly_income": 30000,
                "household_size": 4,
                "land_holding_acres": 0,
                "years_at_address": 8,
                "aadhaar_seeded": 1,
                "documents_complete": 1,
                "prior_scheme_count": 1,
                "age": 40,
            }
            assert set(features) == set(FEATURE_NAMES)
            decision = target_client.post("/api/v1/decide", json={"features": features})
            assert decision.status_code == 200, decision.text
            response = decision.json()
            assert response["model_id"] == "welfare-eligibility-demo"
            assert response["model_version"] == "synthetic-welfare-v1"
            assert response["decision"] in {"eligible", "ineligible"}
            assert 0 <= response["probability_eligible"] <= 1
            invalid = target_client.post("/api/v1/decide", json={"features": {"unknown": 1}})
            assert invalid.status_code == 422

        with httpx.Client(base_url=api_url, timeout=10, trust_env=False) as api_client:
            token = _login(api_client)
            owner_headers = {"Authorization": f"Bearer {token}"}
            accepted = api_client.post(
                "/audits/fairness/http-demo/jobs",
                json={"per_cohort": 50},
                headers=owner_headers,
            )
            assert accepted.status_code == 202, accepted.text
            queued = accepted.json()
            assert queued["status"] == "queued"
            assert queued["total_probes"] == 1100

            other = api_client.post(
                "/auth/login", json={"subject": "different-owner", "role": "journalist"}
            ).json()["access_token"]
            denied = api_client.get(
                f"/audits/jobs/{queued['job_id']}",
                headers={"Authorization": f"Bearer {other}"},
            )
            assert denied.status_code == 404

            done = _poll(api_client, queued["job_id"], owner_headers)
            assert done["status"] == "completed", done
            assert done["attempted_probes"] == done["completed_probes"] == 1100
            assert done["failed_probes"] == done["unattempted_probes"] == 0
            report = done["result"]["report"]
            seal = done["result"]["sealed"]
            assert report["target"]["type"] == "controlled_local_http"
            assert report["target"]["model_version"] == "synthetic-welfare-v1"
            assert report["queries_used"] == 1100
            assert report["baseline_profiles_completed"] == 800
            assert all(cohort["profiles_tested"] == 50 for cohort in report["cohorts"])
            verified = api_client.get(f"/verify/reports/{seal['sequence']}")
            assert verified.status_code == 200 and verified.json()["valid"] is True

            # Exercise the Audit Case workflow over actual HTTP: case metadata,
            # fixture execution, owner-only reads, human review, and report seal.
            created_case = api_client.post(
                "/cases",
                headers=owner_headers,
                json={
                    "title": "Synthetic status consistency case",
                    "target_name": "District benefit decision workflow",
                    "investigation_question": "Do repeated synthetic records keep the same status?",
                    "evidence_source": "synthetic_demo",
                    "provenance_note": "Controlled test request; no real citizen record.",
                    "evidence_reference": "fixture-case-smoke",
                    "access_state": "not_applicable",
                },
            )
            assert created_case.status_code == 201, created_case.text
            case_id = created_case.json()["case_id"]
            case_run_response = api_client.post(
                f"/cases/{case_id}/demo-run",
                headers=owner_headers,
                json={"variant": "known_flawed"},
            )
            assert case_run_response.status_code == 201, case_run_response.text
            case_run = case_run_response.json()
            case_report = case_run["result"]["report"]
            assert case_run["execution_status"] == "COMPLETED"
            assert case_report["validation_against_known_fixtures"]["detected_known_defects"] == 3
            assert case_report["validation_against_known_fixtures"]["false_alarm_criteria_on_clean_fixture"] == 0
            assert api_client.get(
                f"/cases/{case_id}", headers={"Authorization": f"Bearer {other}"}
            ).status_code == 404
            case_sequence = case_run["result"]["sealed"]["sequence"]
            assert api_client.get(f"/verify/reports/{case_sequence}").json()["valid"] is True
            reviewed = api_client.patch(
                f"/cases/{case_id}",
                headers=owner_headers,
                json={"human_review_status": "reviewed", "human_review_notes": "Synthetic fixture only."},
            )
            assert reviewed.status_code == 200 and reviewed.json()["human_review_status"] == "reviewed"
            assert api_client.delete(f"/cases/{case_id}", headers=owner_headers).status_code == 204
            assert api_client.get(f"/verify/reports/{case_sequence}").json()["valid"] is True

        # A separate backend instance uses a dead target port and a small probe
        # cap below the planned total. It must preserve failures and unattempted
        # work without spending minutes making hundreds of refused connections.
        _stop(target_process)
        target_process = None
        failure_state = tmp_path / "failure-api"
        failure_state.mkdir()
        failure_port = _port()
        failure_api_url = f"http://127.0.0.1:{failure_port}"
        failure_api = _start_uvicorn(
            "sentinel.api.app:app",
            failure_port,
            _service_env(failure_state, target_url=target_url, max_probes=50),
            tmp_path / "sentinel-failure-api.log",
        )
        _wait_health(failure_api_url, failure_api)
        with httpx.Client(base_url=failure_api_url, timeout=10, trust_env=False) as failure_client:
            headers = {"Authorization": f"Bearer {_login(failure_client)}"}
            accepted = failure_client.post(
                "/audits/fairness/http-demo/jobs",
                json={"per_cohort": 50},
                headers=headers,
            )
            assert accepted.status_code == 202, accepted.text
            failed_target = _poll(failure_client, accepted.json()["job_id"], headers)
            assert failed_target["status"] == "completed"
            assert failed_target["attempted_probes"] == failed_target["failed_probes"] == 50
            assert failed_target["completed_probes"] == 0
            assert failed_target["unattempted_probes"] == 1050
            assert failed_target["progress_pct"] == pytest.approx(50 / 1100 * 100, abs=0.005)
            failed_report = failed_target["result"]["report"]
            assert failed_report["baseline_profiles_failed"] == 50
            assert failed_report["baseline_profiles_not_attempted"] == 750
            assert all(not cohort["metric_available"] for cohort in failed_report["cohorts"])
            seal = failed_target["result"]["sealed"]
            assert failure_client.get(f"/verify/reports/{seal['sequence']}").json()["valid"] is True
    finally:
        _stop(failure_api)
        _stop(api_process)
        _stop(target_process)
