# SENTINEL — Judge Demo Cheat Sheet
**IEEE Tech for Tomorrow 2026 | TIPPSS Track**

> **Use the verified demo boundary:** this app audits its own synthetic stand-in, not a government service. Do not repeat older claims below that a result proves a DPDP violation, fraud, discrimination, legal compliance, or court admissibility. See [`AUDIT_REPORT.md`](AUDIT_REPORT.md) for current evidence and safe wording.

## Quick Start (30 seconds)

```powershell
# Terminal 1 — Backend API
cd backend
uv run uvicorn sentinel.api.app:app --port 8000
# → http://127.0.0.1:8000/docs   (Swagger interactive docs)

# Terminal 2 — Frontend UI
cd frontend
npm run dev
# → http://localhost:5173
```

**OR** one-shot CLI demo (no browser needed, ~34s):
```powershell
cd backend
uv run sentinel demo run
```

---

## 3-Minute Live Demo Script

### Minute 1 — "Here's what SENTINEL audits"
Open http://localhost:5173

> *"Government AI systems claim three things: the data is anonymized, decisions are fair, and rejections are explained. SENTINEL checks all three from the outside — no model access, no training data, no cooperation from the operator."*

- Sign in as **Journalist** → quota displayed: 2000 queries, ε ceiling 8.0

### Minute 2 — "Lie #1: It's anonymized"
Click **"Did this system store my information?"**

> *"This runs a LiRA shadow-model attack — the same technique published at IEEE S&P by Carlini et al. It trains 16 reference models on similar data, compares how this system responds to a specific planted record versus held-out records, and reports a z-score."*

- Show z-score > 5, p-value, 95% CI, plain-language summary
- Point out: **"This finding is sealed to the ledger the moment it's generated."**

Then click **"Was I given the real reason?"**

> *"For every rejected applicant, we change only the one feature the system blamed — say, income — keeping everything else identical, and ask if the decision flips. If it doesn't, the stated reason was false."*

- Show: ~1 in 11 income rejections don't flip → explanation fraud detected

### Minute 3 — "The cryptographic guarantee"
Switch to **Auditor console** → Run **Fairness sweep (Red-Team)**

> *"Elderly people living alone rejected 84% of the time against a 39% baseline. That's a 45 percentage-point gap — flagged under IEEE Std 7003-2024."*

Switch to **Verify a report** tab:

> *"Anyone — a journalist, a judge, an RTI activist — can come to this tab, with no account, and verify every sealed report is cryptographically intact. We recompute SHA-256, validate Ed25519 signature, walk the Merkle chain. You cannot silently edit a report after the fact."*

---

## CLI Commands (terminal proof for judges)

```powershell
cd backend

# What is being audited (fully disclosed)
uv run sentinel target

# Run individual audits
uv run sentinel login --role journalist
uv run sentinel audit-membership
uv run sentinel audit-explainability
uv run sentinel audit-fairness

# Privacy accounting
uv run sentinel budget

# View sealed reports
uv run sentinel reports

# Independent verification (no login needed)
uv run sentinel verify

# TAMPER DEMO — alter a report, watch it get caught
uv run sentinel demo tamper

# Citizen-facing plain language view
uv run sentinel show 1 --plain
```

---

## API Smoke Test (PowerShell)

```powershell
# Login
$r = Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/login" `
     -Method POST -ContentType "application/json" `
     -Body '{"subject":"judge","role":"journalist"}'
$token = $r.access_token

# Budget status
Invoke-RestMethod -Uri "http://127.0.0.1:8000/audits/budget" `
  -Headers @{Authorization="Bearer $token"}

# Chain verification (NO auth required — open public)
Invoke-RestMethod -Uri "http://127.0.0.1:8000/verify/chain"

# Open Swagger UI
Start-Process "http://127.0.0.1:8000/docs"
```

---

## Technical Talking Points

### M1 — Membership Inference (LiRA)
- **Method**: Offline one-sided LiRA (Carlini et al., IEEE S&P 2022) + shadow-model null calibration (Shokri et al. 2017)
- **Result**: Canary records z > 5, held-out z ≈ 0; detection AUC 0.997
- **Legal**: Evidence of DPDP Act 2023 violation (memorized personal data)

### M2 — Explainability Gap (Counterfactual Flip Test)
- **Method**: Change only the blamed feature; check if decision changes
- **Result**: ~1 in 11 income-blamed rejections still refused at qualifying income

### M3 — Tamper-Evident Ledger
- **Method**: SHA-256 hash chain + Ed25519 signatures; `previous_hash` inside signed bytes
- **Demo**: Run `sentinel demo tamper` to show live detection

### M4 — Access Gateway
- **Roles**: citizen (100q), journalist (2000q, ε8), certified_auditor (10000q, ε30), gov_self_audit (50000q, ε30)
- **Key property**: Refused audit costs the target ZERO queries

### M5 — Differential Privacy Budget Guardian
- **Method**: Rényi DP accountant; α-minimised conversion to (ε, δ)-DP
- **Result**: ε=10.32 actual vs 498 naive (48x overstatement averted)

### Red-Team — Synthetic Citizen Engine
- **Method**: Indian-context edge-cases (elderly alone, seasonal income, Aadhaar-unlinked, migrant dual addresses)
- **Standard**: IEEE Std 7003-2024 Subgroup Disparity Ratio
- **Result**: Elderly living alone 84% vs 39% baseline (+45pp flagged)

---

## Disclosure (say this proactively)

> "The demo target is a synthetic stand-in. The disparities are planted by construction to validate the method recovers a known bias — not to claim we discovered an unknown one. Both facts are stated in the tool's own output."

---

## Test Suite

```powershell
cd backend
uv run pytest -m "not slow"   # 59 tests, ~7s
uv run pytest                 # 86 tests, ~40s
```
