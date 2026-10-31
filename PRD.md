# SENTINEL — Product Requirements Document

> This PRD describes intended behavior, not implemented functionality. Its legal, privacy, and market statements are not verified by the implementation audit. See [`AUDIT_REPORT.md`](AUDIT_REPORT.md) for what this checkout actually does.

## Independent Trust Verification Layer for Public AI Systems

---

## 1. Problem Statement

Government and public-sector bodies increasingly deploy AI systems to make consequential decisions about citizens — welfare eligibility, KYC/identity verification, subsidy audits, scholarship allocation. Every such deployment is accompanied by self-reported compliance claims: the training data was anonymized, the system is fair across demographic groups, and decisions are explainable to the people they affect.

These claims are currently unverifiable by any party other than the system's own operators, because verification typically requires access to training data or model internals — both of which are withheld as proprietary or sensitive. Citizens, journalists, civil society auditors, and even many internal oversight bodies have no practical mechanism to confirm whether these claims hold true. This creates a structural accountability gap: systems can fail silently, and the people most affected by that failure are the least equipped to detect or contest it.

**Core problem to solve:** Build an external, black-box verification tool that tests whether a deployed AI system's anonymization, fairness, and explainability claims are actually true — using only inputs and outputs, with no privileged access to the system under test.

---

## 2. Goals

- Enable independent, reproducible verification of three specific compliance claims without requiring access to model internals or training data.
- Produce quantified, evidence-grade outputs (scores, disparity reports, flags) rather than qualitative impressions.
- Ensure the audit process itself introduces no new privacy risk to the individuals whose data patterns are used during testing.
- Demonstrate feasibility end-to-end against a representative target system within the hackathon timeframe.

## 3. Non-Goals

- Not a general-purpose model security/pentesting suite (not covering adversarial evasion, model extraction/theft, or poisoning attacks).
- Not a live/real-time monitoring system for production traffic — it is a pre-deployment or periodic audit tool.
- Not attempting to fix or retrain the target system — SENTINEL detects and reports, it does not remediate.

---

## 4. Module Breakdown: Problem → Technical Solution

### 4.1 Membership & Leakage Checker

**Problem**
Models frequently memorize outlier training records (rare cases with little else to generalize against) rather than learning general patterns from them. A memorized record can be recovered/confirmed via query access, which falsifies any "anonymized" claim and constitutes a provable data protection violation (relevant under India's DPDP Act).

**Constraint**
Must operate without access to the training dataset or model weights — otherwise only the operator making the claim could ever test it.

**Technical solution**

- Membership inference via confidence-differential analysis: query the target model with a suspected record and a batch of statistically matched synthetic decoys under identical conditions.
- Calibrate expected "normal" confidence variance using shadow models trained on non-sensitive proxy data, to distinguish real memorization signal from ordinary noise.
- Output: per-record quantified leakage score (not binary), with statistical confidence interval.

**Build components**

- Decoy record generator (statistical similarity matching)
- Shadow model training pipeline
- Confidence-gap scoring engine
- Leakage score API/report output

---

### 4.2 Synthetic Citizen Red-Team

**Problem**
Pre-launch testing uses clean, well-formatted data. Real citizens generate legitimate but messy data: multi-address records from migration, name transliteration inconsistencies across documents, seasonal/informal income patterns. Systems fail silently against this data, and failures disproportionately affect migrants, informal workers, and rural populations — populations least able to contest wrong decisions. Aggregate accuracy metrics mask this because the failure is concentrated, not random.

**Constraint**
Manual edge-case authoring reproduces the same blind spots as the original system design; generation must be automated and grounded in documented real-world failure categories.

**Technical solution**

- Adversarial synthetic profile generator producing labeled edge-case categories: address-mismatch variants, transliteration perturbation variants, income-volatility variants, dialect/phrasing variants in free-text fields.
- Bulk submission pipeline against target system's input interface (API/form).
- Outcome logging clustered by edge-case category to compute per-category disparity rates against a clean baseline.

**Build components**

- Profile generator with tagged edge-case taxonomy
- Batch submission/automation harness
- Disparity analysis and clustering module
- Category-level fairness report output

---

### 4.3 Explainability Gap Auditor

**Problem**
Systems increasingly generate plain-language decision explanations to satisfy compliance requirements, but the explanation-generation component is often architecturally separate from the actual decision logic — allowing a stated reason to diverge from the true cause of a decision ("explainability theater"). A citizen given a false reason cannot construct a valid appeal.

**Constraint**
Cannot verify via text plausibility (a false explanation can be grammatically and semantically convincing); must test causal alignment between stated reason and actual model behavior.

**Technical solution**

- Perturbation-based consistency testing: for each rejected case with a stated reason, modify only the named feature while holding all other inputs constant, resubmit, and check whether the decision changes.
- Aggregate across many cases and feature types to compute a per-feature "explanation reliability" score.

**Build components**

- Feature-isolation perturbation engine
- Case resubmission and outcome-diff tracker
- Reliability scoring aggregator
- Per-feature audit report output

---

### 4.4 Differential Privacy Audit Integrity Layer

**Problem**
Modules 4.1–4.3 require probing the target system with data resembling real sensitive records. Without safeguards, detailed audit outputs (leakage scores, disparity clusters) could themselves leak information about the individuals whose data patterns informed the probes — undermining the credibility of a privacy-auditing tool.

**Constraint**
Privacy guarantees must be formal and mathematical, not procedural/best-effort, to hold up as credible independent evidence.

**Technical solution**

- Apply differential privacy noise injection at two points: (1) synthetic probe generation, ensuring no probe is reverse-mappable to a specific real record; (2) final report output, injecting noise calibrated to a defined privacy budget (epsilon) so aggregate findings remain actionable while individual test records remain unrecoverable.

**Build components**

- DP noise injection wrapper (probe generation stage)
- DP noise injection wrapper (report output stage)
- Epsilon/privacy-budget configuration layer

---

## 5. System Architecture (High Level)

```
Target AI System (black box)
        ↑ queries / inputs          ↓ outputs / decisions
┌─────────────────────────────────────────────┐
│              SENTINEL Core                    │
│  ┌───────────┐ ┌───────────┐ ┌─────────────┐ │
│  │ Membership │ │ Red-Team  │ │Explainability│ │
│  │  Checker   │ │ Generator │ │ Gap Auditor  │ │
│  └─────┬─────┘ └─────┬─────┘ └──────┬───────┘ │
│        └──────────────┴──────────────┘         │
│                       ↓                         │
│         Differential Privacy Wrapper            │
│                       ↓                         │
│              Unified Audit Report               │
└─────────────────────────────────────────────┘
```

All three testing modules operate independently against the target system and converge through a shared DP-wrapped reporting layer.

---

## 6. Success Metrics (for demo/judging)

| Metric                                             | Target                                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| Membership inference: detect planted leaked record | Demonstrable confidence-gap signal on a known-memorized record                   |
| Red-team: disparity detection                      | Show ≥1 edge-case cluster with measurably higher rejection rate vs. baseline     |
| Explainability: gap detection                      | Show ≥1 case where perturbing the stated feature doesn't flip the decision       |
| DP layer                                           | Show noise-adjusted report still preserves the above findings at aggregate level |

---

## 7. Demo Plan (Judging Round)

1. Present a pre-trained mock "welfare eligibility" model standing in for a real government system.
2. Run Membership Checker live against a planted record → show leakage score spike.
3. Run Red-Team generator → show disparity report flagging a specific edge-case cluster.
4. Run Explainability Auditor on a rejected case from that cluster → show the stated reason doesn't hold under perturbation.
5. Show the same reports passed through the DP layer → same conclusions, individual records unrecoverable.
6. Close on total elapsed time and zero internal access required, to underline real-world deployability.

---

## 8. Risks & Open Questions

- **Mock target system fidelity**: results are only as convincing as how realistic the demo target model is — needs to be trained on a plausible dataset structure (income/eligibility features) before the hackathon, not built live.
- **Time-boxing**: four modules is ambitious for a hackathon window — prioritize Membership Checker + Explainability Auditor as the two most demo-friendly and technically distinct, with Red-Team as a stretch goal if time permits.
- **Statistical rigor vs. demo speed**: shadow-model calibration (4.1) is the most computationally expensive step — may need a pre-computed/pre-trained shadow model rather than training live on stage.
