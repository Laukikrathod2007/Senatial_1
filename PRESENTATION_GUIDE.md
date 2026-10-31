# SENTINEL — Hackathon Presentation Guide

## Claim the project can support today

SENTINEL is a local prototype that runs statistical checks against its own generated welfare-eligibility dataset and synthetic model. It reports measured cohort outcomes, seals reports with a hash and Ed25519 signature, and can detect edits to stored reports.

It does not connect to a government service, audit a deployed model, establish discrimination or privacy violations, verify a user's identity, or provide DPDP/IEEE/legal certification. The query-budget display is not a formal differential-privacy guarantee.

## Three-minute demonstration

### 1. State the problem (30 seconds)

People affected by automated or algorithm-assisted decisions may have limited visibility into how the system behaves. Independent testing and understandable evidence are useful goals. This prototype demonstrates one possible audit workflow; it does not claim access to or evidence about a named Indian service.

### 2. Show the dataset and test (60 seconds)

Open **Auditor console**. Point out the named welfare-eligibility-demo dataset and explain that both the dataset and target model are synthetic. Click **Run synthetic fairness audit**. The backend generates an 800-profile baseline and six 200-profile cohorts, queries its local model, and computes rejection rates, Wilson intervals, one-sided two-proportion tests, and p-values.

### 3. Explain the result (30 seconds)

Read one cohort's sample size, rate, interval, p-value, and percentage-point gap. Explain that the planted eligibility rule makes some disparities expected by construction. A statistical flag is a prompt for investigation, not proof of real-world discrimination or causation.

### 4. Export and verify (45 seconds)

Download the PDF summary and exact JSON source. The PDF is formatted from the displayed backend report. The JSON contains the exact report object and seal metadata. Open **Verify a report** and confirm the chain and signature checks pass. The signature confirms integrity under the local key; it does not prove the report is true or independently anchored.

### 5. Demonstrate tampering (15 seconds)

Only with the repository's local start-backend.ps1 launcher, use the explicitly enabled demo tamper control on the disposable backend/var-demo SQLite ledger. Recheck the report and show that verification fails. Do not enable this on a shared or deployed service.

## Technical summary

- **M1:** LiRA-style membership signal against synthetic shadow-model references.
- **M2:** Single-feature counterfactual consistency checks against the synthetic model.
- **Cohort stress test:** Measured synthetic baseline/cohort rejection rates with uncertainty and tests.
- **Ledger:** Canonical report hashing, SHA-256 chaining, Ed25519 signatures, and Merkle root.
- **Gateway:** JWT sessions and role quotas. Caller-selected non-citizen roles are available only in explicit local demo mode; this is not identity verification.
- **Query budget:** Internal estimate only. Deterministic audit predictions are not made differentially private.

## Honest limitations to say aloud

The result validates the implementation against known synthetic behavior. It does not validate external data, an external model adapter, the representativeness of real populations, causal fairness, the legality of any system, or production security. Before a public pilot, the project needs a lawful target connector, trusted identity/access controls, stakeholder validation, statistically reviewed protocols, and production-grade key and data handling.

For detailed code evidence, current test outcomes, and remaining issues, see AUDIT_REPORT.md and IMPLEMENTATION_REPORT.md.
