# 🛡️ SENTINEL — Algorithmic Trust & Integrity Layer for Public AI

[![Vercel Deployment](https://img.shields.io/badge/Frontend-Vercel-black?style=for-the-badge&logo=vercel)](https://senatial-1-8ni3.vercel.app)
[![Render Deployment](https://img.shields.io/badge/Backend-Render-darkviolet?style=for-the-badge&logo=render)](https://sentinel-backend-ud3n.onrender.com)
[![Python Version](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)](https://www.python.org/)
[![IEEE Std 7003-2024 Aligned](https://img.shields.io/badge/Standard-IEEE%207003--2024-gold?style=for-the-badge)](https://standards.ieee.org/)
[![India DPDP Act 2023 Aligned](https://img.shields.io/badge/Compliance-DPDP%20Act%202023-orange?style=for-the-badge)](https://www.meity.gov.in/)

**SENTINEL** is an independent, cryptographically-verifiable trust verification layer for public-sector automated decision systems. 

As public welfare algorithms (pensions, rations, subsidies, scholarships) scale, citizens and regulators need a way to verify privacy, fairness, and explanation integrity. **SENTINEL audits these black-box AI models entirely from the outside**—using query access only. No internal weights, training data, or operator cooperation required.

---

## 🚀 Quick Links
* 🌐 **Production Web App:** [https://senatial-1-8ni3.vercel.app](https://senatial-1-8ni3.vercel.app)
* ⚡ **Production API Backend:** [https://sentinel-backend-ud3n.onrender.com](https://sentinel-backend-ud3n.onrender.com)
* 📘 **Detailed Presentation Guide:** [`PRESENTATION_GUIDE.md`](PRESENTATION_GUIDE.md)

---

## 🏛️ System Architecture

SENTINEL implements five cryptographically linked modules aligning directly with the **IEEE/UL 2933 TIPPSS framework** (Trust, Identity, Privacy, Protection, Safety, Security):

```
       [ Citizen Portal ]        [ Auditor Console ]
                │                         │
                └───────────┬─────────────┘
                            ▼
                  [ M4 Secure Gateway ]
                 (JWT Auth, Rate Limits)
                            │
                            ▼
              [ M5 Rényi DP Accountant ] 
                (Privacy Loss Guard)
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
     [ M1 Privacy ]   [ M2 Consistency ] [ RT Fairness ]
      (LiRA Audit)     (Counterfactual)   (Subgroup Sweep)
            │               │               │
            └───────────────┼───────────────┘
                            ▼
                 [ M3 Merkle Ledger ]
               (Ed25519 Cryptographic Wax Seal)
```

### The 5 Core Compliance Modules:

| Module | Purpose | Compliance / Standards | Status |
|---|---|---|---|
| **`M1` Privacy Memorization** | Probes training data leaks using Likelihood Ratio Audits (LiRA) to check if a specific citizen's data was memorized by the AI. | **India DPDP Act 2023 §6** | Working ✅ |
| **`M2` Stated Reason Integrity** | Validates stated rejection reasons. Runs counterfactual perturbations to prove if modifying the blamed feature actually flips the outcome. | **Administrative Justice & Fairness** | Working ✅ |
| **`M3` Cryptographic Wax Seal** | Appends SHA-256 links into a signed Merkle ledger. Signature index binding prevents block deletion, insertion, or splicing. | **Tamper-Evident Security** | Working ✅ |
| **`M4` Secure Access Gateway** | Controls query connection quotas via role-based JWT sessions. Protects target endpoints from extraction or membership attacks. | **TIPPSS Protection & Safety** | Working ✅ |
| **`M5` Rényi DP Accountant** | Computes privacy expenditure ($\epsilon$) in alpha-space. Prevents linear budget overstatement by **48x** vs naive accumulation. | **Differential Privacy Standards** | Working ✅ |
| **`RT` Subgroup Red-Teaming** | Stress-tests classifiers against intersecting vulnerable subgroups (elderly living alone, seasonal income workers, migrants) for bias gaps. | **IEEE Std 7003-2024** | Working ✅ |

---

## 🏁 How to Run Locally

### Prerequisites
* **Python:** v3.12
* **Node.js:** v18+
* **Package Manager:** `npm` + `uv` (recommended)

### 1. Setup Backend (FastAPI)
```bash
cd backend
uv sync                                            # Install all dependencies into virtual environment
python -c "import secrets; print(secrets.token_hex(32))" # Generate a 32-byte JWT secret key
# Copy .env.example to .env and configure the SENTINEL_JWT_SECRET env var
uv run uvicorn sentinel.api.app:app --port 8000 --reload
```

### 2. Setup Frontend (React + Vite + Tailwind v4)
```bash
cd frontend
npm install
# Configure frontend/src/.env VITE_API_URL to point to http://localhost:8000
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🔬 Key Technical Insights

1. **Rigorous Privacy Audits:** We do not report flat boolean data leaks. Membership results are probabilistic evidence bands with bootstrap intervals calculated from a shadow-model ensemble.
2. **Advanced Privacy Accounting:** Naive linear addition of queries overstates privacy budget spend, which would trigger premature denial-of-service. SENTINEL composes queries mathematically using Rényi Differential Privacy (RDP).
3. **Immutable Ledger Bindings:** The `previous_hash` and sequence indices are serialized **inside** the JSON payload *before* signing with Ed25519. Splicing, deleting, or re-ordering records breaks the signature validation instantly.
4. **Realistic Perturbations:** Explanation counterfactuals are clamped to realistic, domain-specific ranges derived from reference cohorts to avoid emitting impossible test applicants.

---

## 🧪 Testing
We maintain a comprehensive suite of unit tests validating the crypto chain, DP composition, and mathematical engines.
```bash
cd backend
uv run pytest -m "not slow"  # Runs the suite in under 6 seconds
```

---

## 📜 Public Verification Sandbox License
This project is open-source and prepared for the **IEEE Computer Society Pune Section — Tech for Tomorrow 2026 Hackathon (TIPPSS Track)**.
