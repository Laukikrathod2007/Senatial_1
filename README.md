# SENTINEL

**An independent, cryptographically-verifiable trust layer for public-sector AI systems.**

Government bodies increasingly use automated systems to decide who receives a
pension, ration, scholarship, or subsidy. Those systems are described by their
operators as accurate, anonymised, and explainable. None of those claims are
independently checkable by the people they affect.

SENTINEL checks them from the outside — using only the ability to send inputs and
read outputs. No model internals. No training data. No cooperation required from
the operator.

Built for IEEE Computer Society — Tech for Tomorrow 2026 (TIPPSS track).

---

## What it does

| Module | Question it answers | Status |
|---|---|---|
| **M1** Membership & Memorization | Did this system memorise a specific person's record? | Working |
| **M2** Explainability Consistency | Is the reason given for a rejection the real one? | Working |
| **M3** Tamper-Evident Ledger | Can a finding be quietly altered after the fact? | Working |
| **M4** Access Gateway | Who may audit, how often, and how much? | Working |
| **M5** DP Budget Guardian | Does auditing for privacy leaks itself leak privacy? | Working |
| **RT** Synthetic Citizen Red-Team | Which groups does this system fail disproportionately? | Working |

Full technical reference: **[DOCUMENTATION.md](DOCUMENTATION.md)** — architecture,
every API route, configuration and keys, setup from scratch, and troubleshooting.

## Quick start

Fastest path, no daemon and no network:

```bash
cd backend
uv sync                        # creates the venv and installs everything
uv run sentinel demo run       # the whole thing, ~12 seconds
```

Full stack with Docker:

```bash
export SENTINEL_JWT_SECRET=$(python -c "import secrets;print(secrets.token_hex(32))")
docker compose up --build      # frontend :5173, API :8000
```

Or run the two services directly:

```bash
cd backend  && uv run uvicorn sentinel.api.app:app --reload
cd frontend && npm install && npm run dev
```

Individual steps:

```bash
uv run sentinel target                  # what is being audited (disclosed)
uv run sentinel login --role journalist # M4: identity and quota
uv run sentinel audit-membership        # M1: memorisation check
uv run sentinel audit-explainability    # M2: are stated reasons true?
uv run sentinel audit-fairness          # RT: who gets failed?
uv run sentinel budget                  # M5: privacy spent so far
uv run sentinel reports                 # sealed findings
uv run sentinel verify                  # M3: independent verification
uv run sentinel demo tamper             # alter a sealed report, get caught
uv run sentinel show 1 --plain          # the citizen-facing version
```

HTTP API (auto-generated docs at `/docs`):

```bash
uv run uvicorn sentinel.api.app:app --reload
```

## Findings on the demo target

The demo audits a locally-trained stand-in model on synthetic data — disclosed
openly, never presented as a live government system. What is real is the
methodology, which runs unmodified against any classifier exposing predictions.

- **M1** flags planted "canary" records at z > 5 while held-out records sit near
  z = 0. Detection AUC 0.997.
- **M2** finds that ~1 in 11 applicants told *"your income is too high"* would
  still have been rejected at a legally-qualifying income.
- **RT** finds elderly applicants living alone rejected 84% of the time against a
  39% baseline — while a control cohort shows no disparity.
- **M5** reports ε = 10.3 after ~5,900 queries; naive linear accounting would
  claim 498 and falsely refuse further audits.
- **M3** detects any post-hoc edit to a sealed report, verifiable by anyone
  holding only the committed public key.

## Layout

```
backend/
  src/sentinel/
    data/          synthetic welfare-eligibility dataset
    target/        the stand-in system under audit (black-box surface only)
    engines/       M1 membership, M2 explainability, RT red-team
    ledger/        M3 hash chain, Merkle tree, Ed25519 signatures
    gateway/       M4 identity, roles, rate limits
    privacy/       M5 RDP accountant, Laplace mechanisms, budget guardian
    reporting/     confidence intervals and the plain-language layer
    api/           FastAPI routes
  tests/           86 tests; `-m "not slow"` skips shadow-model training
frontend/          React 19 + Vite + Tailwind
  src/pages/       CitizenPortal, AuditorConsole, VerifyReport
  src/api/         typed API client
```

## Testing

```bash
cd backend
uv run pytest -m "not slow"   # fast loop, ~5s
uv run pytest                 # full suite, ~40s
```

## Notes on rigour

Four things the specification asks for that are easy to get wrong, and how they
are handled here:

1. **Membership results are probabilistic, never absolute.** No finding carries a
   boolean "leaked" field. Verdicts are evidence bands with bootstrap intervals,
   keyed on the z-score rather than a saturating probability.
2. **Privacy budgets compose properly.** Rényi DP, additive in α-space with an
   α-minimised conversion — not linear ε-summation, which overstates spend by up
   to 48× at audit scale and would deny legitimate audits.
3. **Chain position is signed, not appended.** `previous_hash` and `sequence` are
   inside the signed bytes, so reordering or splicing reports invalidates
   signatures rather than merely breaking a linkage check.
4. **Perturbations stay realistic.** Counterfactuals are clamped to ranges derived
   from the auditor's own reference sample; no code path can emit an implausible
   probe, so an "inconsistency" is never an artifact of an impossible applicant.

Two deviations from the written specification, both deliberate:

- **Opacus and ml_privacy_meter are not used.** Opacus is a PyTorch DP-SGD
  *training* library; nothing here trains with DP. The RDP accountant is ~60
  lines implemented directly rather than importing PyTorch for one class.
- **M2 does counterfactual perturbation testing, not SHAP.** The specification
  says "SHAP/LIME-style"; no Shapley values are computed. Perturbation directly
  tests the causal claim being made, and the honest name is used throughout.

## Disclosure

The demo target is a synthetic stand-in, and the red-team disparities it
surfaces are planted by construction — that exercise demonstrates the method
recovers a known bias, not that it discovered an unknown one. Both facts are
stated in the tool's own output, not just here.
