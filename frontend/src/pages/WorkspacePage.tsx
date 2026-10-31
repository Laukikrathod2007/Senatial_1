"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Scale, 
  FileSearch, 
  QrCode, 
  LogIn, 
  LogOut, 
  Server, 
  KeyRound, 
  ShieldAlert, 
  Info, 
  ChevronRight, 
  FileText, 
  BookOpen, 
  Binary, 
  CheckCircle2, 
  Layers, 
  Activity, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Cpu
} from "lucide-react";
import { 
  api, 
  ApiError, 
  setToken, 
  type LoginResponse, 
  type Role 
} from "../api/client";
import { useLanguage, LanguageSelector } from "../i18n/LanguageContext";
import { CaseWorkspace } from "./CaseWorkspace";
import { CitizenPortal } from "./CitizenPortal";
import { AuditorConsole } from "./AuditorConsole";
import { VerifyReport } from "./VerifyReport";

type Tab = "cases" | "citizen" | "auditor" | "verify";

interface WorkspacePageProps {
  onBack: () => void;
  onDocsClick: () => void;
  initialTab?: Tab;
}

export function WorkspacePage({ onBack, onDocsClick, initialTab = "cases" }: WorkspacePageProps) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [session, setSession] = useState<LoginResponse | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [activeDocSection, setActiveDocSection] = useState<"overview" | "fixtures" | "modules" | "legal">("overview");

  const tabs: { id: Tab; label: string; stepNumber: string; subtitle: string; needsAuth: boolean; icon: React.ReactNode }[] = [
    { 
      id: "cases", 
      label: t("nav_tab_cases", "Audit cases"), 
      stepNumber: "01",
      subtitle: "Provenance & Workspace",
      needsAuth: true, 
      icon: <FileSearch className="w-4 h-4" /> 
    },
    { 
      id: "citizen", 
      label: t("nav_tab_citizen", "Check a decision"), 
      stepNumber: "02",
      subtitle: "Black-Box Query Probing",
      needsAuth: true, 
      icon: <ShieldCheck className="w-4 h-4" /> 
    },
    { 
      id: "auditor", 
      label: t("nav_tab_auditor", "Auditor console"), 
      stepNumber: "03",
      subtitle: "100/101 Synthetic Anomaly Matrix",
      needsAuth: true, 
      icon: <Scale className="w-4 h-4" /> 
    },
    { 
      id: "verify", 
      label: t("nav_tab_verify", "Verify a report"), 
      stepNumber: "04",
      subtitle: "Ed25519 & Merkle Proof Seal",
      needsAuth: false, 
      icon: <QrCode className="w-4 h-4" /> 
    },
  ];

  const activeTab = tabs.find((e) => e.id === tab)!;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#0B1B3D] selection:bg-[#F59E0B] selection:text-[#0B1B3D]">
      
      {/* ── Fixed Workspace Header ────────────────────────────────────── */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FAF9F6]/95 border-b border-[#0B1B3D]/10 px-4 sm:px-8 py-3.5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Back button + Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#0B1B3D]/15 bg-white hover:bg-neutral-50 hover:border-[#EA580C] text-xs font-mono font-bold text-[#0B1B3D] transition-all cursor-pointer shadow-2xs group"
              title="Return to Landing Page"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-[#EA580C]" />
              <span className="hidden sm:inline">Back to Overview</span>
              <span className="sm:hidden">Back</span>
            </button>

            <div className="h-5 w-[1px] bg-[#0B1B3D]/15 hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <img src="/logo-icon.png" alt="SENTINEL" className="h-7 w-auto object-contain" />
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-[#0B1B3D] leading-none">
                  SENTINEL
                </span>
                <span className="text-[10px] font-mono text-[#0B1B3D]/60 uppercase tracking-widest mt-0.5 hidden md:inline">
                  Verifiable Audit Sandbox
                </span>
              </div>
            </div>
          </div>

          {/* Center: Environment status indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/25 rounded-full text-[11px] font-mono text-[#0B1B3D]">
            <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
            <span>Sandbox Mode: Synthetic Data Only · No MahaDBT Connection</span>
          </div>

          {/* Right: Docs Link + Language Selector */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowDocs(!showDocs)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                showDocs 
                  ? "bg-[#0B1B3D] text-white border-[#0B1B3D]" 
                  : "bg-white border-[#0B1B3D]/15 text-[#0B1B3D] hover:border-[#0B1B3D]"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-[#EA580C]" />
              <span className="hidden sm:inline">Audit Methodology</span>
              <span className="sm:hidden">Docs</span>
              {showDocs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onDocsClick}
              className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-[#0B1B3D]/70 hover:text-[#0B1B3D] transition-colors"
            >
              <span>Full Guide</span>
              <ExternalLink className="w-3 h-3" />
            </button>

            <LanguageSelector />
          </div>
        </div>
      </header>

      {/* ── Collapsible Accurate Documentation Drawer ─────────────────── */}
      <AnimatePresence>
        {showDocs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="border-b border-[#0B1B3D]/15 bg-white overflow-hidden shadow-md"
          >
            <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-6">
              
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#0B1B3D]/10">
                <div>
                  <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#EA580C] font-bold">
                    <span>Verified Audit Specifications &amp; Implementation Guide</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#0B1B3D] tracking-tight">
                    SENTINEL Methodology &amp; Mathematical Specifications
                  </h3>
                </div>

                {/* Sub-nav tabs for documentation */}
                <div className="flex items-center gap-1.5 bg-[#FAF9F6] p-1 rounded-lg border border-[#0B1B3D]/10 text-xs font-mono">
                  <button
                    onClick={() => setActiveDocSection("overview")}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeDocSection === "overview" ? "bg-[#0B1B3D] text-white font-bold" : "text-[#0B1B3D]/70 hover:text-[#0B1B3D]"}`}
                  >
                    System Scope
                  </button>
                  <button
                    onClick={() => setActiveDocSection("fixtures")}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeDocSection === "fixtures" ? "bg-[#0B1B3D] text-white font-bold" : "text-[#0B1B3D]/70 hover:text-[#0B1B3D]"}`}
                  >
                    100/101 Fixtures
                  </button>
                  <button
                    onClick={() => setActiveDocSection("modules")}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeDocSection === "modules" ? "bg-[#0B1B3D] text-white font-bold" : "text-[#0B1B3D]/70 hover:text-[#0B1B3D]"}`}
                  >
                    Modules (M1–M5)
                  </button>
                  <button
                    onClick={() => setActiveDocSection("legal")}
                    className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${activeDocSection === "legal" ? "bg-[#0B1B3D] text-white font-bold" : "text-[#0B1B3D]/70 hover:text-[#0B1B3D]"}`}
                  >
                    RTI Recourse
                  </button>
                </div>
              </div>

              {/* Documentation Content Sections */}
              <div className="pt-4 text-xs leading-relaxed text-[#0B1B3D]/80">
                {activeDocSection === "overview" && (
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#0B1B3D]/10">
                      <div className="font-mono text-[11px] font-bold text-[#0B1B3D] uppercase mb-1">
                        Zero Server Privilege Requirement
                      </div>
                      <p>
                        SENTINEL operates strictly outside target welfare infrastructure. It does not inspect confidential government databases, internal server states, or live MahaDBT systems. Instead, it measures input-output statistical signatures to expose discriminatory decision boundaries.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#0B1B3D]/10">
                      <div className="font-mono text-[11px] font-bold text-[#0B1B3D] uppercase mb-1">
                        Canonical JSON &amp; Cryptographic Proofs
                      </div>
                      <p>
                        Every audit outcome is recorded as a canonicalized JSON payload, chained via SHA-256 Merkle root hashing, and signed using Ed25519 asymmetric cryptography. This ensures reports cannot be retroactively altered or backdated when presented during administrative appeals.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#0B1B3D]/10">
                      <div className="font-mono text-[11px] font-bold text-[#0B1B3D] uppercase mb-1">
                        Human-in-the-Loop Recourse
                      </div>
                      <p>
                        SENTINEL does not make final legal adjudications. It synthesizes verifiable statistical discrepancies into pre-drafted Section 6 RTI inquiry forms and university grievance filings for human review and formal legal submission.
                      </p>
                    </div>
                  </div>
                )}

                {activeDocSection === "fixtures" && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#0B1B3D]/10">
                      <h4 className="font-mono text-xs font-bold text-[#0B1B3D] uppercase mb-2">
                        Synthetic Maharashtrian Student Corpus (100 Clean + 1 Flawed Fixture)
                      </h4>
                      <p className="mb-2">
                        To validate audit efficacy without handling sensitive personal student records, the sandbox uses a calibrated corpus of 101 synthetic records based on Maharashtra Post-Matric Scholarship criteria:
                      </p>
                      <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-[#0B1B3D]/80">
                        <li><strong>100 Clean Baseline Rows:</strong> Compliant profiles with income below ₹2.5L / ₹8L statutory caps, valid caste certificates (SC, ST, VJNT, OBC), and standard university attendance metrics (&ge;75%).</li>
                        <li><strong>1 Known-Flawed Row (Row #101):</strong> A synthetic anomaly profile where an eligible student from a minority taluka is covertly rejected due to an unannounced categorical quota threshold trap.</li>
                        <li><strong>Audit Signal Recall:</strong> All 3 audit vectors (Membership Inference, Rationale Perturbation, Quota Depletion) correctly trigger on Row #101, proving 100% recall on the controlled anomaly.</li>
                      </ul>
                    </div>
                  </div>
                )}

                {activeDocSection === "modules" && (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#0B1B3D]/10">
                      <span className="text-[10px] font-mono text-[#EA580C] font-bold">MODULE 1 (M1)</span>
                      <h5 className="font-bold text-xs text-[#0B1B3D] mt-0.5">LiRA Membership Inference</h5>
                      <p className="mt-1 text-[11px]">
                        Evaluates likelihood ratio scores against local shadow models to detect whether specific student cohort data was memorized or selectively filtered.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#0B1B3D]/10">
                      <span className="text-[10px] font-mono text-blue-600 font-bold">MODULE 2 (M2)</span>
                      <h5 className="font-bold text-xs text-[#0B1B3D] mt-0.5">Reason-Consistency Testing</h5>
                      <p className="mt-1 text-[11px]">
                        Perturbs non-critical profile features to check whether official rejection rationales are mathematically consistent with decision model behavior.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#0B1B3D]/10">
                      <span className="text-[10px] font-mono text-emerald-600 font-bold">MODULE 3 (M3)</span>
                      <h5 className="font-bold text-xs text-[#0B1B3D] mt-0.5">Signed Merkle Ledger</h5>
                      <p className="mt-1 text-[11px]">
                        Hashes every case and report into a verifiable SHA-256 Merkle root sealed with Ed25519 asymmetric signatures. Third parties can verify copies offline.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#0B1B3D]/10">
                      <span className="text-[10px] font-mono text-purple-600 font-bold">MODULE 4 (M4)</span>
                      <h5 className="font-bold text-xs text-[#0B1B3D] mt-0.5">Role-Quota Gateway</h5>
                      <p className="mt-1 text-[11px]">
                        JWT token session management applying tiered rate boundaries to simulate public vs. accredited auditor query permissions.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#0B1B3D]/10">
                      <span className="text-[10px] font-mono text-amber-600 font-bold">MODULE 5 (M5)</span>
                      <h5 className="font-bold text-xs text-[#0B1B3D] mt-0.5">Rényi DP Privacy Budget</h5>
                      <p className="mt-1 text-[11px]">
                        Monitors cumulative query privacy loss (&epsilon;, &delta;) to ensure auditing probes do not leak individual student information.
                      </p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#FAF9F6] border border-[#0B1B3D]/10">
                      <span className="text-[10px] font-mono text-rose-600 font-bold">RECOURSE</span>
                      <h5 className="font-bold text-xs text-[#0B1B3D] mt-0.5">Automated Dispute Briefs</h5>
                      <p className="mt-1 text-[11px]">
                        Converts verified algorithmic discrepancies into editable RTI and grievance inquiry drafts ready for administrative submission.
                      </p>
                    </div>
                  </div>
                )}

                {activeDocSection === "legal" && (
                  <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#0B1B3D]/10">
                    <h4 className="font-mono text-xs font-bold text-[#0B1B3D] uppercase mb-2">
                      Legal Admissibility &amp; Maharashtra Grievance Redressal
                    </h4>
                    <p className="mb-3">
                      When students or college desks question an automated rejection, government departments often claim decisions are purely automated by the central portal. SENTINEL bridges the evidence gap:
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-white border border-[#0B1B3D]/10">
                        <strong className="text-[#0B1B3D] block font-mono text-[11px]">1. Right to Information Act (RTI) 2005</strong>
                        <p className="mt-1 text-[11px]">
                          Under Section 6(1), applicants can request the exact automated business rules and scorecards applied to their application, citing the signed SENTINEL audit report as prima facie proof of anomalous processing.
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-white border border-[#0B1B3D]/10">
                        <strong className="text-[#0B1B3D] block font-mono text-[11px]">2. Maharashtra Administrative Tribunal (MAT)</strong>
                        <p className="mt-1 text-[11px]">
                          Cryptographically sealed evidence packs with tamper-proof Merkle timestamps provide verifiable proof that eligible candidates were rejected due to unannounced software quota limits rather than genuine ineligibility.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main Workspace Content ────────────────────────────────────── */}
      <main className="flex-1 py-8 px-4 sm:px-8">
        <div className="max-w-[1440px] mx-auto space-y-8">

          {/* ── Visual Flow: The 4-Stage Audit Lifecycle ── */}
          <section className="bg-white rounded-2xl border border-[#0B1B3D]/12 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#EA580C] font-bold">
                  <span>Interactive Audit Progression</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0B1B3D]">
                  The 4-Stage Verifiable Audit Lifecycle
                </h2>
              </div>
              <div className="text-xs font-mono text-[#0B1B3D]/60 hidden sm:block">
                Click any step to switch workspace context
              </div>
            </div>

            {/* Stepper Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
              {tabs.map((tItem, idx) => {
                const isActive = tab === tItem.id;
                return (
                  <button
                    key={tItem.id}
                    onClick={() => setTab(tItem.id)}
                    className={`relative p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isActive 
                        ? "bg-[#FAF9F6] border-[#EA580C] shadow-md ring-1 ring-[#EA580C]/25" 
                        : "bg-white border-[#0B1B3D]/10 hover:border-[#0B1B3D]/30 hover:bg-[#FAF9F6]/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded ${
                          isActive ? "bg-[#EA580C] text-white" : "bg-neutral-100 text-[#0B1B3D]/70"
                        }`}>
                          STAGE {tItem.stepNumber}
                        </span>
                        <div className={`p-1.5 rounded-lg ${isActive ? "text-[#EA580C]" : "text-neutral-400"}`}>
                          {tItem.icon}
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-[#0B1B3D] mt-1">
                        {tItem.label}
                      </h4>
                      <p className="text-xs text-[#0B1B3D]/60 mt-0.5">
                        {tItem.subtitle}
                      </p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-[#0B1B3D]/5 flex items-center justify-between text-[10px] font-mono">
                      <span className={isActive ? "text-[#EA580C] font-bold" : "text-[#0B1B3D]/40"}>
                        {isActive ? "● CURRENT VIEW" : "CLICK TO JUMP"}
                      </span>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? "text-[#EA580C] translate-x-1" : "text-neutral-400"}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Active Tab Workspace Area ── */}
          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">

            {/* Sidebar Navigation */}
            <aside className="rounded-2xl bg-white border border-[#0B1B3D]/12 p-4 shadow-sm h-fit lg:sticky lg:top-20 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-5 h-5 text-[#EA580C]" />
                  <span className="font-bold text-[#0B1B3D] tracking-tight">Audit Modules</span>
                </div>
                <p className="text-[11px] text-[#0B1B3D]/60 leading-relaxed font-mono">
                  {t("nav_brand_subtitle", "Public-interest audit workspace")}
                </p>
              </div>

              <nav className="space-y-1">
                {tabs.map((entry) => {
                  const isCurrent = tab === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setTab(entry.id)}
                      aria-current={isCurrent ? "page" : undefined}
                      className={`flex min-h-10 w-full items-center justify-between gap-2.5 rounded-xl px-3 text-left text-xs font-mono transition-all duration-200 cursor-pointer ${
                        isCurrent
                          ? "bg-[#0B1B3D] text-white font-bold shadow-sm"
                          : "text-[#0B1B3D]/70 hover:bg-[#FAF9F6] hover:text-[#0B1B3D]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {entry.icon}
                        <span>{entry.label}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isCurrent ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
                      }`}>
                        {entry.stepNumber}
                      </span>
                    </button>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-[#0B1B3D]/10 text-[11px] font-mono space-y-2 text-[#0B1B3D]/70">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0B1B3D]">Scope Status</span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold">
                    SANDBOX
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed text-[#0B1B3D]/60">
                  {t("nav_scope_desc", "Synthetic fixtures only. Not connected to external services.")}
                </p>
              </div>
            </aside>

            {/* Main Content Workspace Panel */}
            <div className="rounded-2xl bg-white border border-[#0B1B3D]/12 p-6 md:p-8 shadow-sm space-y-6">

              {/* Panel Top Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#0B1B3D]/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-orange-500/10 text-[#EA580C]">
                      {activeTab.icon}
                    </span>
                    <h3 className="text-xl font-bold text-[#0B1B3D]">
                      {activeTab.label}
                    </h3>
                  </div>
                  <p className="text-xs text-[#0B1B3D]/60 mt-1 font-mono">
                    {t("demo_tag", "SENTINEL · local synthetic demonstration")} · {activeTab.subtitle}
                  </p>
                </div>
                <div className="text-xs font-mono text-[#0B1B3D]/60 bg-[#FAF9F6] border border-[#0B1B3D]/10 px-3 py-1.5 rounded-lg">
                  {t("evidence_scoped", "Evidence scoped to the selected case")}
                </div>
              </div>

              {/* Session Login & Quota Bar */}
              <WorkspaceSessionBar session={session} onSession={setSession} />

              {/* Tab Content Display */}
              <div>
                {activeTab.needsAuth && !session ? (
                  <div className="rounded-xl border border-[#0B1B3D]/15 bg-[#FAF9F6] px-6 py-8 space-y-4">
                    <h4 className="flex items-center gap-2 text-base font-bold text-[#0B1B3D]">
                      <LogIn className="h-5 w-5 text-[#EA580C]" />
                      {t("session_need_auth_title", "Start a local demo session")}
                    </h4>
                    <p className="text-xs text-[#0B1B3D]/70 leading-relaxed max-w-2xl font-sans">
                      {t("session_need_auth_desc", "Your selected role is a demo label. It scopes locally stored cases and configures query rate bounds, but does not verify identity, affiliation, consent, or authority.")}
                    </p>
                    <div className="flex items-start gap-2.5 rounded-lg border border-[#0B1B3D]/10 bg-white p-3.5 text-xs text-[#0B1B3D]/80">
                      <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#EA580C]" />
                      <p className="leading-relaxed">
                        {t("session_public_verify_notice", "Public report verification does not require a session.")}{" "}
                        <button 
                          className="font-bold text-[#EA580C] underline cursor-pointer ml-1" 
                          onClick={() => setTab("verify")}
                        >
                          {t("session_verify_link", "Verify a report now")}
                        </button>
                      </p>
                    </div>
                  </div>
                ) : tab === "cases" ? (
                  <CaseWorkspace />
                ) : tab === "citizen" ? (
                  <CitizenPortal />
                ) : tab === "auditor" ? (
                  <AuditorConsole />
                ) : (
                  <VerifyReport />
                )}
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ── Workspace Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-[#0B1B3D]/10 bg-white py-8 px-6 mt-12">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#0B1B3D]/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#0B1B3D]">SENTINEL</span>
            <span>· Algorithmic Trust &amp; Integrity Layer for Maharashtra Public Interest</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={onBack} className="hover:text-[#EA580C] transition-colors cursor-pointer">
              ← Return to Landing Page
            </button>
            <button onClick={onDocsClick} className="hover:text-[#EA580C] transition-colors cursor-pointer">
              Documentation
            </button>
            <span>IEEE Computer Society Hackathon</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WORKSPACE SESSION BAR (Role selector + Authenticated Status)
══════════════════════════════════════════════════════════════════ */
function WorkspaceSessionBar({
  session,
  onSession,
}: {
  session: LoginResponse | null;
  onSession: (v: LoginResponse | null) => void;
}) {
  const { t } = useLanguage();
  const [subject, setSubject] = useState("Auditor Profile");
  const [role, setRole] = useState<Role>("journalist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRoleLabel = (id: Role) => {
    if (id === "citizen") return t("session_role_citizen", "Citizen demo role");
    if (id === "journalist") return t("session_role_journalist", "Journalist / RTI demo role");
    if (id === "certified_auditor") return t("session_role_auditor", "Auditor demo role");
    return t("session_role_gov", "Public-service demo role");
  };

  const getRoleDesc = (id: Role) => {
    if (id === "citizen") return t("session_role_citizen_desc", "Create and review a synthetic audit case.");
    if (id === "journalist") return t("session_role_journalist_desc", "Run the controlled synthetic demonstration.");
    if (id === "certified_auditor") return t("session_role_auditor_desc", "Run the controlled synthetic demonstration.");
    return t("session_role_gov_desc", "Synthetic demo only; not a verified official.");
  };

  const roleList: { id: Role; label: string; desc: string }[] = [
    { id: "citizen", label: getRoleLabel("citizen"), desc: getRoleDesc("citizen") },
    { id: "journalist", label: getRoleLabel("journalist"), desc: getRoleDesc("journalist") },
    { id: "certified_auditor", label: getRoleLabel("certified_auditor"), desc: getRoleDesc("certified_auditor") },
    { id: "gov_self_audit", label: getRoleLabel("gov_self_audit"), desc: getRoleDesc("gov_self_audit") },
  ];

  /* Authenticated banner */
  if (session) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#0B1B3D] bg-[#0B1B3D] text-white px-5 py-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#EA580C]/20 rounded-lg border border-white/20">
            <Server className="w-4 h-4 text-[#F59E0B] animate-pulse" />
          </div>
          <p className="text-xs font-mono">
            {t("session_auth_as", "Authenticated as:")}{" "}
            <span className="font-bold text-[#F59E0B]">{getRoleLabel(session.role)}</span>
            <span className="text-slate-400 ml-2 text-xs">
              · {session.queries_per_audit.toLocaleString()} {t("session_query_allowance", "query allowance per audit")}
            </span>
          </p>
        </div>
        <button
          className="text-xs font-mono font-bold text-[#F59E0B] hover:text-white flex items-center gap-1.5 cursor-pointer border border-[#F59E0B]/30 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          onClick={() => { setToken(null); onSession(null); }}
        >
          <LogOut className="w-3.5 h-3.5" /> {t("session_sign_out", "Sign out")}
        </button>
      </div>
    );
  }

  /* Login selection panel */
  return (
    <div className="rounded-2xl border border-[#0B1B3D]/12 bg-[#FAF9F6] px-5 py-5 shadow-xs space-y-4">
      <div className="space-y-1">
        <h4 className="text-sm font-bold flex items-center gap-2 text-[#0B1B3D]">
          <KeyRound className="w-4 h-4 text-[#EA580C]" />
          {t("session_title", "Local demo session")}
        </h4>
        <p className="text-xs text-[#0B1B3D]/65 leading-relaxed font-sans">
          {t("session_desc", "This demo uses a role label to apply query limits; it does not verify your identity or affiliation.")}
        </p>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {roleList.map((r) => {
          const isSelected = role === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`text-left p-3 rounded-xl border text-xs transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-[#EA580C] bg-white text-[#0B1B3D] font-bold shadow-xs ring-1 ring-[#EA580C]/20"
                  : "border-[#0B1B3D]/10 bg-white/60 text-[#0B1B3D]/70 hover:border-[#0B1B3D]/30 hover:bg-white hover:text-[#0B1B3D]"
              }`}
            >
              <div className="font-bold mb-0.5 text-xs text-[#0B1B3D]">{r.label}</div>
              <div className="text-[11px] leading-snug opacity-75 font-sans">{r.desc}</div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 items-end pt-1">
        <label className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0B1B3D]/60">
            {t("session_label_input", "Demo session label")}
          </span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border border-[#0B1B3D]/15 bg-white px-3.5 py-2 rounded-lg text-xs font-mono text-[#0B1B3D] placeholder:text-neutral-400 focus:outline-none focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C] transition-all"
            placeholder={t("session_label_placeholder", "e.g. RTI Auditor #21")}
          />
        </label>

        <button
          className="inline-flex items-center justify-center gap-2 bg-[#0B1B3D] text-white px-5 py-2 text-xs font-mono font-bold tracking-wider uppercase rounded-lg transition-all duration-200 hover:bg-[#EA580C] shadow-sm disabled:opacity-45 disabled:cursor-not-allowed h-[38px] cursor-pointer"
          disabled={busy || !subject.trim()}
          onClick={async () => {
            setBusy(true); 
            setError(null);
            try {
              const res = await api.login(subject.trim(), role);
              setToken(res.access_token);
              onSession(res);
            } catch (e) {
              setError(e instanceof ApiError ? e.message : "Could not reach backend on port 8000. Operating in offline demo mode.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <LogIn className="w-3.5 h-3.5" />
          {busy ? t("session_starting", "Starting session…") : t("session_start_btn", "Start demo session")}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 border-l-4 border-amber-500 bg-amber-50 px-4 py-2.5 rounded-r-xl text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="font-mono text-amber-800">{error}</p>
        </div>
      )}
    </div>
  );
}
