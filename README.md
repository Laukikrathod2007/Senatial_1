# 🛡️ SENTINEL — Algorithmic Trust & Integrity Layer for Public AI

[![Python Version](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)](https://www.python.org/)
**SENTINEL** is a hackathon prototype for demonstrating algorithmic audit methods against a locally trained synthetic welfare-eligibility model.

**Scope:** this checkout does not connect to a government service, does not use real applicant data, and does not establish that a particular public service uses AI. Audit outputs describe the synthetic stand-in only. The login lets a demo user select a role; it does not verify identity or auditor credentials. SENTINEL is not DPDP-certified and its outputs are not legal findings or proof of discrimination.

---

## 🚀 Quick Links
* 📘 **Verified demo script:** [`PRESENTATION_GUIDE.md`](PRESENTATION_GUIDE.md)
* 🧪 **Audit evidence:** [`AUDIT_REPORT.md`](AUDIT_REPORT.md) and [`IMPLEMENTATION_REPORT.md`](IMPLEMENTATION_REPORT.md)
* Remote deployments have not been checked and may not match this source tree.

---

## 🏛️ System Architecture

The prototype combines synthetic-model audit tests, access quotas, and a report-integrity ledger. This architecture is not a certification or claim of conformance to an AI governance standard.

```
       [ Citizen Portal ]        [ Auditor Console ]
                │                         │
                └───────────┬─────────────┘
                            ▼
                [ M4 Demo Gateway ]
             (JWT + role quotas, demo roles)
                            │
                            ▼
              [ M5 Query-Budget Estimate ]
                 (not formal DP)
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     [ M1 Privacy ]   [ M2 Consistency ] [ RT Fairness ]
      (LiRA Audit)     (Counterfactual)   (Subgroup Sweep)
            │               │               │
            └───────────────┼───────────────┘
                            ▼
                [ M3 Signed Reports ]
              (integrity check, not truth)
```

### Prototype components and limits:

| Module | What the code does | Limit |
|---|---|---|
| **M1 Membership inference** | Compares confidence with shadow-model references and reports a calibrated signal. | Synthetic model only; not proof a real person's data was used. Calibration queries are counted. |
| **M2 Reason consistency** | Changes the feature named in a synthetic explanation and measures whether the prediction flips. | No-flip does not prove the reason false or establish the model's true cause. |
| **RT Cohort stress test** | Computes rejection-rate differences and intervals for generated cohorts. | Synthetic cohorts and planted rules; disparity is not causal discrimination evidence. |
| **M3 Report integrity** | Canonically hashes and Ed25519-signs reports; checks chain integrity and computes a Merkle root. | Integrity is not truth; root is not externally anchored. |
| **M4 Demo access quotas** | Validates JWTs and applies role-based query/rate limits. | Non-citizen roles are caller-selected only in explicit local demo mode; identities are not verified. |
| **M5 Query-budget prototype** | Contains RDP accounting and aggregate-noise helpers. | Audit routes return deterministic predictions and do not apply the noise helper; no formal DP guarantee. |

---

## 🏁 How to Run Locally

### Prerequisites
* **Python:** v3.12
* **Node.js:** v20.19+ or v22.12+
* **Package Manager:** `npm` + `uv` (recommended)

### 1. Start the isolated local demo backend
```powershell
# One-time, if backend/.venv does not exist:
Set-Location backend
uv sync
Set-Location ..
# From the repository root:
powershell -ExecutionPolicy Bypass -File .\start-backend.ps1
```
This local-only launcher uses a separate backend/var-demo SQLite database, generates a temporary local JWT secret if none is set, and enables the demo roles and destructive tamper controls. It binds to loopback. Never use this launcher on a shared or public service.

### 2. Start the separate mock decision service
In another terminal, run:
```powershell
powershell -ExecutionPolicy Bypass -File .\start-mock-target.ps1
```
It serves the same synthetic welfare model over HTTP on `127.0.0.1:8010`, with its own `backend/var-mock-target` model cache. The SENTINEL backend's local launcher enables the fixed HTTP target; no audit request can provide a URL. The backend accepts only a numeric IPv4 loopback HTTP address, disables redirects, bounds concurrency/timeouts/probe counts and validates response size and schema.

### 3. Start the frontend (React + Vite + Tailwind v4)
```powershell
# One-time, if frontend/node_modules does not exist:
Set-Location frontend
npm install
Set-Location ..
# From the repository root, in a second terminal:
powershell -ExecutionPolicy Bypass -File .\start-frontend.ps1
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### Multilingual Support (English · मराठी · हिंदी)
SENTINEL provides complete trilingual interface support for community volunteers, college grievance cells, and RTI activists in Maharashtra:
* **Instant Language Switcher:** Toggle between English (`en`), Marathi (`mr` / मराठी), and Hindi (`hi` / हिंदी) via the persistent selector in the navigation bar.
* **Localized Legal Drafts:** Generates jurisdiction-appropriate RTI and grievance review drafts with localized legal terminology and intact placeholder brackets (`[...]`).
* **Devanagari Font Fallbacks:** Built-in Unicode fallbacks (`'Nirmala UI'`, `'Mangal'`) prevent font clipping or rendering artifacts on Windows and standard browsers.
* **Safe Local Storage:** The language preference is persisted in browser `localStorage` (`sentinel_language_preference`); session tokens are kept in memory and never stored locally.

### Judge workflow
1. Select your preferred language (English, मराठी, or हिंदी) using the top navigation language selector.
2. Start a clearly labeled local demo session. The selected role is a demo label, not verified identity.
3. On **Audit cases**, create a case with a fictional investigation question (e.g. Maharashtra post-matric scholarship). Select an evidence source and enter provenance without pasting any personal record. The recorded source and access state are user-provided, not independently verified.
4. Read **What can run now**. Only the SENTINEL-owned clean and known-flawed synthetic fixtures execute; the named external service is not queried.
5. Run the clean control and then the known-flawed control. The fixture-specific oracle expects zero flagged criteria on clean data and 3/3 planted checks on flawed data. This is not a general accuracy estimate.
6. Review the criteria, execution/evidence statuses, reproducibility details and limitations. Add fictional reviewer notes or an explicitly fictional owner response, save, return to the case list and reopen.
7. Generate the RTI information request and grievance review draft separately in the active language. They occupy one editable draft field at a time; inspect every placeholder. SENTINEL never files either draft.
8. Verify the signed synthetic report. Delete the case and confirm its case notes disappear while its synthetic report may remain verifiable in the ledger.
9. The **Verify a report** screen can demonstrate tamper detection only against disposable `backend/var-demo` data. The local backend launcher enables destructive demo controls; do not use it on shared or retained data.

The **Auditor console** and **Check a decision** sections are additional synthetic demonstrations, not evidence about a real public service. The optional HTTP boundary demonstration below also uses the synthetic model.

The HTTP route is `POST /audits/fairness/http-demo`, uses the same request body as `/audits/fairness` (`{"per_cohort": 200}`), and is disabled unless `SENTINEL_ENABLE_HTTP_DEMO_TARGET=true`. The mock contract is `POST /api/v1/decide` with `{"features": {<each exact feature name>: <finite number>}}`; success returns `model_id`, `model_version`, `decision` (`eligible` or `ineligible`), `probability_eligible`, and an optional bounded `reason` string.

---

## 🔬 Key Technical Insights

1. **Rigorous Privacy Audits:** We do not report flat boolean data leaks. Membership results are probabilistic evidence bands with bootstrap intervals calculated from a shadow-model ensemble.
2. **Privacy-accounting prototype:** An RDP accountant is present, but its Gaussian cost model does not match the deterministic predictions returned by audit routes. Do not interpret its epsilon as a formal privacy guarantee.
3. **Report integrity:** The `previous_hash` and sequence are signed with the report. Edits to stored rows are detectable while the signing key is trusted. The signature does not prove the report is true, and the Merkle root is not independently anchored.
4. **Realistic Perturbations:** Explanation counterfactuals are clamped to realistic, domain-specific ranges derived from reference cohorts to avoid emitting impossible test applicants.

---

## 🧪 Testing
The backend includes unit and slow engine tests. Run the test suite from `backend`:
```powershell
# Fast unit & integration suite (87 passed in ~40s):
uv run pytest -m "not slow" -q

# Full test suite (including shadow-model training):
uv run pytest
```

Frontend verification (from `frontend`):
```powershell
npm run lint    # oxlint: 0 warnings, 0 errors
npm run build   # tsc -b && vite build
```

### Demo-only ledger controls

Tamper and reset actions modify or delete ledger data. They require SENTINEL_ENABLE_DEMO_CONTROLS=true, SENTINEL_ENABLE_DEMO_AUTH=true, SQLite storage, and a database under a directory ending in demo. The local launcher sets this up for backend/var-demo only. Never enable the flags on a service containing records that must be retained.

---

## 📜 Public Verification Sandbox License
This project is open-source and prepared for the **IEEE Computer Society Pune Section — Tech for Tomorrow 2026 Hackathon (TIPPSS Track)**.
