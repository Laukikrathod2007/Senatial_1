# SENTINEL baseline audit

Date: 2026-10-28  
Scope: local cloned repository at `temp-aayush-main/temp-aayush-main`. The deployed site and backend were not independently tested in this pass. Findings below describe this checkout, not any remote deployment.

## Executive assessment

SENTINEL is a real synthetic-model demo with nontrivial audit code, a React UI, a FastAPI API, and a signed report ledger. It is not yet an independent auditor for arbitrary government systems: every HTTP audit route loads the same local demo target (`backend/src/sentinel/api/routes/audits.py`, `load_demo_target`). Its synthetic results validate methods against a deliberately constructed stand-in, not a real public-service algorithm.

The highest-risk issue is that destructive demo endpoints are unauthenticated: `POST /verify/tamper` edits persisted report content and `POST /verify/reset` deletes reports and privacy/quota records (`backend/src/sentinel/api/routes/verify.py:65-114`). `POST /auth/login` also lets any caller choose any role, so JWT quotas are enforced but role identity is not verified (`backend/src/sentinel/api/routes/auth.py:28-48`).

The privacy-budget feature currently does not establish a differential privacy guarantee for the audits. The API records a Gaussian-mechanism accounting cost per model query, while target queries are ordinary deterministic classifier predictions. The implemented Laplace aggregate-release helper is not called by the audit routes. In addition, M1's first calibration makes 500 target queries but the report's `queries_used` omits those queries; the route preflights 500 calibration queries but records only the returned count (`backend/src/sentinel/api/routes/audits.py:70-105`, `backend/src/sentinel/engines/membership/engine.py`).

The backend computations and ledger are meaningfully implemented. The local frontend production build succeeded. Automated test verification is incomplete because the sandbox denied pytest's default temporary path and the workspace-temp rerun did not finish before interruption. The static lint command exited 0. A local browser check was blocked by denied localhost socket access. No claims below are upgraded to end-to-end verified based only on code presence.

## Feature status

Status labels follow the requested vocabulary.

| Area | Status | Evidence and limitations |
|---|---|---|
| M1 membership / memorisation risk | PARTIALLY IMPLEMENTED | Offline LiRA-style one-sided scoring with shadow models and global calibration exists in `backend/src/sentinel/engines/membership/{engine,lira,shadow}.py`; target is the synthetic locally trained classifier (`target/registry.py`, `target/system.py`). It is not a real-world target connector. The score is statistical evidence under a synthetic reference, not proof a named individual was unlawfully processed. Baseline omission of first-call calibration probes was corrected after the audit; see implementation report. |
| M2 explanation consistency | PARTIALLY IMPLEMENTED | `engines/explainability/engine.py` runs real counterfactual prediction probes against the stand-in, uses domain-derived ranges (`explainability/domain.py`), and reports Wilson intervals. It changes the feature named by a separate rule-based reason generator. A no-flip result means that intervention alone did not change the outcome; it does not prove the reason was false, the model's true causal basis, or legal “explanation fraud.” |
| M3 subgroup fairness / red team | PARTIALLY IMPLEMENTED | `engines/redteam/engine.py` computes baseline and cohort rejection rates, Wilson intervals, and a one-sided two-proportion test over generated synthetic cohorts. The target eligibility rule directly rewards Aadhaar seeding and complete documents; disparities are expected by construction. It is a stress-test, not evidence of discrimination in a deployed system. There is no adjustment for testing multiple cohorts. |
| M4 signed tamper-evident reports | PARTIALLY IMPLEMENTED | Canonical JSON, SHA-256 report hashes, previous-hash chain fields, Ed25519 detached signatures, chain checks, and Merkle root/inclusion-proof primitives exist in `ledger/{hashing,signing,service,merkle}.py`. The HTTP API exposes a root and chain verification, but no inclusion proof endpoint. The root is recomputed from the same mutable database and is not externally anchored; a report signature proves signing-key origin/integrity, not truth or institutional authority. Private key is generated unencrypted (`NoEncryption`) and stored under `backend/var/keys`; production key custody is not established. |
| M5 JWT and quota gateway | PARTIALLY IMPLEMENTED | JWTs validate signature, algorithm, expiry and required claims in `gateway/auth.py`; audit routes require `AuthDep`, enforce query and epsilon ceilings before running engines (`gateway/deps.py`, `gateway/budget.py`). However `/auth/login` accepts a caller-selected privileged role without identity proof. Per-day quota persistence is implemented in SQLite, but multi-worker concurrency/atomic enforcement was not verified. Demo tamper/reset routes are public. |
| M6 differential privacy budget | IMPLEMENTED BUT FAILING (as a formal guarantee) | An RDP accountant, Gaussian mechanism cost model, SQLite spend record, and Laplace aggregate helper exist (`privacy/accountant.py`, `guardian.py`, `mechanisms.py`). Actual model queries are not Gaussian-mechanism releases; audit routes do not call `privatize_explainability`. The accountant therefore cannot honestly describe these deterministic predictions as an `(ε,δ)`-DP guarantee. Query budget is a policy counter until a mechanism and adjacency/sensitivity assumptions match the audited data and outputs. |
| Downloadable report | PARTIALLY IMPLEMENTED | `CitizenPortal.tsx:169-275` builds a PDF client-side from actual API result fields. Its wording calls the document an official/certified/MeitY/DPDP compliance artifact and references a government authority, although the app is a synthetic demo and no such certification exists. Signature is truncated in PDF and QR points at hard-coded localhost. PDF layout/long-text overflow and downloaded content were not manually verified. |
| RTI request generator | PARTIALLY IMPLEMENTED | `CitizenPortal.tsx:277-334` creates a PDF template, but it asserts a welfare classifier denied benefits and says testing “demonstrated statistical contradictions”; the result concerns the stand-in model, not the applicant's government service. It also requests DP rules/budget specifics as though they apply to that target. Although identity fields are blank, facts are invented in the request body. It should be an editable, neutral template with explicit placeholders and a synthetic-demo disclaimer. |
| UI / accessibility / mobile | UNVERIFIED — EXPLAIN WHY | `npm run build` passed; `npm run lint` exited 0. Browser inspection could not run because local socket access is denied in this environment (`ERR_CONNECTION_REFUSED`). Source inspection found misleading “compliance certificate”, “DPDP Act certified”, official/MeitY language, an unqualified “explanation fraud” label, static sample result cards, and destructive demo controls within the public verification page. Keyboard, contrast, responsive behavior, and full journeys remain unverified. |
| Deployment readiness | UNVERIFIED — EXPLAIN WHY | Render, Vercel and Docker configuration exists. No production deployment was accessed. The backend includes a known development JWT fallback in `config.py` and `docker-compose.yml`; `backend/.env` exists locally and was not read or emitted. Disk persistence, production secrets, CORS, and API reachability were not validated remotely. |

## Baseline commands and observed outcomes

- `npm run build` (frontend): **passed**; Vite warned that a generated JavaScript chunk exceeds 500 kB.
- `npm run lint` (frontend): **exit code 0**.
- `.venv/Scripts/python.exe -m pytest -q` (backend): **56 passed, 30 errors**; all shown errors were pytest setup failures because the default system temp directory was not writable (`could not create numbered dir ... pytest-of-LAUKIK`). This is an environment failure, not evidence that those 30 assertions failed.
- `.venv/Scripts/python.exe -m pytest -q --basetemp=.pytest-run -m 'not slow'`: started but did not complete before interruption; no result is claimed.
- Local UI/API socket check: **blocked**; sandbox denied localhost sockets. Vite reported port 5173 already in use and selected 5174, but the browser could not connect. The already-running process on 5173 was left untouched.
- A later loopback check confirmed the FastAPI `/health` endpoint returned `{"status":"ok"}`. The browser still could not load the Vite page: the launched Vite process did not leave an active listener reachable on 5174. UI interaction and deployment comparison remain unverified.
- `git status` before changes: `frontend/src/App.tsx` was already modified. That pre-existing user change must be preserved.

## Prioritised baseline issues

| Priority | Evidence and impact | Proposed correction | Effort | Verification |
|---|---|---|---|---|
| P0 | Public `/verify/reset` deletes the ledger, budgets and quotas; public `/verify/tamper` mutates signed data (`verify.py:65-114`). A reachable deployment can be vandalised. | Disable demo mutation endpoints by default and require an explicit demo-only server setting; prevent destructive controls from appearing in normal deployments. | S | API tests prove disabled requests cannot mutate state; explicit demo-mode test proves expected local demonstration. |
| P1 | Any caller can mint `gov_self_audit` / `certified_auditor` tokens by choosing a role (`auth.py:28-48`), defeating identity-based quotas. | Label role selection as demo-only; in a production mode require configured identity/authentication and do not accept caller-granted privileged roles. | M | Test role escalation is impossible outside demo mode and protected routes reject unverified identities. |
| P1 | M1 calibration uses 500 additional queries, but `queries_used` is undercounted and persisted spend misses them after preflight (`audits.py:70-105`, membership engine). | Track actual target calls including one-time calibration, and charge actual usage; test first and subsequent audit counts. | S-M | Unit and API tests compare `target.query_count`, report count, and persisted spend. |
| P1 | M5 applies a Gaussian cost model to ordinary deterministic predictions; noisy release helper is not integrated. UI/docs imply formal DP guarantees. | Remove formal DP claims from the product until a defensible mechanism, adjacency, sensitivity, and composition model are implemented; describe the present feature as an internal query budget. | M | Tests/inspection establish emitted reports do not claim DP and accounting corresponds to invoked mechanisms. |
| P1 | PDF uses official/certification/legal claims that are unsupported; RTI body attributes synthetic audit findings to applicant's real case (`CitizenPortal.tsx:169-334`). Could mislead a citizen or harm a grievance. | Retitle as “synthetic demo audit report”; distinguish synthetic evidence; produce neutral RTI template with editable factual placeholders, no invented denial facts, authority or legal effect. | S-M | Inspect generated PDF text in tests or manual browser; ensure placeholders and disclaimer. |
| P2 | Explainability finding called “fraud” or “false reason” exceeds the actual single-feature no-flip test. | Use precise labels (“reason-change test did not flip outcome”) and include sample counts/limitations next to finding. | S | Tests and UI copy review. |
| P2 | No inclusion-proof API despite Merkle proof helpers; displayed root is not externally anchored. | Either add proof export and a publication/pinning workflow or state the root is locally recomputed and self-reported. | M | Independent proof verification using exported report and published root. |
| P2 | Static UI examples and “five modules run in parallel” claims may be mistaken for live measured outputs; fairness is a separate route, not parallel with other audits. | Label all synthetic/illustrative elements and align UI/docs with API behavior. | M | Manual route-by-route UI review. |
| P2 | Main frontend bundle is 703 kB minified and local browser/mobile/accessibility pass is blocked. | Defer code splitting until visual/interaction review; run browser and keyboard/mobile pass in an environment permitting localhost. | M | Browser/manual QA at desktop and mobile widths. |

## Post-baseline changes in this checkout

- Disabled `/verify/tamper` and `/verify/reset` by default with `SENTINEL_ENABLE_DEMO_CONTROLS`; the frontend hides those controls unless the backend reports demo mode enabled. This closes the default public destructive-operation path. The opt-in is intentionally for disposable demo data only.
- Counted the initial 500 calibration probes in M1's returned `queries_used`; later runs on the same engine do not count cached calibration again. Added targeted regression coverage.
- Rewrote plain-language results to say they concern only the synthetic model and to explain that a no-flip counterfactual does not identify the true cause.
- Reworked PDF text and citizen/auditor UI copy to remove unsupported government, compliance, DPDP certification, and “fraud” claims. RTI export now provides a neutral, editable draft with placeholders and filing checks, and no longer asserts facts about a real denial.
- Updated README capability/limitation descriptions and added implementation summary in `IMPLEMENTATION_REPORT.md`.

### Verification after changes

- Frontend: `npm run build` **passed**, with a 703 kB main chunk warning; `npm run lint` **passed**.
- Backend focused suites: 42 passed (`test_accountant.py`, `test_ledger_tamper.py`, `test_explainability.py`); 2 passed for M1 calibration query accounting; 1 passed for the demo-control gate.
- Full backend suite: **not verified**. Initial run reached 56 passed and 30 pytest temporary-directory setup errors; a later full rerun did not complete in this environment. Do not treat this as a full-suite pass.
- Local FastAPI health: **passed** (`/health` returned `{"status":"ok"}`). Browser UI, generated PDF rendering, mobile behavior, accessibility, and remote deployment remain unverified.

## Safe demonstration boundary

The safest current demo claim is: **SENTINEL runs reproducible tests against its own locally trained synthetic eligibility model, reports measured behavior, and detects edits to signed ledger rows.** Do not present its output as an audit of a real government program, DPDP certification, proof of unlawful data use, causal explanation, discrimination finding, or court-admissible evidence. An actual external audit requires a lawful target interface, documented access, an appropriate reference population, and a reviewed threat/statistical model.

## Phase 2 implementation and verification addendum — 2026-10-28

### Current checkout updates

- The fairness endpoint defaults to 800 baseline profiles plus 200 profiles in each of six generated cohorts (2,000 predictions total). The backend returns each cohort's sample count, rejection rate, Wilson 95% interval, disparity, and one-sided two-proportion z-test p-value. P-values are explicitly disclosed as exploratory and unadjusted across cohorts.
- The auditor screen now presents the synthetic dataset name and a single fairness action, renders the backend-returned values, limitations, loading/error states, and seal ID, and offers both a readable PDF and exact JSON source. The JSON bundles the exact report object and seal returned by the backend.
- Added a direct route-function workflow regression: fairness computation → signed ledger storage → chain and report verification → default-disabled tamper check → explicit demo tamper → invalid verification. It passed on a throwaway SQLite database. This tests route functions and storage logic, not HTTP transport or the browser.
- Non-citizen role selection is rejected unless SENTINEL_ENABLE_DEMO_AUTH=true. Destructive controls additionally require SENTINEL_ENABLE_DEMO_CONTROLS=true, SQLite, and a database path under a var-demo directory. The local launcher configures this separate state directory and binds Uvicorn to loopback without reload.
- Removed unsupported live deployment links/claims from the README and replaced the presentation guide with a synthetic-scope demo script. Historical design/requirements docs retain warning banners because they contain aspirational text.

### Phase 2 verification

- Frontend production build: passed; main JavaScript bundle is 705.57 kB minified and Vite warns above its 500 kB advisory.
- Frontend Oxlint: passed.
- Backend non-slow tests excluding tests/test_gateway.py: 42 passed, 30 deselected.
- Direct route-function fairness/seal/verify/tamper workflow: 1 passed.
- Role-self-assignment, demo-control isolation and independently recomputed fairness rates: 3 passed.
- git diff --check: passed.
- The full suite was attempted but not completed. HTTP tests using Starlette TestClient stall in this sandbox; a direct loopback request was denied with “An attempt was made to access a socket in a way forbidden by its access permissions.” Do not interpret the passing selected tests as a full-suite pass.
- Browser automation, desktop/mobile layout, PDF rendering/download, keyboard flow, and remote deployment remain unverified for the same local-socket constraint.

### Remaining material risks

- Do not enable demo authentication or tamper controls on a shared or public service. The configured demo role is still caller-selected; it is a demonstration gate, not identity proof.
- The external service connector, lawful access process, production identity provider, multi-cohort correction, key custody, external Merkle anchoring, and formal differential privacy are not implemented.
- Before any public exposure, keep demo flags off, configure a strong deployment-specific JWT secret and persistent key/database handling, review CORS and deployment settings, and run full HTTP/browser verification in an environment that permits local sockets.

### Manual judge workflow

1. From the cloned repository root, start start-backend.ps1; it creates isolated backend/var-demo state and binds to 127.0.0.1:8000.
2. In another terminal start start-frontend.ps1, then open http://localhost:5173.
3. Open Auditor console, use the local Journalist / RTI Activist demo role and a session label, and run Run synthetic fairness audit.
4. Inspect the displayed dataset scope, baseline/cohort sample sizes, rejection rates, confidence intervals, p-values, method and planted-bias disclosure.
5. Download Exact JSON and compare its report values and seal hash with the screen. Download the PDF and check every cohort row and limitation text.
6. Open Verify a report and confirm the chain. Use the enabled tamper action only against backend/var-demo; refresh verification and confirm it fails. Reset only this disposable demo ledger if you need a clean run.
7. Repeat at a narrow mobile width and with keyboard-only navigation; record any layout or focus defects.

## Phase 2 case-workspace vertical slice — 2026-10-29

- Added an owner-scoped case record that connects the stated question, source/provenance/access notes, prerequisite states, test executions, human review, system-owner response, follow-up status and an editable information-request draft.
- The only runnable test in this workflow is explicitly a SENTINEL-owned synthetic fixture. The clean fixture has 100 fictional rows; the known-flawed fixture has 101 rows and three planted issues. The internal checks are record-status conflict, missing rejection reason, and a 15 percentage-point subgroup approval-rate screen. The threshold is labeled internal screening, not a legal standard.
- The benchmark self-check reports detections and clean-fixture flags against these known fixtures. A result of 3/3 and 0 false flags is fixture-specific and is not a general accuracy estimate.
- Reports include criteria, per-test evidence status, limitations, software/source/fixture hashes, untrusted local timestamps and Ed25519 signing metadata. Case notes are excluded from signed reports. Case notes currently reside as plaintext in the local SQLite database; this is demo data only and must not contain confidential personal information.
- A generated RTI/grievance text is an editable factual template with placeholders. It is not filed or sent. Generating it marks follow-up as “draft prepared”; the user must verify and edit it.
- The case workspace is now the first screen; prior auditor, citizen and report-verification functions remain accessible.

### Case-workspace verification

- Focused backend set (case workflow, job lifecycle, HTTP adapter/workflow, and red-team): **31 passed**.
- Frontend production build passed after the workspace changes; final lint/build rerun is recorded in the final verification below.
- Two-process socket test is attempted separately. This environment has previously denied local TCP sockets, so a skip is not a successful transport verification.
- Full backend suite and browser visual/interaction checks are not claimed as complete.

### Remaining scope

There is still no connection to an external service, submitted evidence upload/review, real authorized dataset audit, verified permission system, encrypted case-note storage, durable background queue, external timestamp/ledger anchor, or formal differential-privacy guarantee. The case workspace organizes an inquiry and proves the synthetic demo path; it does not yet establish findings about a named real public service.

## Final pre-submission QA — 2026-10-29

Feature work is frozen after one high-impact correction: the Windows PowerShell launch scripts contained Unicode dashes inside quoted banner strings. Windows PowerShell 5.1 parsed the UTF-8 files as ANSI and failed with “The string is missing the terminator.” Those banner characters are now ASCII. The case screen also now has separate RTI information-request and grievance-review draft generators. They are still one editable draft at a time in the existing saved-text field; browser generation and reload were not verified.

### Exact checks run in this QA pass

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-mock-target.ps1` — script parsed and the process remained running; socket health was not reachable from this environment.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-backend.ps1` — launcher parsed and Uvicorn process remained running; `/health` request was blocked by local socket policy.
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-frontend.ps1` — Vite reported ready at `http://localhost:5173/`; browser navigation returned `net::ERR_CONNECTION_REFUSED`.
- Windows PowerShell 5.1 AST parsing of all three launcher files — **3 passed, 0 parse errors**.
- `Invoke-WebRequest -Uri http://127.0.0.1:8000/health -TimeoutSec 3 -UseBasicParsing` and the equivalent calls for `http://127.0.0.1:8010/health` and `http://127.0.0.1:5173/` — all blocked with `An attempt was made to access a socket in a way forbidden by its access permissions.`
- Browser opening `http://127.0.0.1:5173` — failed with `net::ERR_CONNECTION_REFUSED`.
- `npm run build` — **passed**, TypeScript + Vite; generated main chunk 738.45 kB and Vite emitted the >500 kB advisory.
- `npm run lint` — **passed**.
- From `backend/`: `.\.venv\Scripts\python.exe -u -m pytest -q tests/test_cases.py tests/test_gateway.py::test_non_citizen_roles_cannot_be_self_assigned_outside_demo tests/test_gateway.py::test_destructive_demo_controls_are_disabled_by_default tests/test_ledger_tamper.py tests/test_job_api.py tests/test_jobs.py tests/test_http_target.py tests/test_http_workflow.py tests/test_redteam.py --basetemp=.pytest-freeze-qa` — **46 passed, 3 deprecation warnings**.
- From `backend/`: `.\.venv\Scripts\python.exe -u -m pytest -q -rs tests/test_socket_http_jobs.py --basetemp=.pytest-freeze-socket` — **1 skipped** because sandbox policy denied local TCP. This is not a passing socket integration test.
- `git diff --check` — **passed** after the QA addendum; Git emitted only LF-to-CRLF working-copy advisory warnings.

### Browser checklist results

The actual UI journey could not be completed because the browser could not connect to the Vite process. Therefore no browser step is marked passed. In particular, create/source display, clean and flawed runs in the UI, human-note save/reload, separate draft generation, browser report verification, delete behavior, refresh persistence, keyboard access, mobile layout, loading/failure states, and visual report consistency remain unverified in a normal local Windows environment.

Backend tests cover the case route/fixture workflow and owner restrictions directly, not through a live socket-backed browser. The test oracle independently checks 100 clean rows and 101 flawed rows; 35/50 approvals in each clean group; 35/50 urban and 20/50 rural approvals in the flawed fixture; all three planted criteria detected; and zero criteria flagged on the clean fixture. Those values apply only to these deterministic fictional fixtures.

### Security and data-boundary review

- The default settings keep demo authentication and destructive ledger controls off. The dedicated local demo launcher explicitly enables both against `backend/var-demo`; never expose that launcher as a shared service. The disabled-by-default and role-label tests passed in the focused run.
- UI copy describes roles as labels, not identity verification, and warns against entering Aadhaar, banking, health, or confidential data. Case notes are plaintext in local SQLite. No real evidence was entered.
- Frontend source contains no private signing-key or JWT-secret access. The backend serves only the public verification key. Source review found case errors are returned as bounded generic messages for fixture failures; runtime request/error logging could not be inspected through the blocked service.
- Deletion semantics and signed-report verification are covered by backend tests. No browser deletion or copied-report tampering step was completed in this QA session.

### Blockers and scope boundary

Live API health, mock-to-backend communication, complete browser workflow, desktop/mobile visual review, keyboard interaction, and runtime log inspection need to be repeated on a Windows desktop environment that permits localhost sockets. The complete backend suite was not run. No claim is made about external services, real beneficiary records, legal violations, discrimination, or formal differential privacy.

### Judge demo steps

1. From the repository root, run `powershell -ExecutionPolicy Bypass -File .\start-mock-target.ps1` in one terminal.
2. Run `powershell -ExecutionPolicy Bypass -File .\start-backend.ps1` in a second terminal. This uses the isolated synthetic database at `backend/var-demo`, enables local demo roles and destructive tamper controls, and must remain local.
3. Run `powershell -ExecutionPolicy Bypass -File .\start-frontend.ps1` in a third terminal and open `http://localhost:5173`.
4. Start a clearly labeled local demo session. Create a case using only a fictional question; choose an evidence source and record provenance without pasting any personal record. Confirm the UI explains those values are user-reported, not verified.
5. Confirm only the SENTINEL fixture is runnable. Run the clean control, then the known-flawed control. Expected fixture-only check: 0 clean flags, 3/3 planted checks signaled; the subgroup rates are 35/50 versus 20/50 in the flawed fixture.
6. Read the limitations and execution/evidence statuses. Save reviewer notes and a clearly labeled fictional owner response, reopen the case, and confirm persistence.
7. Generate the RTI draft and then the grievance draft separately. Review every placeholder and save only synthetic text. Neither draft is submitted by SENTINEL.
8. Verify the signed report. To demonstrate tamper detection, use only the demo-only tamper control against this disposable local database and verify the affected report again. Do not use tamper/reset controls with retained or shared data.
9. Delete the case and confirm its private case record is gone while the signed synthetic report can remain in the ledger. Refresh and verify the case list and ledger behavior.
10. Repeat at desktop/mobile widths and with keyboard-only navigation. These judge steps are still required because they could not be executed in the constrained QA environment.

## Live Windows HTTP verification update — 2026-10-30

This update supersedes the earlier “local TCP blocked” result for this QA session. Running the documented processes with permitted local-network access allowed live checks. The browser UI journey is still not verified.

### Actual services and commands

From the repository root, the following Windows PowerShell 5.1 launch commands were run in separate processes:

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-mock-target.ps1`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-backend.ps1`
- `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-frontend.ps1`

Actual HTTP outcomes: `GET http://127.0.0.1:8000/health` returned 200; `GET http://127.0.0.1:8010/health` returned 200 and the expected synthetic model id/version; `GET http://localhost:5173/` returned 200 with the Vite app shell. The three launch scripts also passed Windows PowerShell 5.1 parser checks.

A live HTTP call to `POST /audits/fairness/http-demo` with `{"per_cohort":50}` sent predictions through the separate mock service. The first run with the old 2-second default reported 180 baseline timeouts (620/800 baseline completed); this was a genuine reliability defect. The bounded default in `backend/src/sentinel/config.py` is now 10 seconds (the existing maximum). After restarting without a timeout environment override, the same real HTTP audit completed **1,100/1,100**: baseline 800/800, cohorts 300/300, zero failures. Its report identifies `welfare-eligibility-demo` / `synthetic-welfare-v1` and says the scope is local synthetic only.

The startup/API logs recorded 3,120 mock decision requests, all 3,120 returned HTTP 200. API access logs contained 0 server-error responses. Client errors were one expected quota rejection (`429` when the citizen demo role attempted 1,100 probes against its 200-probe cap), one expected 404 after deleting the test case, and four missing favicon 404s. The access logs did not contain request bodies or the checked personal-field names. No real or confidential data was submitted.

### Live case lifecycle over actual HTTP

Using a fictional case and a local demo token, the HTTP workflow confirmed:

- Source and provenance fields round-tripped; external target, uploaded-evidence review, and authorized-record audit prerequisites remained explicitly missing.
- Clean and known-flawed runs completed. The clean fixture had 0 flags; the flawed fixture detected 3/3 planted checks with 0 missed checks. The earlier clean run is correctly marked `SUPERSEDED` after the later run.
- Reviewer notes and a fictional owner response persisted on a subsequent GET.
- Both reports verified before tampering. The demo tamper endpoint changed only the QA-created synthetic report; that report then failed verification. After deleting the case (HTTP 204; subsequent case GET 404), the untouched synthetic report still verified.
- The RTI and grievance generators are separate UI actions in source and the production build passes, but generation, factual review, and reload were not browser-tested. They share one saved editable draft field.

After verification, the QA-created local demo ledger was reset. The live API confirmed **0 reports**, an empty valid chain, and **0 QA cases**, leaving the judge state clean. The local mock/backend/frontend processes are currently available on ports 8010, 8000, and 5173.

### Final automated verification

- From `frontend/`: `npm run build` — **passed**; main chunk 738.45 kB, with Vite's >500 kB advisory.
- From `frontend/`: `npm run lint` — **passed**.
- From `backend/`: `.\.venv\Scripts\python.exe -u -m pytest -q tests/test_cases.py tests/test_gateway.py::test_non_citizen_roles_cannot_be_self_assigned_outside_demo tests/test_gateway.py::test_destructive_demo_controls_are_disabled_by_default tests/test_ledger_tamper.py tests/test_job_api.py tests/test_jobs.py tests/test_http_target.py tests/test_http_workflow.py tests/test_redteam.py --basetemp=.pytest-final-live` — **46 passed, 3 deprecation warnings**.
- From `backend/`: `.\.venv\Scripts\python.exe -u -m pytest -q -m slow tests/test_socket_http_jobs.py --basetemp=.pytest-real-tcp-qa-final2` — **1 passed in 66.85 seconds**. This starts two separate Uvicorn processes, checks the real mock decision contract, completes the 1,100-probe async HTTP audit, verifies the report, exercises the case API, and checks failed/unattempted counters against a dead target with a 50-probe test cap.
- The socket test needed two test-only corrections after the first run: reduce the negative-path cap from 850 (which exceeded the 90-second poll at 700 attempts) to 50 while retaining partial-failure/cap assertions, and allow for the API's two-decimal progress rounding. Final result is the pass above.
- The complete backend suite was not run.

### Browser and presentation status

The in-app browser returned `net::ERR_CONNECTION_REFUSED` for the local Vite URL even while direct HTTP checks succeeded. Native browser automation then stopped because it could not determine the active Windows browser URL confidently enough to enforce navigation policy. No case journey is claimed as completed in the browser. Desktop/mobile layout, keyboard-only use, UI loading/errors, draft generation in the rendered UI, refresh navigation, and visual report consistency still require a manual check in the user's normal browser. The successful live API workflow is useful evidence but is not a substitute for that final UI pass.

## Final verification superseding earlier status — 2026-10-30

The earlier note that the complete backend suite was not run is now superseded. Final command, run from `backend/`: `.\.venv\Scripts\python.exe -u -m pytest -q --basetemp=.pytest-full-final` — **115 passed, 25 deprecation warnings, 112.86 seconds**. This full run includes the slow two-process TCP test. The focused 46-test result and separate live HTTP checks are also recorded above.

The actual HTTP case lifecycle, local mock-target audit, report verification/tamper/deletion, clean-state reset, and all three service health checks completed. The demo database is empty and the local services are still running. Browser-native interaction remains the only pre-submission QA blocker: the automation tool stopped because it could not determine the active Windows browser URL safely. Complete the case journey, refresh/persistence, RTI and grievance screens, desktop/mobile layout, keyboard navigation, and visible failure/loading states manually in the normal desktop browser before claiming a fully browser-verified demo.

## Follow-up hardening — 2026-10-30

Added an export and copy-verification route for sealed report JSON. `POST /verify/report-copy` checks the canonical payload hash and Ed25519 signature using the configured public key. It explicitly does not claim that findings are true or that the key is independently trusted. The case screen now offers a signed JSON download and JSON-copy verification; the signing-focused route tests cover valid, altered, and structurally invalid copies. Draft generation now confirms before replacing non-empty text in the shared RTI/grievance editor.

Checks rerun after these changes: from `frontend/`, `npm run build` passed (main chunk 740.50 kB; Vite emitted its existing >500 kB advisory) and `npm run lint` passed. From `backend/`, `\.venv\Scripts\python.exe -m pytest tests/test_ledger_tamper.py tests/test_cases.py -q` passed **18 tests** in 3.88 seconds. The earlier full backend result (115 passed) predates this follow-up and was not rerun. Local HTTP health after restarting the documented frontend launcher: API 8000 = 200, mock 8010 = 200, frontend shell 5173 = 200. Browser-level interaction, responsive layout, and keyboard use remain unverified because the available browser automation could not safely identify the active Windows browser URL.

## Browser QA follow-up — 2026-10-30

After the user confirmed the app was open at `localhost:5173`, the actual browser workflow was partially completed with fictional data. A synthetic case was created with source `SENTINEL synthetic demonstration`; the displayed provenance and missing-prerequisite explanations matched the entered case. In the UI, the known-flawed control displayed **3/3** known defects detected, **0** missed, and **0** clean-fixture flags; the clean control displayed **no signal** and **0** actual check flags. The page displayed the limitation that these fixed-fixture counts are not general accuracy estimates. The signed report integrity button reported the report intact, and the signed JSON download visibly completed (9.1 kB).

The browser-control tool then lost foreground/window certainty. The report-copy file picker could not be safely operated. Therefore uploaded-copy verification (including an altered copy), draft generation and replacement confirmation, notes/owner-response persistence, refresh navigation, mobile layout, and keyboard navigation remain **not verified in the rendered browser**. Do not mark them passed based only on code or API tests.

Cleanup was completed through the local demo API after confirming the exact case title/target and exactly two reports of type `synthetic_case_fixture_audit`, both created during this QA. The QA case was deleted and the two synthetic reports were reset using enabled demo-only controls. Final local state: **0 cases, 0 reports, valid empty ledger**. No real or confidential data was used.

## Final QA continuation — 2026-10-31

The report-copy verifier now accepts the exact canonical signed payload alongside the browser-parsed JSON. This fixes a real serialization mismatch: JavaScript turns signed `0.0` values into `0`, which changed the canonical bytes and caused valid report copies to fail. A regression test covers an unmodified browser-style copy passing and an altered copy failing.

Verification performed against the current source:

- Backend non-slow suite: **87 passed, 31 deselected**.
- Slow membership/red-team suite: **25 passed**.
- Separate two-process local TCP HTTP workflow: **1 passed** with local-network access. A restricted run could not open the local socket and was skipped; the permitted rerun passed.
- Focused ledger integrity suite: **16 passed** (subset; do not add to the totals above).
- Frontend lint and production build passed. Vite reports the existing main bundle exceeds its 500 kB advisory threshold (740.50 kB); this did not fail the build.
- The complete pytest suite was attempted but did not finish in the available run; do not treat the partial output as a full-suite pass. The checks above are the confirmed results.

Live API checks with fictional fixture data: clean fixture produced zero signals; known-flawed fixture produced 3/3 planted signals, zero missed defects, and zero clean-fixture false flags. Notes and owner response saved and read back. A valid exported report copy verified, an altered copy failed verification, deleting the case returned 204, and its already signed synthetic report remained verifiable. Demo state was reset afterward: **0 cases, 0 reports, valid empty ledger**. API, mock target, and frontend health endpoints returned 200 during the live service check.

The rendered browser flow is only partly verified. Case creation, provenance display, prerequisites, both fixtures, signed report verification, and signed JSON download were observed in the browser in the earlier QA pass. In the latest browser pass, the grievance draft displayed placeholders and identified the investigation question as unverified. RTI rendering, report-copy upload and altered-file interaction, replacement confirmation, notes persistence after a hard refresh, refreshed-session navigation, desktop/mobile layout, keyboard access, and rendered loading/failure states remain unverified. Do not claim a complete browser QA pass until these are manually checked in the Windows browser.

Scope remains fictional synthetic fixtures only. No real beneficiary evidence, government service, or personal data was used. These results do not establish real-world discrimination, legal violations, or general model accuracy.

### Reproduction commands for this continuation

Run the backend commands from `backend/`:

```powershell
.\.venv\Scripts\python.exe -u -m pytest -q -m "not slow" --basetemp=.pytest-a2z-no-slow
.\.venv\Scripts\python.exe -u -m pytest -q -m slow tests/test_membership.py tests/test_redteam.py --basetemp=.pytest-a2z-slow-models
.\.venv\Scripts\python.exe -u -m pytest -q tests/test_ledger_tamper.py --basetemp=.pytest-copy-regression3
.\.venv\Scripts\python.exe -u -m pytest -q -rs -m slow tests/test_socket_http_jobs.py --basetemp=.pytest-a2z-socket-escalated
```

Run the frontend commands from `frontend/`: `npm run lint` and `npm run build`. Live endpoint checks used PowerShell `Invoke-WebRequest` against `http://localhost:8000/health`, `http://localhost:8010/health`, and `http://localhost:5173`; the final permitted check returned **200** from all three. The new Vite process started during this continuation was stopped after confirming the existing service on port 5173.

### Browser access boundary — 2026-10-31

A final attempt to complete the remaining UI checks was blocked by the Codex desktop setting: the computer-use environment reports **“Local browser use is disabled in Work settings.”** A local headless Chrome attempt did not establish a browser session, was stopped, and produced no valid QA results; it must not be counted as passed. No application code was changed for this attempt. A read-only API check afterward confirmed **0 cases, 0 reports**, and demo controls enabled; the API, mock target, and frontend returned **200**. Remaining browser checks still require local browser access to be enabled or a manual pass by the user: RTI draft contents, file upload of intact and tampered copies, replacement confirmation, saved notes after reload, desktop/mobile layout, keyboard operation, and visible loading/error behavior.
