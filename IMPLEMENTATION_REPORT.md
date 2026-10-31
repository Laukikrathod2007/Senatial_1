# SENTINEL — Phase 2 Implementation Report

Date: 2026-10-28  
Repository: local clone at temp-aayush-main/temp-aayush-main

## Outcome

The main fairness workflow is implemented and its backend route-function path passes a focused integration test: generated cohort audit → signed and stored report → chain/report verification → disabled-by-default tamper denial → explicitly enabled demo tamper → verification failure.

This is **not yet proven end to end in a browser**. Local socket access is denied in this environment, so the UI, downloaded PDF/JSON, desktop/mobile layout, and keyboard interaction were not manually exercised. The complete backend suite also did not finish. Do not present those parts as verified.

## What changed

- Fairness audit defaults to 800 generated baseline records and 200 records for each of six synthetic cohorts. All predictions are computed by the existing local synthetic model. The report includes sample counts, rejection rates, 95% Wilson intervals, gaps, one-sided two-proportion z-test p-values, method and synthetic-scope disclosure. It now says p-values are exploratory and unadjusted across cohorts.
- The auditor screen defaults to the main workflow, names the built-in dataset, uses one prominent fairness action, shows a busy state and errors, and displays the backend-returned result fields and limitation. It offers a readable PDF and exact JSON source from the same report object; JSON includes the backend seal.
- Privileged/non-citizen role issuance is disabled unless SENTINEL_ENABLE_DEMO_AUTH=true. This remains self-asserted demo role selection, not identity verification.
- Tamper/reset controls require both demo flags, SQLite, and storage under a directory whose name ends in demo. The local backend launcher creates backend/var-demo, generates a local-only signing secret if absent, binds to loopback, and enables both flags. The demo state is gitignored.
- Fixed tamper simulation to modify the configured SQLAlchemy database through the request session rather than a hard-coded backend/var/sentinel.db path.
- Updated README startup and judge workflow, removed unverified hosted links, replaced the presentation guide, and corrected API/CLI descriptions. Historical PRD/design/reference docs have top-of-file warnings that distinguish aspirations from the current build.
- Kept the user’s earlier App.tsx edits and applied further copy changes without reverting them.

## Local black-box HTTP adapter addendum — 2026-10-28

- Added a separately runnable FastAPI decision service (`sentinel.mock_target`) on loopback port 8010. It exposes `GET /health` and schema-validated `POST /api/v1/decide`, loading the same synthetic model in its own process and isolated `backend/var-mock-target` artifact cache.
- Added an opt-in (`SENTINEL_ENABLE_HTTP_DEMO_TARGET`, off by default) HTTP adapter and fairness endpoint (`POST /audits/fairness/http-demo`). The adapter accepts only numeric IPv4 loopback HTTP URLs from server configuration, rejects redirects, disables environment proxy inheritance, validates model response schema and metadata, bounds concurrency (maximum 32), per-call timeout (maximum 10 seconds), response size (4 KiB), request size (8 KiB at service boundary), and probe count (maximum 20,000). Audit requests do not accept a URL.
- The fairness engine now accepts explicit per-record completion results for HTTP targets. Metrics use only successful responses; baseline and cohort requested/attempted/completed/failed counts and categorized errors are included. A metric is unavailable when either comparison side has no successful responses. The original in-process synthetic route remains unchanged in behavior.
- HTTP-target reports identify the controlled local HTTP target, returned model id/version, probe configuration and synthetic scope, and are signed by the existing ledger. The auditor UI includes a dedicated action and handles missing metrics and failed probes.
- New tests cover adapter response normalization, HTTP errors, schema errors, connect/timeout failures, response/request/probe bounds, loopback URL restrictions, concurrency, engine isolation from direct model calls, partial failures, service decision schema, signed report verification and tamper detection.

### HTTP adapter verification

- `python -m pytest -q tests/test_http_target.py tests/test_http_workflow.py` — **14 passed**.
- `python -m pytest -q tests/test_redteam.py` — **8 passed**.
- Existing non-slow backend tests excluding `tests/test_gateway.py` — **55 passed, 30 deselected**.
- Existing demo-role and destructive-control guards — **2 passed**.
- Frontend `npm run build` — **passed**, with the existing large-chunk warning (707.01 kB main chunk).
- Frontend `npm run lint` — **passed**.
- `python -m compileall -q src tests` — **passed**.
- A real loopback HTTP server/browser journey was not verified in this environment. Adapter boundary tests use HTTPX's in-memory transport; they verify HTTP serialization, request dispatch, response parsing and error handling, but not a socket-backed separate-process integration. Run `start-mock-target.ps1`, `start-backend.ps1`, then execute the UI workflow locally to verify the separate processes.

## Verification performed

- Frontend: npm run build passed; Vite reports a 705.57 kB minified main bundle, above its 500 kB advisory.
- Frontend: npm run lint passed.
- Backend: .venv/Scripts/python.exe -u -m pytest -q -m "not slow" --ignore=tests/test_gateway.py --basetemp=.pytest-phase2-fast-final2 — 42 passed, 30 deselected.
- Backend: tests/test_workflow_api.py — 1 passed. This calls route functions directly and uses a throwaway SQLite database; it is not an HTTP test.
- Backend: selected role self-assignment, demo-control isolation and independent fairness rate recomputation tests — 3 passed.
- Backend: tests/test_accountant.py — 16 passed in an earlier focused run.
- Backend: tests/test_redteam.py::test_reported_rates_match_independent_predictions — passed in a focused run.
- git diff --check — passed.
- A complete backend pytest run did not finish. The TestClient route tests stalled in this sandbox. Direct loopback HTTP was also blocked with “An attempt was made to access a socket in a way forbidden by its access permissions.” Do not describe the suite as fully passing.
- Browser workflow was not run. No PDF was rendered or opened and no desktop/mobile/a11y visual verification is claimed.

## Exact commands and results

- frontend: npm run build — PASS; main chunk 705.57 kB, Vite >500 kB advisory.
- frontend: npm run lint — PASS.
- backend: .venv/Scripts/python.exe -u -m pytest -q -m "not slow" --ignore=tests/test_gateway.py --basetemp=.pytest-phase2-fast-final2 — 42 passed, 30 deselected.
- backend: .venv/Scripts/python.exe -u -m pytest -q tests/test_workflow_api.py --basetemp=.pytest-phase2-workflow-final2 — 1 passed.
- backend: .venv/Scripts/python.exe -u -m pytest -q tests/test_gateway.py::test_non_citizen_roles_cannot_be_self_assigned_outside_demo tests/test_gateway.py::test_destructive_demo_controls_are_disabled_by_default tests/test_redteam.py::test_reported_rates_match_independent_predictions --basetemp=.pytest-phase2-guards-final2 — 3 passed, 1 Starlette/httpx deprecation warning.
- backend: .venv/Scripts/python.exe -u -m pytest -q tests/test_accountant.py --basetemp=.pytest-accountant-phase2 — 16 passed.
- git diff --check — PASS.

A full pytest invocation with a workspace basetemp started but was interrupted after it stopped making progress; later TestClient checks demonstrated the local transport limitation. It yielded no full-suite result.

## Files changed

- Root docs: DEMO.md, DOCUMENTATION.md, PRD.md, PRESENTATION_GUIDE.md, README.md, SENTINEL_Project_Documentation.md.
- Backend project metadata: backend/pyproject.toml.
- Backend API: backend/src/sentinel/api/app.py; backend/src/sentinel/api/routes/audits.py; backend/src/sentinel/api/routes/auth.py; backend/src/sentinel/api/routes/ledger.py; backend/src/sentinel/api/routes/verify.py.
- Backend logic: backend/src/sentinel/cli.py; backend/src/sentinel/config.py; backend/src/sentinel/engines/membership/engine.py; backend/src/sentinel/engines/redteam/engine.py; backend/src/sentinel/gateway/auth.py; backend/src/sentinel/reporting/plain.py; backend/src/sentinel/target/registry.py.
- Backend tests: backend/tests/test_gateway.py; backend/tests/test_membership.py; backend/tests/test_redteam.py; backend/tests/test_workflow_api.py.
- Frontend: frontend/src/App.tsx; frontend/src/api/client.ts; frontend/src/pages/AuditorConsole.tsx; frontend/src/pages/CitizenPortal.tsx; frontend/src/pages/VerifyReport.tsx.
- Local demo safety: .gitignore; start-backend.ps1.
- Reports: AUDIT_REPORT.md; IMPLEMENTATION_REPORT.md.

## Judge steps

1. From the repo root, run start-backend.ps1. It uses isolated backend/var-demo state and binds to 127.0.0.1:8000.
2. In a second terminal, run start-frontend.ps1 and open http://localhost:5173.
3. Go to Auditor console. Select the Journalist / RTI Activist local demo role, enter a session label, then run the synthetic fairness audit.
4. Compare displayed values with the synthetic scope, method, sample sizes, intervals, p-values, gap, and planted-bias disclosure.
5. Download Exact JSON and PDF. Check that JSON report/seal values match the screen and that the PDF contains the same cohort results and limitations.
6. Open Verify a report and confirm integrity. Use tamper only on the local var-demo ledger and confirm verification fails. Reset only this disposable demo state if needed.
7. Repeat at desktop and mobile widths and with keyboard-only navigation. These checks remain to be performed.

## Before any public exposure

Keep both demo flags off. Replace caller-selected roles with real identity/authorization, configure and protect deployment JWT/signing keys, review CORS and persistent storage, and run full HTTP and browser tests in an environment that permits local sockets. The application still audits only its own synthetic model; do not market it as a real-system auditor, DP guarantee, certification, or legal evidence.

## Async HTTP audit jobs — 2026-10-29

- Added SQLite-backed audit job rows, explicit queued/running/completed/failed transitions, restart recovery, probe progress accounting, and authenticated owner-only polling. Existing synchronous audit routes remain available.
- Added two `202 Accepted` job endpoints for the in-process synthetic fairness audit and the configured local HTTP target. Reports are sealed before the job becomes completed; raw profile rows are not stored in job records.
- Added frontend submit-and-poll behavior with progress counts and terminal states.
- Added route/worker lifecycle tests and a genuine two-Uvicorn-process TCP integration test. Local TCP is denied by this execution sandbox; the two-process test detects that restriction and skips with the reason instead of claiming success. Use `backend/smoke-http-jobs.ps1` on Windows with the exact steps in `backend/README.md` for socket-backed validation.
- Focused backend verification: `tests/test_job_api.py`, `tests/test_jobs.py`, `tests/test_http_target.py`, `tests/test_http_workflow.py`, `tests/test_redteam.py` — **28 passed**. This does not include socket-backed verification or the full backend suite.
- Known operational boundary: SQLite plus FastAPI `BackgroundTasks` is single-process, in-process execution, not a durable queue. Restarted queued/running jobs are marked failed and need resubmission. Do not run multiple API workers for this MVP.
- The referenced master plan v1 and blueprint v6.2 were not present in the workspace during implementation; `implementationplan_latese.md` is a separate v2.0 document.

## Phase 2 outsider-first case workflow — 2026-10-29

Implemented the first judge-ready case vertical slice in the main checkout. It adds owner-scoped case records, explicit prerequisite/execution states, deterministic clean and known-flawed fictional data, three named screening criteria, fixture-specific detection/false-alarm checks, separate evidentiary states, signed and reproducible reports, human review/response fields, an editable neutral RTI/grievance draft, and report-preserving case deletion. Case metadata is deliberately not included in signed reports. The first-screen UI now opens on the case workspace while retaining the prior SENTINEL modules.

Verification in this checkout:

- Case + async job + HTTP adapter/workflow + red-team focused tests: **31 passed**.
- This does not establish real-service auditing, real-world benchmark accuracy, or a full backend-suite pass.
- Socket-backed two-process HTTP and browser visual/interaction checks remain subject to local network/browser restrictions. See the final verification notes in `AUDIT_REPORT.md`.
- Case metadata is plaintext in local SQLite. This slice is for synthetic/demo use only; do not enter confidential personal data.

Unimplemented next steps remain external black-box testing under verified scope, submitted-evidence review, authorized record-quality audits, safer data handling, durable jobs, and independent report anchoring. Each requires dedicated permission, data governance and validation work before claiming public-service findings.

## Final pre-submission QA — 2026-10-29

Feature freeze. This pass fixed two narrow issues without introducing a module: Unicode banner characters that made the launchers fail parsing in Windows PowerShell 5.1 were changed to ASCII, and the existing case draft area now generates distinct RTI-information and grievance-review text. The two draft forms share the existing saved draft field and have not been browser-tested.

### Commands and results from this pass

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-mock-target.ps1` — process stayed active; service health could not be reached from this environment.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-backend.ps1` — process stayed active; API health could not be reached.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-frontend.ps1` — Vite ready at port 5173; browser returned connection refused.
- Windows PowerShell 5.1 parser check for `start-mock-target.ps1`, `start-backend.ps1`, and `start-frontend.ps1` — **3 pass**.
- Health requests to ports 8000, 8010, and 5173 — blocked with `An attempt was made to access a socket in a way forbidden by its access permissions.` Browser navigation to the frontend returned `net::ERR_CONNECTION_REFUSED`.
- Frontend `npm run build` — **pass**; main chunk 738.45 kB, above Vite's 500 kB advisory.
- Frontend `npm run lint` — **pass**.
- Focused pytest command listed in `AUDIT_REPORT.md` — **46 passed, 3 deprecation warnings**.
- Socket integration test `tests/test_socket_http_jobs.py` — **1 skipped** with the sandbox TCP-denial reason. Full backend suite was not run.

### Workflow status

No browser step is claimed complete. Case creation, provenance rendering, fixture execution, review/response persistence across reload, both draft forms, report verification in the UI, tamper demonstration, deletion and post-refresh navigation require a rerun on a machine where localhost sockets and browser access are permitted. The direct backend tests verify route/fixture behavior, not the complete browser experience.

The fixture test oracle is deterministic and fixture-specific: 100 clean rows, 101 flawed rows, 3 of 3 planted checks detected, 0 criteria flagged in the clean control. It is not a real-world error-rate estimate. The current case notes remain plaintext in local SQLite; do not enter confidential evidence. The local launcher enables demo role selection and ledger tamper/reset controls, so it is suitable only for an isolated local demonstration.

### Judge instructions

Follow the 10-step “Judge demo steps” in `AUDIT_REPORT.md`. The essential boundary is that the only executable case check uses fictional SENTINEL fixtures; RTI/grievance text is an editable template and is never filed by the application. Run the final browser journey at desktop and mobile widths and with keyboard navigation before presenting, because this environment did not permit that final verification.

## Live Windows demo QA update — 2026-10-30

The documented local mock target, API and frontend were started as separate Windows PowerShell processes. Health results were 200 for `http://127.0.0.1:8000/health`, 200 for `http://127.0.0.1:8010/health`, and 200 for the Vite shell at `http://localhost:5173/`. The PowerShell 5.1 launcher parse issue was corrected and all three scripts now parse.

The live case API workflow created only a fictional case, recorded public-document provenance, read the prerequisite states, ran both fixture variants, saved notes and a fictional owner response, verified reports, tampered a QA-only flawed report, deleted the case, and confirmed an untouched report remained valid. Findings were fixture-specific: 0 clean flags and 3/3 known flawed checks detected, with no missed fixture checks. Case data and reports used in this workflow were synthetic.

The separate mock target initially had 180 baseline request timeouts at the old 2-second timeout. `backend/src/sentinel/config.py` now defaults to the already permitted 10-second cap. A subsequent live call with no environment override completed all 1,100 requests: 800 baseline and 300 cohort predictions, zero failures. API logs showed no 5xx; the only deliberate API error was the citizen-role quota refusal for an over-limit 1,100-probe request. The isolated demo ledger was reset after the tamper/deletion demonstration and now contains no reports or QA cases.

Final checks: frontend build passed (738.45 kB main chunk advisory); frontend lint passed; focused backend tests **46 passed, 3 deprecation warnings**; the real two-process TCP integration test **1 passed in 66.85 seconds** after narrowing its dead-target cap assertion to 50 probes and matching the progress assertion to the API's two-decimal rounding. The full backend suite remains unrun.

The browser journey remains blocked. In-app browser navigation refused the local page, and native browser automation stopped when it could not confidently determine the active URL. Thus no visual/mobile/keyboard/browser-persistence claim is made. The RTI and grievance actions now generate distinct editable text, one at a time in the existing saved draft field; this was verified in source/build, not rendered browser interaction. See the latest checklist and exact commands in `AUDIT_REPORT.md`.

## Final verification superseding earlier status — 2026-10-30

The earlier “full backend suite remains unrun” note is superseded. From `backend/`, `.\.venv\Scripts\python.exe -u -m pytest -q --basetemp=.pytest-full-final` completed with **115 passed, 25 deprecation warnings in 112.86 seconds**, including the slow two-process TCP test.

Live HTTP case lifecycle and separate mock-target verification passed; the isolated demo ledger was reset to zero reports and the chain is valid. API, mock target and frontend health checks returned 200. The remaining pre-submission item is a manual browser pass: this environment's computer-use tool stopped after it could not identify the active Windows browser URL safely. Do not claim desktop/mobile visual, keyboard, rendered draft, or browser refresh behavior as verified until that pass is completed.

## Follow-up changes and verification — 2026-10-30

- Added `POST /verify/report-copy` for checking an exported report envelope without fetching the ledger row. It verifies canonical payload SHA-256 and Ed25519 signature under the server's configured public key; response text limits the claim to integrity under that key.
- Added a signed JSON download and uploaded-copy verification control to the case report screen. Copy files over 1 MB are rejected in the UI. The UI says this check does not establish truth or independent key trust.
- Added a confirmation before generating either template when non-empty draft text would be replaced.
- Rechecked frontend: build passed (main bundle 740.50 kB with the >500 kB chunk advisory) and lint passed. Focused signing and case tests passed: 18/18. The complete 115-test backend suite was not rerun after this follow-up.
- Restarted the documented frontend launcher; local health returned API 200, mock 200, and frontend shell 200. Browser interaction is still unverified, so report download/upload and the draft replacement dialog have source/build and route-test coverage, not end-to-end browser evidence.

## Browser QA follow-up — 2026-10-30

The user confirmed the app was open at `localhost:5173`. In the rendered case page, I created a synthetic case, verified displayed source/provenance and prerequisites, ran both controls, saw **3/3** planted checks detected and **0** actual flags on the clean control, verified the signed report, and saw the 9.1 kB signed JSON download complete. These browser steps now supersede earlier notes claiming no case workflow was performed in a browser.

The report-copy upload picker could not be completed because browser control lost certainty about the active foreground window. The altered-copy upload, RTI/grievance drafting and replacement confirmation, notes and owner-response persistence, refresh behavior, mobile layout, and keyboard navigation remain unverified in the rendered UI. The uploaded-copy API behavior is covered by focused backend tests, but this is not evidence that the browser upload flow works end to end.

I removed the exact QA-created synthetic case and reset only its two synthetic fixture reports after confirming the local demo-only controls were enabled. Final state: 0 cases, 0 reports, valid empty ledger. No real or confidential data was used.

## Final QA continuation — 2026-10-31

Fixed report-copy verification for browser JSON serialization. The ledger export now supplies the exact canonical signed payload text; the verifier validates its canonical form, confirms it matches the parsed payload, and verifies its hash and Ed25519 signature. Added a regression case proving that a valid signed `0.0` value still verifies after JavaScript-style conversion to `0`, while a modified payload is rejected.

Current-source checks: backend non-slow suite **87 passed, 31 deselected**; slow membership/red-team suite **25 passed**; separate local TCP HTTP integration **1 passed** after rerunning with local-network access; focused ledger integrity **16 passed** (overlapping subset). Frontend lint and production build passed; Vite emitted its advisory that the 740.50 kB main bundle exceeds the 500 kB recommendation. The full pytest suite was attempted but did not complete, so no full-suite pass is claimed.

Live API lifecycle using fictional fixtures passed: clean case zero signals; known-flawed case 3/3 planted defects detected, zero missed, zero clean false flags; notes and owner response persisted through API read-back; intact signed copy accepted and altered copy rejected; case deletion returned 204 while its synthetic signed report remained verifiable. Demo ledger was reset to 0 cases and 0 reports and validated as an empty valid chain. API, mock-target, and frontend health returned 200.

Browser QA remains incomplete. Prior rendered checks covered case creation, provenance, prerequisites, both fixtures, signed report verification, and download. The current rendered grievance draft used explicit placeholders and marked the investigation question unverified. Still unverified in browser: RTI draft, report-copy file upload and tamper interaction, replacement confirmation, notes persistence after hard reload, refreshed navigation/session behavior, mobile layout, keyboard accessibility, and loading/error states. Synthetic-only scope remains explicit; the app does not audit live government services or prove discrimination or legal violations.

### Reproduction commands

Backend commands (run from `backend/`):

```powershell
.\.venv\Scripts\python.exe -u -m pytest -q -m "not slow" --basetemp=.pytest-a2z-no-slow
.\.venv\Scripts\python.exe -u -m pytest -q -m slow tests/test_membership.py tests/test_redteam.py --basetemp=.pytest-a2z-slow-models
.\.venv\Scripts\python.exe -u -m pytest -q tests/test_ledger_tamper.py --basetemp=.pytest-copy-regression3
.\.venv\Scripts\python.exe -u -m pytest -q -rs -m slow tests/test_socket_http_jobs.py --basetemp=.pytest-a2z-socket-escalated
```

Frontend commands (run from `frontend/`): `npm run lint`, `npm run build`. Health checks used `Invoke-WebRequest` against `http://localhost:8000/health`, `http://localhost:8010/health`, and `http://localhost:5173`; final permitted result was **200** for each.

### Final browser check attempt — 2026-10-31

The remaining browser workflow could not be completed because Codex reports “Local browser use is disabled in Work settings.” A local Chrome launch did not establish a browser session and was stopped. No UI checks from that attempt are counted as passed and no product code was changed. A read-only post-attempt state check confirmed 0 cases and 0 reports; demo controls are enabled. API, mock target and frontend responded 200. To finish, enable local browser use in Codex Work settings or perform the listed manual checks: RTI generation, valid and altered report-copy uploads, replacement confirmation, notes persistence after reload, desktop/mobile layout, keyboard operation, and loading/error states.

## Phase 3 Multilingual Support & End-to-End Integration — 2026-10-31

### Overview
Complete end-to-end frontend and backend integration and comprehensive trilingual support (English, Marathi / मराठी, and Hindi / हिंदी) have been implemented and verified. The user experience, visual aesthetics, color palette, responsive design, and Maharashtra scholarship context have been preserved without claiming any live connection to MahaDBT or official government portals.

### 1. Multilingual Architecture (i18n)
- **Translation Dictionary (`frontend/src/i18n/translations.ts`)**: Exhaustive localized key-value dictionaries for English (`en`), Marathi (`mr`), and Hindi (`hi`). Covers all navigation elements, session controls, roles, case workspace forms, evidence sources, access states, execution statuses, remediation statuses, fixture runner, validation cards, reproducibility manifests, limitations, auditor console, citizen portal, and verification explorer.
- **Localized Action Templates**: RTI information requests and grievance drafts are rendered in the selected language with preserved placeholder brackets (`[संबंधित सक्षम प्राधिकारी / अधिकाऱ्याचे नाव]`, `[योजना / सेवा / निर्णय प्रक्रियेचे नाव]`, etc.). Case inputs entered by the user and signed canonical payloads are kept verbatim and never altered.
- **Context & Selector (`frontend/src/i18n/LanguageContext.tsx`)**: Reactive `LanguageProvider` with persistent language preference stored in `localStorage` (`sentinel_language_preference`). Exposes an accessible `<LanguageSelector />` dropdown with globe icon, seamlessly integrated into the navigation header and mobile drawer.
- **Typography & Font Fallbacks (`frontend/src/index.css`)**: Added Unicode-safe Devanagari fallbacks (`'Nirmala UI'`, `'Mangal'`) to `--font-sans` and `--font-serif` to ensure crisp, clean glyph rendering across all Windows and web clients.

### 2. End-to-End Wiring & Live State
- **Typed API Client (`frontend/src/api/client.ts`)**: Added `api.ledgerRoot()` calling `GET /ledger/root`. All UI controls connect directly to live backend endpoints.
- **Hero State Card (`frontend/src/App.tsx`)**: Replaced static placeholders with a live query to `api.cases()`, `api.reports()`, `api.verifyChain()`, and `api.ledgerRoot()`. Clearly displays a `LIVE DEMO STATE` indicator and marks benchmark dataset sizes with `(Fixed demo benchmark)`.
- **All Core Screens Localized**:
  - `frontend/src/App.tsx`: Shell, tabs, session bar, roles, and footer.
  - `frontend/src/pages/CaseWorkspace.tsx`: Case creation, clean & flawed fixture execution, human review, owner response, localized dates (`mr-IN`, `hi-IN`), signed JSON download, and copy integrity verification.
  - `frontend/src/pages/AuditorConsole.tsx`: Fairness sweeps, job polling, query-budget gauge, cohort disparity tables, and disclosures.
  - `frontend/src/pages/CitizenPortal.tsx`: Input parameters, presets, membership inference, and perturbation audits.
  - `frontend/src/pages/VerifyReport.tsx`: Digital wax seal chain explorer, Merkle root display, public key preview, and controlled tamper simulator.

### 3. Verification & Test Outcomes
- **Backend Non-Slow Test Suite**: `uv run pytest -m "not slow" -q` passed cleanly: **87 passed, 31 deselected in 40.04s** (0 failures).
- **Frontend Linter (`oxlint`)**: `npm run lint` exited code 0: **0 warnings, 0 errors**.
- **Frontend Production Build**: `npm run build` (`tsc -b && vite build`) exited code 0 in **1.02s**.
- **Live Browser Automation**: Successfully verified session initiation, case creation with Maharashtra scholarship parameters, and audit execution via browser subagent.
- **Service Status**: Backend API (`http://127.0.0.1:8000/health`) responded 200 OK; Mock Target (`http://127.0.0.1:8010/health`) responded 200 OK; Frontend dev server (`http://localhost:5173/`) responded 200 OK.

