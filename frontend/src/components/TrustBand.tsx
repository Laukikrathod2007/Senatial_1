"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, 
  Binary, 
  Key, 
  Cpu, 
  GraduationCap, 
  Users, 
  Store, 
  Landmark, 
  ArrowRight,
  CheckCircle2,
  ExternalLink
} from "lucide-react";

interface TechPillar {
  id: string;
  name: string;
  category: string;
  badge: string;
  icon: React.ReactNode;
  summary: string;
  details: string;
}

const TECH_PILLARS: TechPillar[] = [
  {
    id: "crypto",
    name: "Ed25519 & SHA-256",
    category: "Cryptographic Integrity",
    badge: "TAMPER-PROOF LEDGER",
    icon: <ShieldCheck className="w-5 h-5 text-blue-600" />,
    summary: "Canonical Merkle Root Sealing",
    details: "Audit reports are serialized into canonical JSON and sealed with Ed25519 asymmetric signatures. Any retrospective alteration by administrators or auditors produces an instant signature mismatch."
  },
  {
    id: "lira",
    name: "LiRA & Perturbation",
    category: "Algorithmic Probing",
    badge: "ZERO-ACCESS AUDIT",
    icon: <Binary className="w-5 h-5 text-amber-600" />,
    summary: "Black-Box Decision Consistency",
    details: "Audits decision boundaries from the outside by systematically perturbing non-sensitive features (e.g. income thresholds) and running Likelihood Ratio Tests against local shadow models."
  },
  {
    id: "jwt",
    name: "JWT & DP Quota Gateway",
    category: "Rate & Privacy Budget",
    badge: "DIFFERENTIAL PRIVACY",
    icon: <Key className="w-5 h-5 text-emerald-600" />,
    summary: "Bounded Query Accounting",
    details: "Enforces role-based query quotas (Citizen: 25, Journalist: 500, Auditor: 5,000) with Rényi Differential Privacy tracking to prevent exploratory data extraction attacks on public models."
  },
  {
    id: "stack",
    name: "FastAPI + SQLite ORM",
    category: "Reproducible Engine",
    badge: "MODULAR OPEN STACK",
    icon: <Cpu className="w-5 h-5 text-purple-600" />,
    summary: "Deterministic Local Testing",
    details: "Fully reproducible local backend using SQLAlchemy ORM and structured migration fixtures. Ensures all audit benchmarks can be re-run and independently verified on standard hardware."
  }
];

interface ContextCase {
  id: string;
  title: string;
  shortLabel: string;
  role: string;
  icon: React.ReactNode;
  painPoint: string;
  solution: string;
  impactTag: string;
}

const CONTEXT_CASES: ContextCase[] = [
  {
    id: "college",
    title: "College Scholarship Sections & Student Desks",
    shortLabel: "College Scholarship Desks",
    role: "Nodal Officers & College Clerical Desks",
    icon: <GraduationCap className="w-4 h-4 text-[#EA580C]" />,
    painPoint: "High-volume silent rejections occur during peak Post-Matric admission deadlines without granular explanations, leaving students facing fee arrears.",
    solution: "Runs batch cohort consistency audits to detect systemic schema-level rejection traps before the government portal cutoff date.",
    impactTag: "Prevents bulk administrative rejections across SC, ST, OBC and EBC cohorts"
  },
  {
    id: "ngo",
    title: "NGOs & Community Organizations",
    shortLabel: "NGOs & Community Orgs",
    role: "Grassroots Advocates & RTI Petitioners",
    icon: <Users className="w-4 h-4 text-blue-600" />,
    painPoint: "Advocacy groups lack verifiable, mathematically sound evidence when petitioning against systemic demographic bias in scholarship disbursements.",
    solution: "Generates Ed25519-signed dispute briefs with Merkle hash proofs admissible in Section 6 RTI appeals and State Human Rights inquiries.",
    impactTag: "Produces tamper-evident evidence packages ready for legal appeal"
  },
  {
    id: "seva",
    title: "Aaple Sarkar / e-Seva Assisted-Access Points",
    shortLabel: "Aaple Sarkar / e-Seva Kiosks",
    role: "Village Level Entrepreneurs (VLEs) & Kiosk Operators",
    icon: <Store className="w-4 h-4 text-emerald-600" />,
    painPoint: "First-generation rural applicants receive cryptic machine rejection codes with zero guidance, causing panic and repeat travel to district offices.",
    solution: "Translates machine-level decision discrepancies into clear Marathi and Hindi explanations with actionable checklist steps.",
    impactTag: "Bridges the digital divide with vernacular decision transparency"
  },
  {
    id: "mahadbt",
    title: "MahaDBT Prototype Context",
    shortLabel: "MahaDBT Sandbox Context",
    role: "Public Interest Accountability Sandbox",
    icon: <Landmark className="w-4 h-4 text-purple-600" />,
    painPoint: "Direct Benefit Transfer algorithms are closed black boxes; citizens and researchers cannot inspect live government servers.",
    solution: "Evaluates simulated welfare decision logic safely in a controlled synthetic sandbox without touching confidential state databases.",
    impactTag: "Safe, non-invasive auditing architecture for public algorithms"
  }
];

export function TrustBand() {
  const [activeTech, setActiveTech] = useState<string>("crypto");
  const [activeContext, setActiveContext] = useState<string>("college");

  const selectedTech = TECH_PILLARS.find(p => p.id === activeTech) || TECH_PILLARS[0];
  const selectedContext = CONTEXT_CASES.find(c => c.id === activeContext) || CONTEXT_CASES[0];

  return (
    <section className="py-16 bg-[#F9F8F5] border-b border-[#0B1B3D]/8 relative overflow-hidden">
      {/* Background subtle glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[300px] bg-amber-500/5 blur-[100px] pointer-events-none" />

      <div className="max-w-[1240px] mx-auto px-6 lg:px-12 relative z-10">

        {/* Section Headline */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#0B1B3D]/10 text-[11px] font-mono uppercase tracking-wider text-[#0B1B3D]/70 mb-3 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
            Verifiable Audit Architecture &amp; Field Context
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1B3D]">
            Technical Foundations Built for <span className="text-[#EA580C]">Public Accountability</span>
          </h3>
          <p className="text-sm text-[#0B1B3D]/70 max-w-2xl mx-auto mt-2 font-sans">
            Explore the four cryptographic and statistical pillars that enable SENTINEL to audit algorithmic welfare systems safely from the outside.
          </p>
        </div>

        {/* ── 4 Architecture Pillars (Interactive Cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          {TECH_PILLARS.map((pillar) => {
            const isSelected = activeTech === pillar.id;
            return (
              <button
                key={pillar.id}
                onClick={() => setActiveTech(pillar.id)}
                className={`p-4 rounded-xl text-left transition-all duration-200 border cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-white border-[#EA580C] shadow-md ring-1 ring-[#EA580C]/20"
                    : "bg-white/80 border-[#0B1B3D]/10 hover:border-[#0B1B3D]/30 hover:bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${isSelected ? "bg-amber-500/10" : "bg-neutral-100"}`}>
                      {pillar.icon}
                    </div>
                    <span className="text-[9px] font-mono tracking-wider text-[#0B1B3D]/60 uppercase font-semibold">
                      {pillar.badge}
                    </span>
                  </div>
                  <div className="font-mono text-sm font-bold text-[#0B1B3D]">
                    {pillar.name}
                  </div>
                  <div className="text-[11px] font-mono text-[#EA580C] mt-0.5">
                    {pillar.summary}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-[#0B1B3D]/5 flex items-center justify-between text-[10px] font-mono text-[#0B1B3D]/40">
                  <span>{isSelected ? "ACTIVE VIEW" : "CLICK TO INSPECT"}</span>
                  <ArrowRight className={`w-3 h-3 transition-transform ${isSelected ? "translate-x-1 text-[#EA580C]" : ""}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Pillar Technical Deep Dive */}
        <motion.div
          key={selectedTech.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-xl border border-[#0B1B3D]/12 p-5 shadow-xs mb-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5 max-w-3xl">
            <div className="p-2.5 rounded-xl bg-amber-500/10 shrink-0 mt-0.5">
              {selectedTech.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono font-bold text-[#0B1B3D] uppercase tracking-wide">
                  {selectedTech.name}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-100 rounded text-neutral-600">
                  {selectedTech.category}
                </span>
              </div>
              <p className="text-xs text-[#0B1B3D]/80 leading-relaxed font-sans">
                {selectedTech.details}
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 text-[11px] font-mono font-semibold text-[#EA580C] bg-[#EA580C]/5 px-3 py-1.5 rounded-lg border border-[#EA580C]/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Zero Server Privileges Required</span>
          </div>
        </motion.div>

        {/* ── Maharashtra Public-Interest Workflow Ecosystem ── */}
        <div className="pt-8 border-t border-[#0B1B3D]/10">
          <div className="text-center mb-6">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#0B1B3D]/60 font-bold block mb-1">
              Field Deployment Context · Maharashtra Public-Interest Ecosystem
            </span>
            <p className="text-xs text-[#0B1B3D]/65 font-sans">
              Designed for scholarship nodal desks, citizen support kiosks, and grassroots advocates across Maharashtra
            </p>
          </div>

          {/* Interactive Context Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
            {CONTEXT_CASES.map((ctx) => {
              const isSelected = activeContext === ctx.id;
              return (
                <button
                  key={ctx.id}
                  onClick={() => setActiveContext(ctx.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-[#0B1B3D] text-white shadow-sm font-semibold"
                      : "bg-white border border-[#0B1B3D]/15 text-[#0B1B3D]/80 hover:border-[#EA580C] hover:text-[#0B1B3D]"
                  }`}
                >
                  {ctx.icon}
                  <span>{ctx.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Active Ecosystem Context Card */}
          <motion.div
            key={selectedContext.id}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl border border-[#0B1B3D]/12 p-6 shadow-sm max-w-3xl mx-auto"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#0B1B3D]/8 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-500/10">
                  {selectedContext.icon}
                </span>
                <h4 className="text-sm font-bold text-[#0B1B3D]">
                  {selectedContext.title}
                </h4>
              </div>
              <span className="text-[10px] font-mono text-[#EA580C] font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full">
                {selectedContext.role}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-xs font-sans text-[#0B1B3D]/80">
              <div className="p-3 bg-red-500/5 rounded-xl border border-red-500/15">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-700 mb-1">
                  Public Challenge
                </div>
                <p className="leading-relaxed">
                  {selectedContext.painPoint}
                </p>
              </div>

              <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/15">
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                  SENTINEL Solution
                </div>
                <p className="leading-relaxed">
                  {selectedContext.solution}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#0B1B3D]/5 flex items-center justify-between text-[11px] font-mono text-[#0B1B3D]/60">
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {selectedContext.impactTag}
              </span>
              <span className="text-[10px] text-neutral-400">Independent Sandbox Prototype</span>
            </div>
          </motion.div>

          <p className="text-[11px] text-[#0B1B3D]/50 font-mono mt-5 text-center max-w-2xl mx-auto">
            * Context note: Relevant public-interest use case settings. SENTINEL is an independent prototype and is not connected to MahaDBT or government portals.
          </p>
        </div>

      </div>
    </section>
  );
}
