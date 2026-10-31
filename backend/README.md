# SENTINEL — backend

Audit engines, cryptographic ledger, access gateway, and API for SENTINEL.

See the repository root `README.md` for project context, and
`SENTINEL_Project_Documentation.md` for the full technical specification.

## Development

```bash
uv sync
uv run pytest -m "not slow"    # fast loop
uv run pytest                  # full suite, includes shadow-model training
uv run sentinel --help
```

## Local HTTP target demo

Start the mock decision API in a separate terminal from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-mock-target.ps1
```

Then start SENTINEL with `start-backend.ps1` and use the auditor console's
**Audit through local HTTP service** action. The target binds to
`127.0.0.1:8010`; the backend uses a fixed, opt-in loopback target and does not
accept caller-supplied URLs. `POST /api/v1/decide` accepts the exact eight
synthetic feature names from `sentinel.data.welfare.FEATURE_NAMES` under a
`features` object. It returns `model_id`, `model_version`, the eligibility
decision, its probability, and an optional reason. The audit report records
request completion/failure counts and is sealed by the existing ledger.

This is a local service-boundary demo against generated synthetic data. It does
not connect to or establish results about a public-service system.

## Persistent asynchronous fairness jobs

The async endpoints preserve the synchronous fairness endpoints for existing clients:

- `POST /audits/fairness/jobs` queues an in-process synthetic audit.
- `POST /audits/fairness/http-demo/jobs` queues the opt-in local HTTP audit.
- `GET /audits/jobs/{job_id}` returns persisted state only to the authenticated owner. Unknown and other-owner IDs both return 404.

SQLite stores the job lifecycle, probe counts, safe errors, and the completed sealed report. It does not store synthetic profile rows. Progress means target requests actually attempted; completed plus failed equals attempted, and unattempted is the plan minus attempted. `FastAPI BackgroundTasks` is process-local and is not a durable queue: this MVP supports one API process and marks queued/running jobs failed on restart so they are not falsely shown as resumed. Use a durable worker queue before running multiple API workers or deploying jobs that must survive restarts.

### Socket-backed Windows smoke test

Run these commands from the repository root in separate PowerShell windows. They use the local demo state configured by the launchers and do not delete existing data.

Terminal 1:

```powershell
.\start-mock-target.ps1
```

Terminal 2:

```powershell
.\start-backend.ps1
```

Terminal 3:

```powershell
.\backend\smoke-http-jobs.ps1
```

For the controlled failure/cap case, stop the mock target with Ctrl+C. Start a separate backend instance against a new isolated SQLite state (terminal 2 or another terminal):

```powershell
Set-Location .\backend
$failureState = Join-Path (Get-Location) "var-demo-failure"
New-Item -ItemType Directory -Force -Path $failureState | Out-Null
$env:SENTINEL_VAR_DIR = $failureState
$env:SENTINEL_DATABASE_URL = "sqlite:///$($failureState -replace '\\', '/')/sentinel.db"
$env:SENTINEL_ENABLE_DEMO_AUTH = "true"
$env:SENTINEL_ENABLE_DEMO_CONTROLS = "false"
$env:SENTINEL_ENABLE_HTTP_DEMO_TARGET = "true"
$env:SENTINEL_HTTP_DEMO_MAX_PROBES = "850"
if (-not $env:SENTINEL_JWT_SECRET) { $env:SENTINEL_JWT_SECRET = [guid]::NewGuid().ToString("N") + [guid]::NewGuid().ToString("N") }
.\.venv\Scripts\python.exe -m uvicorn sentinel.api.app:app --host 127.0.0.1 --port 8001
```

Then run from the repository root in another terminal:

```powershell
.\backend\smoke-http-jobs.ps1 -ApiBaseUrl http://127.0.0.1:8001 -ExpectUnavailableTarget -ExpectedMaxProbes 850
```

That path expects 850 attempted failures and 250 unattempted probes for a 1,100-probe plan. The smoke script also checks owner-authenticated polling, monotonic counts, synthetic-scope disclosure, and report seal verification. If using a different cohort size or cap, adjust the expected values accordingly.

## Phase 2 outsider-first case workflow — 2026-10-29

The new case workspace creates an owner-scoped investigation record, explains which paths are runnable versus blocked by prerequisites, executes a deterministic clean or known-flawed fixture, keeps execution status separate from evidentiary status, and stores a signed synthetic report. The case can also hold human review, an owner response, follow-up status and an editable RTI/grievance draft.

The first benchmark is deliberately small and bounded: three written criteria are evaluated against deterministic fictional public-benefit records. It checks conflicting decisions for an application identifier, missing rejection reasons, and a subgroup approval-rate gap. Its built-in validation checks the expected outcome on both the clean and flawed fixture. This is a software demonstration, not a real-world sensitivity estimate or legal assessment.

Case metadata is currently plaintext in local SQLite. Do not enter personal or confidential evidence. No evidence files are accepted; no named external target is contacted; no real authorized data source is integrated. RTI/grievance content is only generated and saved in the case; SENTINEL does not submit it.

To use the vertical slice, start the backend and frontend using the existing local demo instructions, create a case in the first-screen workspace, and run either fixture variant. Read the prerequisites before interpreting the output. Only the synthetic fixture check is executable in this MVP; external audit paths state why they cannot run.
