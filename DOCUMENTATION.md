# SENTINEL — Technical Documentation

Implementation reference for the SENTINEL prototype: architecture, API surface,
configuration, and setup.

- **What it is:** an external auditor for public-sector AI systems that tests
  whether a deployed system's claims about itself are true, using query access
  only.
- **What it is not:** a governance dashboard for the system's own operator. The
  entire design assumes the audited party is _not_ cooperating.

**Contents**

1. [Architecture](#1-architecture)
2. [The black-box constraint](#2-the-black-box-constraint)
3. [Modules](#3-modules)
4. [API reference](#4-api-reference)
5. [Configuration, secrets and keys](#5-configuration-secrets-and-keys)
6. [Setup from scratch](#6-setup-from-scratch)
7. [Running the system](#7-running-the-system)
8. [Testing](#8-testing)
9. [Request lifecycle](#9-request-lifecycle)
10. [Correctness constraints](#10-correctness-constraints)
11. [Deviations from the specification](#11-deviations-from-the-specification)

---

## 1. Architecture

```
                       ┌──────────────────────────────┐
   Citizen / Auditor →  │  React SPA (Vite, Tailwind)  │
                       └──────────────┬───────────────┘
                                      │ HTTPS/JSON
                       ┌──────────────▼───────────────┐
                       │  M4  Identity & access gate  │  JWT, roles, rate limit
                       └──────────────┬───────────────┘
                       ┌──────────────▼───────────────┐
                       │  M5  DP budget preflight     │  refuses BEFORE probing
                       └──────────────┬───────────────┘
          ┌───────────────────────────┼───────────────────────────┐
   ┌──────▼──────┐            ┌───────▼───────┐          ┌────────▼────────┐
   │ M1 Member-  │            │ M2 Explain-   │          │ RT  Fairness    │
   │    ship     │            │    ability    │          │     red-team    │
   └──────┬──────┘            └───────┬───────┘          └────────┬────────┘
          └───────────────────────────┼───────────────────────────┘
                                      │  query access only
                       ┌──────────────▼───────────────┐
                       │   Target system under audit  │
                       └──────────────┬───────────────┘
                       ┌──────────────▼───────────────┐
                       │  M3  Hash chain + Ed25519    │  seal every finding
                       └──────────────┬───────────────┘
                       ┌──────────────▼───────────────┐
                       │  Public verification (open)  │  no auth required
                       └──────────────────────────────┘
```

### Source layout

```
backend/src/sentinel/
├── config.py                  Settings (env-overridable via SENTINEL_*)
├── cache.py                   Disk memoisation for expensive artifacts
├── cli.py                     Typer CLI + demo driver
├── data/welfare.py            Synthetic welfare-eligibility dataset
├── target/
│   ├── system.py              Stand-in system under audit
│   └── registry.py            BlackBoxClient protocol, cached loaders
├── engines/
│   ├── membership/            M1: shadow.py, lira.py, decoys.py, engine.py
│   ├── explainability/        M2: domain.py, perturb.py, engine.py
│   └── redteam/               RT: taxonomy.py, generator.py, engine.py
├── ledger/                    M3: hashing, merkle, signing, models, service
├── gateway/                   M4: auth, roles, budget, deps
├── privacy/                   M5: accountant, mechanisms, guardian
├── reporting/                 intervals.py (Wilson/bands), plain.py
└── api/                       app.py + routes/{auth,audits,ledger,verify}.py

frontend/src/
├── api/client.ts              Typed API client; token held in memory only
├── pages/                     CitizenPortal, AuditorConsole, VerifyReport
├── App.tsx                    Shell, tabs, session bar
└── index.css                  Tailwind v4 @theme (editorial palette)
```

### Technology

| Layer     | Choice                            | Why                                                            |
| --------- | --------------------------------- | -------------------------------------------------------------- |
| API       | FastAPI + Uvicorn                 | Auto-generated OpenAPI docs; native async; Python ML ecosystem |
| ML        | scikit-learn, NumPy, SciPy        | The target and shadow models are random forests                |
| Storage   | SQLite + SQLAlchemy               | Append-only is enforced by the hash chain, not the DB engine   |
| Crypto    | `cryptography` (Ed25519, SHA-256) | Standard primitives, no custom crypto                          |
| Auth      | PyJWT (HS256), scrypt             | scrypt via stdlib `hashlib` avoids a passlib dependency        |
| CLI       | Typer + Rich                      | The demo path                                                  |
| Frontend  | React 19, Vite 8, Tailwind v4     | SPA, self-hosted fonts, no runtime CDN                         |
| Packaging | uv                                | Lockfile-based, fast, creates the venv itself                  |

---

## 2. The black-box constraint

SENTINEL's central claim is that it audits without privileged access. That claim
is enforced structurally rather than by convention.

`backend/src/sentinel/target/registry.py` defines:

```python
@runtime_checkable
class BlackBoxClient(Protocol):
    def predict_proba(self, x: np.ndarray) -> np.ndarray: ...
```

Audit engines are typed against this protocol. It exposes **only** the ability to
send inputs and read output probabilities — no weights, no gradients, no training
data, no internal state. An engine that reached for model internals would not
type-check against the interface it is written to.

The test suite carries the same discipline: the dataset (including
`canary_indices`, the ground truth M1 is scored against) is available to _tests_
so results can be checked, but is never passed to an engine.

For a real deployment, an HTTP-backed implementation of this protocol audits a
live public API endpoint. The engines need no changes.

---

## 3. Modules

### M1 — Membership & memorization (`engines/membership/`)

Answers: _did this system memorise this specific person's record?_

Method: **offline one-sided LiRA** (Carlini et al., S&P 2022), with shadow-model
calibration following Shokri et al. (S&P 2017).

1. Train 16 shadow models on freshly generated data using the target's
   hyperparameters. No shadow sees the target's training rows, so every shadow
   is an OUT-model for every record probed.
2. Query the target once for the record's true-label confidence.
3. Convert to logit space — raw confidences saturate near 1.0 and are badly
   non-Gaussian.
4. Fit a Gaussian null from the shadow confidences.
5. Apply **global calibration** (see below), then report a z-score, one-sided
   p-value, and bootstrap interval.

**Global calibration is mandatory and non-obvious.** Scoring against the raw
shadow null measures _"is the target more confident than my shadows"_ — which is
true of **every** member record, because the target is deliberately more overfit
than any shadow. Uncalibrated, this flagged **82% of ordinary training records**.
`GlobalCalibration.from_reference()` first profiles the target-minus-null gap on
auditor-synthesised non-member records, then scores each probe relative to that
baseline.

**Verdicts are keyed on z-score, not the leakage probability.** The probability
is a normal CDF: everything past z≈2.5 saturates to 1.0, and publishing that as
the headline would read as certainty. At z ≥ 5 the populations separate cleanly.

Measured: planted canary **z = 7.73** ("strong evidence"); held-out records
cluster near z = 0, with 91.5% at "no evidence"; detection AUC 0.997.

### M2 — Explainability consistency (`engines/explainability/`)

Answers: _is the reason given for a rejection the real one?_

For each rejected applicant, take the system's stated reason, change **only** that
feature to its most favourable plausible value, resubmit, and check whether the
decision flips. No flip means the stated reason was not the operative cause — the
applicant was told something that would not have changed their outcome.

Counterfactuals are clamped to the 5th–95th percentile of the **auditor's own**
reference sample. An auditor cannot see the target's training data, so deriving
ranges from it would break the black-box premise; and an implausible probe (income
set to zero) would produce an artefact rather than a finding.

Scoped to rejections only: the stand-in system returns one canned reason for every
approval, so including approvals would inflate the denominator with untestable
cases.

Measured: `monthly_income` reliability 0.906 over n=436 — _"about 1 in 11 people
told 'monthly income is why you were rejected' would still have been rejected
after that was fixed."_

### M3 — Tamper-evident ledger (`ledger/`)

Every finding is hashed, chained, and signed at the moment it is produced.

```python
signed_payload = {
    "schema_version": 1,
    "sequence": n,
    "previous_hash": prev,     # INSIDE the signed bytes
    "created_at": ...,
    "audit_type": ...,
    "target_id": ...,
    "body": {...},
}
payload_bytes = canonical_bytes(signed_payload)   # sorted keys, no whitespace
report_hash   = sha256(payload_bytes)
signature     = ed25519_sign(payload_bytes)
```

Two decisions carry the security property:

- **Chain position is inside the signature.** `previous_hash` and `sequence` are
  part of the signed bytes, so reordering or splicing reports invalidates
  signatures rather than merely breaking a linkage check. An attacker with
  database write access can recompute linkage; they cannot forge a signature.
- **Verification reads the stored bytes.** `payload_json` is stored verbatim and
  verified as-is, never re-serialised from parsed fields — re-serialising would
  reintroduce the determinism risk that canonical encoding exists to remove.

`verify_chain()` performs four checks per row: stored hash matches stored bytes,
signature validates, `previous_hash` links correctly, and sequence numbers are
dense (catching deletions).

### M4 — Identity & access gateway (`gateway/`)

| Role                | Queries/audit | Audits/day | Max ε |
| ------------------- | ------------- | ---------- | ----- |
| `citizen`           | 200           | 3          | 2.0   |
| `journalist`        | 2,000         | 20         | 8.0   |
| `certified_auditor` | 20,000        | 100        | 30.0  |
| `gov_self_audit`    | 50,000        | 500        | 60.0  |

JWT (HS256) with `sub`/`role`/`exp`/`jti`. The algorithm list is pinned on decode,
which forecloses the `alg: none` and HS/RS confusion attacks. Rate limiting is a
SQLite table rather than Redis — one fewer service, and this counter is not hot.

Dependency chain: `require_auth` → `require_role` → `enforce_budget`. Engines are
reachable only through routers declaring these, and the budget check fires
**before** any probe, so a refused audit costs the target zero queries.

### M5 — DP budget guardian (`privacy/`)

Tracks cumulative privacy loss per target using a **Rényi DP accountant**.

RDP composes _additively in α-space_; conversion to (ε, δ)-DP happens once at the
end, minimising over α with the tight Balle/Canonne bound. This is materially
different from summing ε per query: at ~11,800 queries, proper composition reports
**ε = 15.77** where naive linear summation would claim **998.6** — a 63× overstatement
that would falsely exhaust every budget and deny legitimate audits.

Noise is applied to **aggregate statistics only** (counts, rates, means). Noising
a per-record leakage score would destroy the finding it is meant to protect, and
is incoherent besides — that statistic is _about_ one individual by construction.
Per-record protection comes from access control (M4) and the query budget here.

`dp_noise_multiplier = 40.0` is chosen by working backwards from the audit sizes
the roles permit: at σ=1 a 100-query audit already costs ε≈96, which is not a
privacy guarantee in any meaningful sense.

### RT — Synthetic citizen red-team (`engines/redteam/`)

Generates cohorts of legitimately-eligible applicants who differ from a matched
clean baseline only in documented real-world ways — recent migration, seasonal
income, a missing document, failed Aadhaar seeding, elderly and isolated, or
several at once. Cohorts start as copies of real baseline applicants so a
rejection gap cannot be explained by the cohorts being different kinds of people.

Reported with a two-proportion z-test and Wilson intervals. A cohort is flagged
only if the gap is **both** statistically significant and ≥5 points — at n=500 a
one-point gap can be significant while meaning nothing to a citizen.

Measured: elderly-isolated applicants rejected **83.6% vs 38.8%** baseline; the
`address_mismatch` control cohort shows **−0.4% (p = 0.55)**, i.e. no disparity —
evidence the test discriminates rather than flagging everything.

**Disclosure:** on the stand-in target these disparities are _by construction_ —
the synthetic eligibility rule rewards Aadhaar seeding and complete documents. This
demonstrates the method recovers a known planted bias, exactly like the M1 canary.
It is not the discovery of an unknown one, and the tool says so in its own output.

---

## 4. API reference

Base URL `http://localhost:8000`. Interactive docs at `/docs`.

Auth: send `Authorization: Bearer <token>`. Obtain one from `POST /auth/login`.

### Public — no authentication

| Method | Path                         | Purpose                              |
| ------ | ---------------------------- | ------------------------------------ |
| `GET`  | `/health`                    | Liveness probe                       |
| `GET`  | `/verify/chain`              | Verify the entire ledger             |
| `GET`  | `/verify/reports/{sequence}` | Verify one report                    |
| `GET`  | `/verify/public-key`         | Ed25519 key signatures check against |
| `GET`  | `/ledger/root`               | Current published Merkle root        |

`/verify/*` is deliberately open. A tamper-evident ledger whose verification
requires the operator's permission is not independently verifiable.

### Authenticated

| Method | Path                         | Module | Purpose                          |
| ------ | ---------------------------- | ------ | -------------------------------- |
| `POST` | `/auth/login`                | M4     | Issue a session token            |
| `POST` | `/audits/membership`         | M1     | Test memorisation of one record  |
| `POST` | `/audits/explainability`     | M2     | Test whether stated reasons hold |
| `POST` | `/audits/fairness`           | RT     | Edge-case cohort disparity sweep |
| `GET`  | `/audits/budget`             | M5     | Cumulative privacy loss          |
| `GET`  | `/ledger/reports`            | M3     | List sealed reports              |
| `GET`  | `/ledger/reports/{sequence}` | M3     | Fetch one sealed report          |

### Examples

**Login**

```bash
curl -X POST localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"subject":"reporter","role":"certified_auditor"}'
```

```json
{
    "access_token": "eyJ…",
    "token_type": "bearer",
    "role": "certified_auditor",
    "queries_per_audit": 20000,
    "audits_per_day": 100,
    "max_epsilon": 30.0
}
```

Roles: `citizen`, `journalist`, `certified_auditor`, `gov_self_audit`.

> The MVP trusts the claimed role. Production would use email+OTP, with
> DigiLocker verification for the certified tier. What _is_ real is the
> enforcement: whatever role a token carries, its quotas are applied on every
> request.

**Membership audit** — `record` is in the target's feature order:
`[monthly_income, household_size, land_holding_acres, years_at_address,
aadhaar_seeded, documents_complete, prior_scheme_count, age]`

```bash
curl -X POST localhost:8000/audits/membership \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"record":[221305.94,14,28.8,56.42,0,0,8,93.81],
       "label":0,"record_id":"my-record","with_decoys":true}'
```

```json
{
    "report": {
        "audit_type": "membership_inference",
        "findings": [
            {
                "record_id": "my-record",
                "memorization_z": 7.73,
                "p_value": 5.4e-15,
                "leakage_score": 1.0,
                "leakage_score_ci": [1.0, 1.0],
                "shadow_models": 16,
                "verdict": "strong evidence of memorization",
                "decoy_mean_score": 0.956
            }
        ],
        "plain_language": {
            "what_we_found": "…",
            "what_it_means": "…",
            "what_you_can_do": "…",
            "how_sure_are_we": "…"
        }
    },
    "sealed": { "sequence": 0, "report_hash": "…", "signature": "…" }
}
```

`memorization_z` is the primary quantity; `leakage_score` is secondary and
saturates. No finding carries a boolean "leaked" field.

**Explainability audit** — `{"sample_size": 1500}` (50–5000). Returns per-feature
`reliability`, `mismatch_rate`, Wilson `mismatch_rate_ci`, and a citizen-readable
`headline`.

**Fairness audit** — `{"per_cohort": 500}` (50–2000). Returns per-cohort
`rejection_rate`, `disparity`, `p_value`, `flagged`, plus the `disclosure`.

**Budget** — `GET /audits/budget` returns `epsilon_spent`, `max_epsilon`,
`optimal_alpha`, `naive_linear_epsilon`, and `composition_saving`.

### Status codes

| Code  | Meaning                                                       |
| ----- | ------------------------------------------------------------- |
| `401` | Missing, malformed, expired, or tampered token                |
| `403` | Role not permitted for this action                            |
| `422` | Malformed body (e.g. wrong feature count)                     |
| `429` | Rate limit or privacy budget exceeded — **no probe was sent** |

---

## 5. Configuration, secrets and keys

### External services: none

**SENTINEL requires no external API keys, no third-party accounts, no SaaS
credentials, and no external connection strings.** There is no OpenAI key, no
cloud provider, no managed database, no analytics, no CDN. Fonts are self-hosted
so even the browser makes no third-party request. Everything runs locally or in
your own containers. This is a deliberate property: a tool auditing other people's
privacy practices should not itself phone home.

### Settings

All settings live in `backend/src/sentinel/config.py` and are overridable with
`SENTINEL_`-prefixed environment variables or a `backend/.env` file.

| Variable                       | Default                       | Notes                                     |
| ------------------------------ | ----------------------------- | ----------------------------------------- |
| `SENTINEL_JWT_SECRET`          | dev placeholder               | **Must be overridden in any deployment.** |
| `SENTINEL_JWT_ALGORITHM`       | `HS256`                       | Pinned on decode                          |
| `SENTINEL_JWT_TTL_SECONDS`     | `3600`                        | Session lifetime                          |
| `SENTINEL_DATABASE_URL`        | `sqlite:///…/var/sentinel.db` | Any SQLAlchemy URL                        |
| `SENTINEL_DP_DELTA`            | `1e-5`                        | δ in (ε, δ)-DP; well below 1/n            |
| `SENTINEL_DP_NOISE_MULTIPLIER` | `40.0`                        | σ for query accounting                    |
| `SENTINEL_SHADOW_COUNT`        | `16`                          | Shadow models for M1                      |
| `SENTINEL_SHADOW_TRAIN_SIZE`   | `4000`                        | Records per shadow                        |
| `SENTINEL_VAR_DIR`             | `backend/var`                 | Runtime state root                        |

### The one secret that matters

`SENTINEL_JWT_SECRET` is the only true secret in the system.

The in-source default is a **known, public placeholder**. Anyone holding it can
mint a `gov_self_audit` token with the largest query allowance and privacy
ceiling. It must be replaced in any deployment reachable by anyone else:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
export SENTINEL_JWT_SECRET=<that value>
```

Use at least 32 bytes: HS256 with a shorter key weakens the signature (RFC 7518
§3.2).

### Cryptographic keys

An Ed25519 keypair is generated on first run into `backend/var/keys/`.

| File                  | Committed?            | Why                                                   |
| --------------------- | --------------------- | ----------------------------------------------------- |
| `ed25519_private.pem` | **Never**             | Signs reports. Compromise means forged findings.      |
| `ed25519_public.pem`  | **Yes, deliberately** | Verification requires a key the reader already holds. |

Committing the public key is a design decision, not an oversight. If the key were
only ever served by our own API, a compromised server could hand out a key
matching forged reports — which would defeat signing entirely. `.gitattributes`
pins the PEM to LF so line-ending conversion cannot corrupt verification material.

**Never rotate the private key on a live ledger.** Every previously sealed report
would fail verification, which is indistinguishable from tampering.

Note that a fresh Docker volume mints a _new_ keypair, so reports sealed there
verify against that deployment's key rather than the committed one. That is
correct for a real deployment. To demo against the committed key, mount the host
keys read-only (see the commented line in `docker-compose.yml`).

---

## 6. Setup from scratch

### Prerequisites

| Tool                             | Version | Needed for              |
| -------------------------------- | ------- | ----------------------- |
| Python                           | 3.12+   | Backend                 |
| [uv](https://docs.astral.sh/uv/) | 0.11+   | Python packaging        |
| Node.js                          | 22+     | Frontend                |
| Docker                           | 24+     | Optional container path |

Install `uv`:

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
# Windows PowerShell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Backend

```bash
cd backend
uv sync
```

`uv sync` reads `pyproject.toml` + `uv.lock`, **creates the virtual environment at
`backend/.venv` itself**, installs every pinned dependency, and installs the
`sentinel` package in editable mode. You do **not** need `python -m venv`,
`pip install`, or to activate anything — `uv run <cmd>` uses the venv
automatically.

To activate it anyway (e.g. for an IDE):

```bash
source .venv/bin/activate      # macOS/Linux
.venv\Scripts\activate         # Windows
```

Verify:

```bash
uv run sentinel --help
uv run pytest -m "not slow"    # 59 tests, ~5s
```

### Frontend

```bash
cd frontend
npm install
npm run dev                    # http://localhost:5173
```

The frontend expects the API at `http://127.0.0.1:8000`. Override with
`VITE_API_URL` in `frontend/.env`.

### First run

The first audit trains the target model and 16 shadow models (~11s), cached to
`backend/var/artifacts/` (~450 MB) and reused thereafter. Warm the cache with:

```bash
cd backend && uv run sentinel demo run
```

---

## 7. Running the system

### CLI — the demo path

Fastest and most reliable: no daemon, no ports, no network. Runs in ~12 seconds.

```bash
cd backend

uv run sentinel demo run          # everything end to end
uv run sentinel demo tamper       # alter a sealed report, watch verification fail
uv run sentinel demo reset        # clear the ledger

uv run sentinel target                  # what is under audit (disclosed)
uv run sentinel login --role journalist # M4: identity + quota
uv run sentinel audit-membership        # M1
uv run sentinel audit-explainability    # M2
uv run sentinel audit-fairness          # RT
uv run sentinel budget                  # M5
uv run sentinel reports                 # sealed findings
uv run sentinel verify                  # M3 verification
uv run sentinel show 1 --plain          # citizen-facing version
```

### API + web

```bash
# terminal 1
cd backend && uv run uvicorn sentinel.api.app:app --reload
# terminal 2
cd frontend && npm run dev
```

Frontend `http://localhost:5173`, OpenAPI docs `http://localhost:8000/docs`.

### Docker

```bash
export SENTINEL_JWT_SECRET=$(python -c "import secrets;print(secrets.token_hex(32))")
docker compose up --build
```

Frontend `http://localhost:5173`, API `http://localhost:8000`. The backend has a
healthcheck and the frontend waits for it. Artifacts are bind-mounted read-only
rather than baked into the image — the shadow cache alone is ~428 MB.

```bash
docker compose down       # stop
docker compose down -v    # stop and discard ledger + keys
```

---

## 8. Testing

```bash
cd backend
uv run pytest -m "not slow"   # 59 tests, ~5s — the working loop
uv run pytest                 # 86 tests, ~30s — includes shadow training
uv run pytest --cov=sentinel
```

Tests marked `slow` train the shadow ensemble on first run and are deselected by
default. Session-scoped fixtures back onto the disk cache.

| File                     | Covers                                               |
| ------------------------ | ---------------------------------------------------- |
| `test_membership.py`     | Canary detection, calibration, trap #1 wording       |
| `test_explainability.py` | Mismatch detection, in-domain probes (trap #4)       |
| `test_ledger_tamper.py`  | Chain integrity, splice/delete detection (trap #3)   |
| `test_gateway.py`        | 401/403/429, engine never invoked when refused       |
| `test_accountant.py`     | Sub-linear composition (trap #2), budget enforcement |
| `test_redteam.py`        | Disparity detection, control cohort stays clean      |
| `test_e2e_demo.py`       | The full demo path                                   |

Frontend:

```bash
cd frontend
npx tsc --noEmit
npm run build
```

---

## 9. Request lifecycle

`POST /audits/membership` traced end to end:

1. **Authenticate** (`gateway/deps.py::require_auth`) — decode the JWT with a
   pinned algorithm. Failure → `401`.
2. **Plan the cost** — 1 record query + 20 decoys + 500 calibration probes.
   Calibration counts: those are real queries against the target.
3. **Rate limit** (`gateway/budget.py`) — daily audits and per-audit query
   ceiling for the role. Failure → `429`.
4. **Privacy preflight** (`privacy/guardian.py`) — project cumulative ε if this
   audit ran; refuse if it would exceed the role ceiling. Failure → `429`.
   **Nothing has touched the target yet**, so a refusal leaks nothing.
5. **Load target and engine** — only now, after the request is known to be
   permitted. Shadow ensemble comes from the disk cache.
6. **Calibrate** — profile the target's global confidence offset against
   auditor-synthesised non-members.
7. **Probe** — one batched `predict_proba` call for the record, one for decoys.
8. **Score** — logit transform, Gaussian null, calibrated z, bootstrap interval.
9. **Translate** (`reporting/plain.py`) — restate for a non-technical reader.
10. **Seal** (`ledger/service.py`) — canonical-encode, chain, sign, persist.
11. **Record spend** — commit ε against the target; count the audit for the role.
12. **Respond** — report plus `{sequence, report_hash, signature}`.

Anyone can then `GET /verify/chain` with no credentials.

---

## 10. Correctness constraints

Four requirements from the specification that are easy to get subtly wrong. Each
is enforced structurally, with a regression test.

**1 — Membership results are probabilistic, never absolute.**
`RecordScore` has no boolean field. Verdicts are evidence bands with bootstrap
intervals, keyed on z-score rather than a saturating probability. Plain-language
templates never contain "leaked" or "confirmed". _Tests:_
`test_findings_carry_no_boolean_leaked_field`,
`test_verdict_wording_never_asserts_certainty`.

**2 — Privacy budgets compose properly.**
RDP composes additively in α-space with an α-minimised conversion. Linear
ε-summation overstates spend by up to 63× at audit scale. _Test:_
`test_composition_is_sublinear`.

**3 — Chain position is signed, not appended.**
`previous_hash` and `sequence` are keys of the payload _before_ canonical
encoding, so reordering invalidates signatures rather than only breaking linkage.
_Test:_ `test_swapping_two_reports_invalidates_the_signature`.

**4 — Perturbations stay within realistic ranges.**
Counterfactuals are clamped to `[p5, p95]` of the auditor's own reference sample;
no code path can emit an out-of-domain probe. _Test:_
`test_every_counterfactual_stays_within_the_plausible_range`.

---

## 11. Deviations from the specification

Documented rather than hidden — each is a considered choice.

**Opacus and ML Privacy Meter are not dependencies.** Opacus is a PyTorch
_DP-SGD training_ library; nothing here trains with DP. Importing it would pull in
all of PyTorch to reach one accountant class. The RDP accountant is ~60 lines
implemented directly. ML Privacy Meter is PyTorch/TF-oriented with an unstable
API; LiRA is ~80 lines. Both remain the methodological references.

**M2 is counterfactual perturbation testing, not SHAP.** The specification says
"SHAP/LIME-style"; no Shapley values are computed. Perturbation directly tests the
causal claim being made and needs no extra library. The accurate name is used
throughout, because a reviewer who knows SHAP will ask.

**SQLite, not PostgreSQL.** Append-only is enforced by the service layer and hash
chain, not the storage engine. SQLite gives identical guarantees with no container.

**Offline one-sided LiRA, not full LiRA.** Full LiRA needs IN- and OUT-models per
target record, which is infeasible at audit time. The offline variant is the
standard practical simplification.

**No Redis.** The rate limiter is a SQLite table. One fewer service.

**"Court-admissible-style" keeps its hedge.** A signature proves a report was not
altered after creation. It proves nothing about whether the target was faithfully
represented at query time.

---

## References

- Shokri et al., _Membership Inference Attacks Against ML Models_, S&P 2017
- Carlini et al., _Membership Inference Attacks From First Principles_ (LiRA), S&P 2022
- Mironov, _Rényi Differential Privacy_, CSF 2017
- Balle et al., _Hypothesis Testing Interpretations and Rényi DP_, AISTATS 2020
- IEEE/UL 2933-2024 (TIPPSS); IEEE 7003-2024; NIST AI RMF 1.0
- India's DPDP Act, 2023
