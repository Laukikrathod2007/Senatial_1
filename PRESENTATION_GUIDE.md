# Project SENTINEL — Hackathon Slide Deck (PPT) Guide
**IEEE Tech for Tomorrow 2026 | Track: Cybersecurity for Community Safety**

This document provides a slide-by-slide outline, including exact text, visual layout suggestions, and speaking notes, to build a winning presentation.

---

## Slide 1: Title Slide (The Hook)
*   **Slide Title:** Project SENTINEL
*   **Subtitle:** An Independent, Cryptographically-Verifiable Trust & Integrity Layer for Public-Sector AI Systems
*   **Tagline:** *"The outside auditor that catches a decision algorithm lying about privacy, explanation, or fairness."*
*   **Track:** Cybersecurity for Community Safety (IEEE/UL 2933 TIPPSS Framework)
*   **Visual Suggestion:** Minimalist layout, deep red and warm paper tones. Icon of a digital wax seal or cryptographic lock.

---

## Slide 2: The Problem (Algorithmic Exclusion in India)
*   **Key Points:**
    *   **The Context:** India's public sector (JAM Trinity, PDS ration distribution, state welfare scoring) uses automated classifiers to determine subsidy eligibility.
    *   **The Issue:** These systems are black boxes. Operators claim they are "anonymous, fair, and explainable," but citizens have zero independent ways to verify these claims.
    *   **Real Harms:**
        *   Haryana: A 102-year-old pensioner cut off after a database wrongly marked him dead.
        *   Jharkhand: Automated Aadhaar-seeding exclusions led to ration cutoff with no recourse.
        *   Legal Gap: No statutory framework in India assigns liability or guarantees transparency for automated rejections.
*   **Visual Suggestion:** Icons representing Aadhaar, Welfare, and a citizen cut off by a red "X" barrier.

---

## Slide 3: SENTINEL's Solution (The Outside Auditor)
*   **Core Philosophy:** Existing AI governance platforms (IBM watsonx, Credo AI) assume the operator is the customer and has internal model access. **SENTINEL assumes zero cooperation from the operator.**
*   **The Interface:** Works from **outside query access alone** (send input, read output probabilities).
*   **The TIPPSS Alignment:**
    *   **Trust & Safety:** Audits stated reasons vs. causal factors.
    *   **Identity & Privacy:** Detects individual data memorization leaks.
    *   **Protection & Security:** Locks audit reports in an append-only ledger signed with Ed25519 signatures.
*   **Visual Suggestion:** Side-by-side comparison diagram showing:
    *   *Enterprise Tools:* Internal model access (Inside-out).
    *   *SENTINEL:* Public API query access (Outside-in).

---

## Slide 4: System Architecture
*   **Technical Stack:**
    *   **Backend:** Python 3.12, FastAPI, scikit-learn, SQLite.
    *   **Frontend:** React 19, Vite, Tailwind CSS v4, jsPDF, Lucide.
*   **Workflow Diagram:**
    ```mermaid
    flowchart TD
        User[Citizen / Auditor] -->|JWT Auth Request| Gateway[M4 Gateway Quota Control]
        Gateway -->|Preflight Budget Check| Budget[M5 DP Budget Guardian]
        Budget -->|Audit Probe Query| Engine[ML Audit Engines M1/M2/RT]
        Engine -->|Predict Proba Query| Target[Target AI Model Under Audit]
        Target -->|Response Probabilities| Engine
        Engine -->|Raw Audit Results| Ledger[M3 Cryptographic Ledger]
        Ledger -->|Hash Chain & Ed25519 Sign| DB[(SQLite Ledger)]
        DB -->|Report Sealed Certificate| User
    ```
*   **Visual Suggestion:** Render this block diagram with icons for Gateway, Engines, Cryptography, and DB.

---

## Slide 5: Module 1 (M1) — Data Memorization Audit
*   **The Lie It Catches:** *"Your personal data was anonymized and not stored."*
*   **The Core Math:** Offline Likelihood Ratio Test (**LiRA** - Carlini et al., IEEE S&P 2022).
*   **How it works:**
    1.  Trains **16 shadow models** on subsets of data excluding the target record.
    2.  Computes the **null distribution** of confidences for models that never saw the record:
        \[
        \Lambda(x) = \log \frac{P(\text{confidence} \mid \text{member})}{P(\text{confidence} \mid \text{non-member})}
        \]
    3.  Queries the target AI and measures the **z-score** above the null distribution.
    4.  **Verdict:** If \(z > 4.0\), it indicates extreme confidence separation, proving the model memorized that individual.
*   **Visual Suggestion:** A bell curve graph showing the Null Distribution (Safe) vs. a high Z-score spike (Canary Record) indicating a leak.

---

## Slide 6: Module 2 (M2) — Explanation Consistency Auditor
*   **The Lie It Catches:** *"Here is the reason we rejected your application."*
*   **The Core Math:** **Counterfactual Feature Perturbation** (Wachter et al.).
*   **How it works:**
    1.  Identify a rejected applicant and the feature the system blamed (e.g. Income).
    2.  Perturb (change) **only** that feature to a qualifying value while clamping other features to a reference distribution.
    3.  Re-query the target AI.
    4.  **If the decision does not flip:** Stated reason was FALSE.
*   **Visual Suggestion:** Horizontal progress bars showing "Wrong Explanation Rate" per feature (e.g. Income: 9.4% wrong, Aadhaar Seeded: 11.8% wrong).

---

## Slide 7: Module 3 (M3) — Tamper-Evident Ledger
*   **The Feature:** The "Digital Wax Seal" audit trail.
*   **How it works:**
    *   Each audit report is structured as canonical JSON.
    *   **Cryptographic Chaining:** The `previous_hash` and `sequence` index are compiled **inside** the signed bytes.
    *   **Signing:** Serialized bytes are signed with SENTINEL's **Ed25519 private key**.
    *   **Verification:** Recomputes the SHA-256 hash of each report block, verifies the signature, and walks the Merkle chain.
    *   **Tamper Check:** Modifying even one byte in SQLite invalidates the signature and breaks the Merkle tree link.
*   **Visual Suggestion:** A blockchain timeline of connected cards. Show a green "Lock" icon on verified blocks, and a red "Unlock" icon showing a broken link when tampered.

---

## Slide 8: Module 4 & 5 (M4 & M5) — Quotas & Privacy Budget
*   **M4: Gateway Quota Control:**
    *   JWT Session authorization based on roles (Citizen: 100 queries, Journalist: 2,000 queries, Certified Auditor: 20,000 queries).
    *   **Preflight Budget Check:** Block queries *before* touching the model if it would exceed limits.
*   **M5: Rényi Differential Privacy (RDP) Accountant:**
    *   Every query leaks information. We track cumulative privacy spend (\(\epsilon\)) in \(\alpha\)-space.
    *   **Why RDP matters:** Naive linear \(\epsilon\)-summation overstates privacy spend by **48x** (would claim \(\epsilon = 498\) instead of actual \(\epsilon = 10.3\)), shutting down audits prematurely. RDP guarantees tight, correct composition.
*   **Visual Suggestion:** Side-by-side progress meters showing Naive DP (Exhausted/Red) vs. Rényi DP (Within limits/Green).

---

## Slide 9: Red-Team (RT) — Synthetic Citizen Engine
*   **The Lie It Catches:** *"The eligibility system treats everyone fairly."*
*   **The Standard:** Subgroup Disparity Ratio under **IEEE Std 7003-2024**.
*   **How it works:**
    *   Generates **500 synthetic edge-case profiles** representing vulnerable cohorts (elderly alone, migrants, daily wage volatility).
    *   Measures rejection rates against a clean baseline cohort.
    *   **Demo Target Findings:**
        *   Baseline rejection: 38.8%
        *   Elderly living alone rejection: 83.6% (**+44.8% disparity — FLAGGED**)
        *   Migrant workers rejection: 78.0% (**+39.2% disparity — FLAGGED**)
*   **Visual Suggestion:** A table displaying the tested groups, their rejection percentages, and bold red tags reading "FLAGGED" for biases.

---

## Slide 10: Interactive Sandbox UI Demo
*   **Features developed for Sandbox:**
    *   **Diagnostic Sandbox Form:** Judges can toggle form input values or click **"Canary Preset"** vs. **"Clean Preset"** to watch the Z-Score gauge move from Safe (Green) to Danger (Red) live.
    *   **jsPDF Official Certificate:** 1-click download of signed audit certificates.
    *   **RTI application generator:** Automatic PDF application generation under Section 6(1) of the RTI Act 2005.
    *   **Live Database Tampering Simulator:** Single click to mutate a database record and watch the verification console turn red instantly.
*   **Visual Suggestion:** Screenshots of the warm paper-theme UI, showing the gauge slider and the red verification block.

---

## Slide 11: Production-Grade Roadmap (2-3 Months)
*   **What is ready now:** Mathematically validated engines, secure hashing, and Merkle validation chain (fully tested with 86 unit tests).
*   **What is required for production deployment:**
    1.  **Identity Integration (Weeks 1-3):** DigiLocker API integration for citizen login and e-Sign for public auditors.
    2.  **Key Security (Weeks 4-6):** Moving private keys to Cloud KMS / Hardware Security Modules (HSMs).
    3.  **Target wrappers (Weeks 7-9):** Connecting the engine client to external live REST/gRPC endpoints.
    4.  **Database & Scaling (Weeks 10-12):** PostgreSQL migration and async Celery task queues.
*   **Visual Suggestion:** Timeline roadmap showing the 4 phases stretching over a 3-month block.

---

## Slide 12: Why SENTINEL Wins
1.  **Black-Box, Zero-Cooperation Audit:** First platform designed for outside-in auditing.
2.  **Statistically Rigorous:** Uses Carlini's LiRA, Wachter's counterfactuals, and Rényi DP instead of hardcoded mock numbers.
3.  **Actionable Civic Outcomes:** Translates complex statistics into plain-language summaries and pre-filled legal RTI PDF forms.
4.  **Court-Admissible Evidence:** The hash-signed ledger guarantees findings cannot be silenced or rewritten by government operators.
