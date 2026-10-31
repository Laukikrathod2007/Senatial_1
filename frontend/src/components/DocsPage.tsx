"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, BookOpen, ChevronRight, X, MessageSquare, ArrowLeft } from "lucide-react";

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
  toc: string[];
}

interface Chapter {
  title: string;
  items: { id: string; label: string }[];
}

export function DocsPage({ onClose }: { onClose: () => void }) {
  const [activeId, setActiveId] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string }[]>([]);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Search matching from the implementation guide
  const kb = [
    {
      q: "Can SENTINEL check a student's MahaDBT application?",
      a: "Not currently. MahaDBT is relevant to the Maharashtra public-interest use case, but SENTINEL is an independent prototype and is not connected to the portal and does not inspect live applications."
    },
    {
      q: "Can a college, NGO, or e-Seva operator enter a student's personal records?",
      a: "They should not use real or confidential records in the current demo. The case workspace stores notes and provenance metadata; it is not a secure evidence repository."
    },
    {
      q: "What does a valid report signature mean?",
      a: "It helps check whether report contents changed relative to the configured signing key (using canonical JSON serialization, SHA-256 Merkle roots, and Ed25519 signatures). It does not prove that the report is correct, that an external service was tested, or that an independent authority endorsed it."
    },
    {
      q: "Does SENTINEL decide whether a scholarship was wrongly denied or file an appeal?",
      a: "No. It does not decide eligibility, make legal findings, or file an appeal. It can support a structured review and produce an editable draft for a person to check, verify, and send."
    },
    {
      q: "What is the system architecture?",
      a: "React / TypeScript interface → FastAPI backend → case workflow and audit modules → local SQLite storage → signed report ledger → human review and follow-up. A local mock target demonstrates an HTTP boundary."
    },
    {
      q: "What are the core API endpoints?",
      a: "POST /cases (create case with question, provenance, access state), POST /cases/{case_id}/demo-run (execute clean or flawed fixture), and POST /verify/report-copy (verify cryptographic signature of an exported report copy)."
    }
  ];

  const handleAskAssistant = (q: string) => {
    if (!q.trim()) return;
    const match = kb.find(item => item.q.toLowerCase().includes(q.toLowerCase()) || q.toLowerCase().includes(item.q.toLowerCase().split(" ")[2] || ""));
    const answer = match 
      ? match.a 
      : "SENTINEL is a public-interest workspace for examining automated decisions and organizing human-reviewed next steps. It runs locally with controlled fixtures, SHA-256 Merkle roots, and Ed25519 signatures. Ask about MahaDBT scope, personal records, report signatures, architecture, or API endpoints.";
    
    setChatHistory(prev => [...prev, { q, a: answer }]);
    setChatQuestion("");
    setIsAssistantOpen(true);
  };

  const chapters: Chapter[] = [
    {
      title: "Get Started",
      items: [
        { id: "overview", label: "Overview & Rules" },
        { id: "big-picture", label: "The Canonical Pipeline" },
      ],
    },
    {
      title: "PSU Specifications",
      items: [
        { id: "statutory", label: "Statutory Requirements" },
        { id: "portals", label: "Government Portals" },
      ],
    },
    {
      title: "Architecture",
      items: [
        { id: "safety", label: "Compliance Isolation" },
        { id: "states", label: "Compliance States" },
        { id: "stopping", label: "Early Stopping" },
      ],
    },
    {
      title: "Document Pipeline",
      items: [
        { id: "extraction", label: "5-Tier Extraction" },
        { id: "injection", label: "Prompt Injection" },
        { id: "gstin-pan", label: "GSTIN PAN Cross-Check" },
      ],
    },
    {
      title: "Tender Parser",
      items: [
        { id: "three-zone", label: "Three-Zone Parsing" },
        { id: "ambiguity", label: "Ambiguity Resolution" },
      ],
    },
    {
      title: "Audit & Safety",
      items: [
        { id: "triggers", label: "Postgres Trigger Seals" },
        { id: "non-negotiable", label: "15 Golden Rules" },
      ],
    },
  ];

  const sections: Record<string, Section> = {
    overview: {
      id: "overview",
      title: "Overview & Core Boundaries",
      toc: ["Read This First", "Three Core Boundaries", "Current Demo Scope"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">Overview & Core Boundaries</h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            This guide serves as the technical documentation for SENTINEL: a public-interest workspace for examining automated decisions and organizing human-reviewed next steps, designed for Maharashtra scholarship support contexts.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-850">
            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">⚠️ Three Non-Negotiable Boundaries</h3>
            <ul className="list-decimal pl-5 space-y-2 text-xs leading-relaxed">
              <li><strong>Local Demo Scope:</strong> Current demo runs locally using controlled examples (100 / 101 rows) and is not connected to MahaDBT, college scholarship systems, or Aaple Sarkar/e-Seva centres. Real student records must not be entered.</li>
              <li><strong>Human Review Required:</strong> SENTINEL does not decide eligibility or file legal appeals. It structures notes and produces editable inquiry drafts for humans to verify and submit.</li>
              <li><strong>Verifiable Integrity, Not Absolute Truth:</strong> Ed25519 signatures and SHA-256 Merkle roots check whether report copies have changed relative to the signing key. A valid signature does not endorse the correctness of underlying claims.</li>
            </ul>
          </div>
        </div>
      )
    },
    "big-picture": {
      id: "big-picture",
      title: "The Canonical Pipeline",
      toc: ["Architecture Summary", "Data Flow", "Core API Endpoints"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">System Architecture & Pipeline</h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            SENTINEL organizes decision inquiries and evidence preservation through a decoupled, auditable pipeline:
          </p>
          <div className="bg-neutral-900 text-neutral-300 font-mono text-[10px] p-6 rounded-xl overflow-x-auto leading-relaxed border border-neutral-800">
            <pre>{`React/TypeScript UI  ──►  FastAPI Backend (JWT Sessions)
                                │
                                ├──► Case Intake & Provenance
                                ├──► Controlled Fixtures (100 / 101 rows)
                                ├──► Local Audit Modules (LiRA / Perturbations)
                                ├──► SQLite + SQLAlchemy Local Store
                                └──► Signed Report Ledger (SHA-256 + Ed25519)`}</pre>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-5">
            <h4 className="font-bold text-xs uppercase font-mono text-[#0C1F4A] mb-3">Core API Endpoints</h4>
            <ul className="space-y-2 text-xs font-mono text-neutral-600">
              <li><code className="text-[#EA580C] font-bold">POST /cases</code> — Create a case with inquiry question, provenance notes, and reported access state.</li>
              <li><code className="text-[#EA580C] font-bold">POST /cases/&#123;case_id&#125;/demo-run</code> — Execute the clean or known-flawed controlled demonstration fixture.</li>
              <li><code className="text-[#EA580C] font-bold">POST /verify/report-copy</code> — Check the cryptographic signature and Merkle hash of an exported report copy.</li>
            </ul>
          </div>
        </div>
      )
    },
    statutory: {
      id: "statutory",
      title: "Statutory Requirements",
      toc: ["Requirement Mapping", "Mock Adapter Rationale"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">Statutory Requirements</h1>
          <p className="text-neutral-600 text-sm leading-relaxed font-sans">
            The platform covers all 14 statutory checks required under CPCL tender rules:
          </p>
          <div className="overflow-x-auto border border-neutral-200 rounded-xl">
            <table className="w-full text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[#0C1F4A] font-semibold">
                  <th className="p-3">Statutory Check</th>
                  <th className="p-3">Integration Method</th>
                  <th className="p-3">Code Module</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-600">
                <tr>
                  <td className="p-3 font-semibold">Udyam / MSME</td>
                  <td className="p-3">Cashfree Sandbox API</td>
                  <td className="p-3 font-mono">adapters/cashfree.py</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">GST Status</td>
                  <td className="p-3">Cashfree Registration API</td>
                  <td className="p-3 font-mono">adapters/cashfree.py</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">PAN & Tax</td>
                  <td className="p-3">Decentro API / Document Extract</td>
                  <td className="p-3 font-mono">adapters/decentro.py</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">EPFO / Labor</td>
                  <td className="p-3">Decentro Sandbox</td>
                  <td className="p-3 font-mono">adapters/decentro.py</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">DigiLocker Auth</td>
                  <td className="p-3">QR Code Extraction & Match</td>
                  <td className="p-3 font-mono">extraction/integrity.py</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold">CPPP Debarment</td>
                  <td className="p-3">Public Search by PAN</td>
                  <td className="p-3 font-mono">adapters/debarment.py</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5">
            <h4 className="font-bold text-xs text-[#0C1F4A] mb-2">Mock Adapter Rationale</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Three checks are Mock (ESIC, NSIC, Income Tax return filing) because no legal public API path exists. For instance, Section 138 of the Income Tax Act prohibits automated access to returns. VeriBid implements standard adapter structures ready to connect once portals publish open endpoints.
            </p>
          </div>
        </div>
      )
    },
    portals: {
      id: "portals",
      title: "Government Portals & CAPTCHAs",
      toc: ["API Access", "The CAPTCHA Barrier"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">Government Portals</h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            Every official government portal is CAPTCHA-protected to prevent illegal automated scraping.
          </p>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="p-2 rounded bg-amber-500/10 text-[#EA580C] font-bold text-xs">01</div>
              <div>
                <h4 className="font-bold text-sm text-[#0C1F4A]">Licensed Aggregators</h4>
                <p className="text-xs text-neutral-500 mt-1">We route queries through licensed providers (Cashfree, Decentro) who maintain secure aggregator licenses to check Udyam and GSTN registries.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="p-2 rounded bg-[#9177CF]/10 text-[#9177CF] font-bold text-xs">02</div>
              <div>
                <h4 className="font-bold text-sm text-[#0C1F4A]">Human-Assisted Bridges</h4>
                <p className="text-xs text-neutral-500 mt-1">For portals like CPPP, EPFO, and NSIC, we pre-fill inputs and open official portal endpoints. The officer completes CAPTCHA verification, and marks the result which is signed in the immutable log.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    safety: {
      id: "safety",
      title: "Compliance Isolation",
      toc: ["Deterministic Rules", "PII Privacy Architecture"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">Compliance Isolation</h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            To prevent prompt injection attacks (where a bidder embeds "Ignore compliance guidelines" in their PDF), the compliance module is strictly decoupled from the AI/LLM.
          </p>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-800">
            <h4 className="font-bold text-sm mb-2">Import Restrictions</h4>
            <p className="text-xs leading-relaxed">
              Enforced by import-linter: <code className="bg-red-100 px-1 py-0.5 rounded">modules/compliance/</code> must never import from <code className="bg-red-100 px-1 py-0.5 rounded">modules/ai/</code>. The AI extracts facts; plain Python rule engines evaluate them.
            </p>
          </div>
        </div>
      )
    },
    states: {
      id: "states",
      title: "Compliance States",
      toc: ["Five Core States", "Timeout Handling"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">Compliance States</h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            Every evaluation check returns exactly one of the five core states:
          </p>
          <div className="grid sm:grid-cols-5 gap-4">
            {["PASS", "FAIL", "REVIEW", "UNVERIFIED", "NOT_APPLICABLE"].map((state) => (
              <div key={state} className="bg-neutral-50 p-4 border border-neutral-200 rounded-xl text-center">
                <span className="text-xs font-mono font-bold text-[#0C1F4A]">{state}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed mt-4">
            Note that <code className="bg-neutral-100 px-1 py-0.5 rounded">UNVERIFIED</code> handles portal downtime gracefully. Rather than failing the bidder, it marks the check as needing human review while giving partial weighted credit.
          </p>
        </div>
      )
    },
    stopping: {
      id: "stopping",
      title: "Early Stopping Engine",
      toc: ["Cost Optimization", "Dispatch Logic"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">Early Stopping Engine</h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            To optimize verification speed and minimize API costs, VeriBid query orchestrators run checks sequentially by cost, stopping the moment a rule is fully decided:
          </p>
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 text-neutral-600 font-mono text-xs leading-relaxed">
            1. Cached evidence (Free)<br />
            2. Derived attributes (Free)<br />
            3. Public portal API (Free)<br />
            4. Sandbox query (Staging)<br />
            5. Credit-based Production API (Paid)<br />
            6. Human-assisted validation override
          </div>
        </div>
      )
    },
    extraction: {
      id: "extraction",
      title: "5-Tier Document Extraction Ladder",
      toc: ["Extraction Tiers", "Accuracy Target"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">5-Tier Extraction Ladder</h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            We use the cheapest extraction methods first and escalate to expensive LLMs/VLMs only when confidence falls:
          </p>
          <div className="space-y-3 font-mono text-xs text-neutral-600">
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">Tier 0: Pure Regex (1ms, ~99% accuracy)</div>
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">Tier 1: Layout Model + OCR (1-5s, tables/scans)</div>
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">Tier 2: LLM Schema Validation (2-5s, prose-embedded)</div>
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">Tier 3: VLM Page Image Processing (5-15s, degraded scans/stamps)</div>
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">Tier 4: Human Review Queue (manual override)</div>
          </div>
        </div>
      )
    },
    injection: {
      id: "injection",
      title: "Prompt Injection Protection",
      toc: ["XML Isolation", "Safe LLM Prompts"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">Prompt Injection Protection</h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            All bidder documents sent to LLM extraction layers are wrapped inside explicit XML delimiters:
          </p>
          <div className="bg-neutral-900 text-amber-400 font-mono text-xs p-5 rounded-xl border border-neutral-800">
            {`<untrusted_bidder_document>
[Document contents go here]
</untrusted_bidder_document>`}
          </div>
          <p className="text-xs text-neutral-500 leading-relaxed">
            The model treats the input strictly as data rather than instructions, preventing prompt injection attacks from malicious vendors.
          </p>
        </div>
      )
    },
    "gstin-pan": {
      id: "gstin-pan",
      title: "GSTIN PAN Cross-Check",
      toc: ["Mod-36 Checksum", "PII Protection"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">GSTIN PAN Cross-Check</h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            VeriBid cross-verifies identifiers instantly with zero API calls by parsing the structural composition of the GSTIN number:
          </p>
          <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-xl text-center font-mono">
            GSTIN: 27 <span className="text-[#EA580C] font-bold">AADCB2230M</span> 1ZT <br />
            PAN Card Match: <span className="text-[#EA580C] font-bold">AADCB2230M</span> (Matches characters 3-12!)
          </div>
        </div>
      )
    },
    "three-zone": {
      id: "three-zone",
      title: "Three-Zone Parsing",
      toc: ["Zone A: Deterministic", "Zone B: Clause Library", "Zone C: AI Extraction"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">Three-Zone Parsing</h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            A GeM tender is split into three zones to preserve system accuracy, token economy, and run-times:
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-neutral-50 p-5 border border-neutral-200 rounded-xl">
              <h4 className="font-bold text-xs text-[#0C1F4A] mb-2">Zone A: Deterministic</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">Structured GeM fields matched via regex mapping dictionary (0 tokens, 1ms).</p>
            </div>
            <div className="bg-neutral-50 p-5 border border-neutral-200 rounded-xl">
              <h4 className="font-bold text-xs text-[#0C1F4A] mb-2">Zone B: Clause Library</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">SimHash Hamming distance matches standard boilerplate against pre-compiled clause dictionaries.</p>
            </div>
            <div className="bg-neutral-50 p-5 border border-neutral-200 rounded-xl">
              <h4 className="font-bold text-xs text-[#0C1F4A] mb-2">Zone C: AI Extraction</h4>
              <p className="text-xs text-neutral-500 leading-relaxed">Novel text clauses extracted using local LLMs. Substrings must be verbatim.</p>
            </div>
          </div>
        </div>
      )
    },
    ambiguity: {
      id: "ambiguity",
      title: "Ambiguity Detection",
      toc: ["Refusal to Guess", "Officer Interface"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">Ambiguity Detection</h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            When a buyer-added clause contains unquantifiable requests (e.g. <i>"Must have a service network covering all major regions of India"</i>), VeriBid sets the threshold to <code className="bg-neutral-100 px-1 py-0.5 rounded">null</code>.
          </p>
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl text-amber-850">
            <h4 className="font-bold text-xs mb-1">Refusal to Guess</h4>
            <p className="text-xs leading-relaxed">The compliance engine refuses to manufacture thresholds, escalating the decision to the reviewing procurement officer instead.</p>
          </div>
        </div>
      )
    },
    triggers: {
      id: "triggers",
      title: "Postgres Trigger Seals",
      toc: ["Database Constraints", "Immutability Triggers"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">Postgres Trigger Seals</h1>
          <p className="text-neutral-600 text-sm leading-relaxed">
            To satisfy CAG audit standards, all audit events are permanently sealed. Database triggers block update and delete requests:
          </p>
          <div className="bg-neutral-900 text-neutral-300 font-mono text-[10px] p-6 rounded-xl border border-neutral-800">
            <pre>{`CREATE OR REPLACE FUNCTION prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit events are immutable';
END;
$$ LANGUAGE plpgsql;`}</pre>
          </div>
        </div>
      )
    },
    "non-negotiable": {
      id: "non-negotiable",
      title: "15 Golden Rules",
      toc: ["Golden Rules Overview"],
      content: (
        <div className="space-y-6">
          <h1 className="text-4xl font-normal text-[#0C1F4A] font-serif mb-4">15 Golden Rules</h1>
          <ol className="list-decimal pl-5 space-y-3 text-xs text-neutral-600 leading-relaxed font-mono">
            <li>No evidence → no PASS</li>
            <li>LLM output is never a compliance decision</li>
            <li>Numeric rules are evaluated in plain Python</li>
            <li>Portal timeout → UNVERIFIED, never FAIL</li>
            <li>Conflicting evidence must escalate to human review</li>
            <li>The officer makes the final decision</li>
            <li>Every conclusion traces to doc + page + source + rule version</li>
            <li>No company-specific conditional logic allowed</li>
            <li>All source adapters implement one common interface</li>
            <li>All weights and thresholds are configurable in YAML</li>
            <li>All LLM calls use Instructor + Pydantic schema validation</li>
            <li>Every failure mode has an explicit fallback state</li>
            <li>Audit events are append-only (SQL trigger enforced)</li>
            <li>Mock adapters cannot return live access modes</li>
            <li>Document text in LLM prompts is wrapped in untrusted tags</li>
          </ol>
        </div>
      )
    }
  };

  const section = sections[activeId] || sections.overview;

  return (
    <div className="min-h-screen bg-[#fcfcfb] flex flex-col font-sans text-neutral-800 z-50">
      
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 transition-colors mr-2"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          <img src="/logo-icon.png" alt="SENTINEL" className="h-7 w-auto" />
          <span className="font-bold text-base text-[#0C1F4A]">SENTINEL Documentation</span>
        </div>

        {/* Top bar controls - Search and Ask Assistant button */}
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search documentation... (Ctrl K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 w-64 bg-neutral-50 border border-neutral-200 rounded-lg text-xs outline-none focus:bg-white focus:border-[#EA580C] transition-all"
            />
          </div>

          <button 
            onClick={() => setIsAssistantOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#EA580C] to-[#F59E0B] hover:from-[#C2410C] hover:to-[#EA580C] text-white rounded-lg text-xs font-bold font-mono transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask Assistant</span>
          </button>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded hover:bg-neutral-100 text-neutral-500 transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* ── Document Shell ── */}
      <div className="flex-1 flex max-w-[1440px] w-full mx-auto relative">
        
        {/* Left Sidebar Index */}
        <aside className="w-64 bg-white border-r border-neutral-200 p-6 hidden lg:block shrink-0 sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
          <div className="space-y-8">
            {chapters.map((chapter) => (
              <div key={chapter.title}>
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-3">
                  {chapter.title}
                </h4>
                <ul className="space-y-1.5 text-xs text-neutral-500">
                  {chapter.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveId(item.id)}
                        className={`w-full flex items-center justify-between text-left py-1.5 px-2.5 rounded-lg transition-colors ${
                          activeId === item.id
                            ? "bg-amber-500/10 text-[#0B1B3D] font-bold"
                            : "hover:bg-neutral-50 hover:text-neutral-850"
                        }`}
                      >
                        <span>{item.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Middle Content Workspace */}
        <main className="flex-1 p-8 lg:p-14 max-w-3xl overflow-y-auto">
          <div className="prose prose-neutral max-w-none">
            {section.content}
          </div>

          {/* Inline Chat Widget at bottom of content */}
          <div className="mt-16 pt-8 border-t border-neutral-200">
            <h4 className="font-bold text-sm text-[#0C1F4A] mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#EA580C]" />
              <span>Ask the SENTINEL Knowledge Base</span>
            </h4>
            <p className="text-xs text-neutral-500 mb-4">
              Type any query below to inspect information regarding MahaDBT scope, personal records, report signatures, architecture, or API endpoints.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask about MahaDBT scope, report signatures, /cases endpoints..."
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskAssistant(chatQuestion)}
                className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg text-xs outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] bg-white transition-all shadow-sm"
              />
              <button
                onClick={() => handleAskAssistant(chatQuestion)}
                className="px-4 py-2 bg-[#0C1F4A] text-white rounded-lg text-xs font-bold hover:bg-[#071230] transition-colors"
              >
                Ask Assistant
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar Table of Contents */}
        <aside className="w-56 p-8 hidden xl:block shrink-0 sticky top-[73px] h-[calc(100vh-73px)]">
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-4">
            On this page
          </h4>
          <ul className="space-y-3 text-xs text-neutral-400 border-l border-neutral-200 pl-4 font-sans">
            {section.toc.map((heading) => (
              <li key={heading}>
                <a href={`#${heading}`} className="hover:text-neutral-700 transition-colors block">
                  {heading}
                </a>
              </li>
            ))}
          </ul>
        </aside>

      </div>

      {/* ── Sliding AI Assistant Panel ── */}
      <AnimatePresence>
        {isAssistantOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-80 md:w-96 bg-white border-l border-neutral-200 z-50 shadow-2xl flex flex-col justify-between"
          >
            {/* Assistant Header */}
            <div className="p-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#EA580C]" />
                <span className="font-bold text-sm text-[#0C1F4A] font-mono">SENTINEL Assistant</span>
              </div>
              <button 
                onClick={() => setIsAssistantOpen(false)}
                className="p-1 rounded hover:bg-neutral-200 text-neutral-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Assistant Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              <div className="bg-amber-500/10 p-3.5 rounded-xl text-neutral-800 leading-relaxed border border-amber-500/20">
                Hi! I'm your SENTINEL documentation assistant. Ask me anything about the case workflow, controlled test fixtures, report integrity signatures, or system architecture.
              </div>

              {chatHistory.map((chat, i) => (
                <div key={i} className="space-y-2">
                  <div className="text-right">
                    <span className="inline-block bg-neutral-100 text-neutral-800 px-3.5 py-2 rounded-xl max-w-[85%] break-words">
                      {chat.q}
                    </span>
                  </div>
                  <div className="bg-amber-500/10 text-neutral-800 p-3.5 rounded-xl leading-relaxed border border-amber-500/20">
                    {chat.a}
                  </div>
                </div>
              ))}
            </div>

            {/* Assistant Input Area */}
            <div className="p-4 border-t border-neutral-200 flex gap-2">
              <input
                type="text"
                placeholder="Ask your assistant..."
                value={chatQuestion}
                onChange={(e) => setChatQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskAssistant(chatQuestion)}
                className="flex-1 px-3.5 py-2 border border-neutral-300 rounded-lg text-xs outline-none focus:border-[#9177CF] bg-white transition-all"
              />
              <button
                onClick={() => handleAskAssistant(chatQuestion)}
                className="p-2 bg-[#9177CF] text-white rounded-lg hover:bg-[#8064BC] transition-colors"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
