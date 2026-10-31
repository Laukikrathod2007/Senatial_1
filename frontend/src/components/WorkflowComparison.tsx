"use client";

import React from "react";
import { motion } from "framer-motion";
import { Calendar, Plus, FileText, CheckCircle, ShieldAlert, Sparkles } from "lucide-react";

export function WorkflowComparison() {
  const languageCases = [
    {
      title: "Canonical Serialization",
      desc: "Deterministic JSON formatting before hashing and cryptographic signing.",
      icon: FileText,
    },
    {
      title: "Audit Hash Chaining",
      desc: "SHA-256 Merkle root computation across case execution records.",
      icon: Sparkles,
    },
    {
      title: "Ed25519 Report Signatures",
      desc: "Cryptographic signatures to help detect if exported report copies were modified.",
      icon: ShieldAlert,
    },
    {
      title: "Human Interpretation",
      desc: "Record caseworker notes and produce editable inquiry drafts for verification.",
      icon: CheckCircle,
    },
  ];

  return (
    <section id="audit-workflow" className="relative bg-[#f3f2ef] border-b border-neutral-300 overflow-hidden py-16 lg:py-24">
      {/* Corner crosshairs matching EigenPal exactly */}
      <div className="absolute top-0 left-0 w-3 h-3 text-neutral-400 font-mono text-xs select-none pointer-events-none">+</div>
      <div className="absolute top-0 right-0 w-3 h-3 text-neutral-400 font-mono text-xs select-none pointer-events-none">+</div>
      <div className="absolute bottom-0 left-0 w-3 h-3 text-neutral-400 font-mono text-xs select-none pointer-events-none">+</div>
      <div className="absolute bottom-0 right-0 w-3 h-3 text-neutral-400 font-mono text-xs select-none pointer-events-none">+</div>

      <div className="max-w-[1440px] mx-auto px-6 relative">
        
        {/* Main Side-by-Side comparison block */}
        <div className="border border-neutral-300 bg-white grid lg:grid-cols-2 relative shadow-sm overflow-hidden mb-20 divide-y lg:divide-y-0 lg:divide-x divide-neutral-300">
          
          {/* Left Column: Common Manual Challenges */}
          <div className="flex flex-col justify-between h-full bg-white">
            <div className="p-8 lg:p-12">
              <h3 className="text-2xl font-bold text-[#0C1F4A] mb-8 tracking-tight">
                Common Manual Challenges
              </h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded bg-neutral-500 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0C1F4A] text-sm">Raise a Concern</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">The question may be described inconsistently to each helper or office.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded bg-neutral-500 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0C1F4A] text-sm">Track Context & Provenance</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Source, assumptions, and initial context become separated from notes.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded bg-neutral-500 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0C1F4A] text-sm">Examine a Possible Issue</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Test assumptions, methodology, and screening limits remain unclear.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded bg-neutral-500 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0C1F4A] text-sm">Preserve the Result</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Report copies can be altered, disputed, or detached from origin.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded bg-neutral-500 text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    5
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0C1F4A] text-sm">Organize Follow-Up</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Students or helpers must formulate subsequent inquiries on their own.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gray bottom banner */}
            <div className="bg-neutral-100 border-t border-neutral-200 text-neutral-700 px-8 py-4 font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-between">
              <span>FRAGMENTED & HARD TO RECONSTRUCT</span>
              <Calendar className="w-4 h-4 text-neutral-500" />
            </div>
          </div>

          {/* Right Column: SENTINEL Structured Workflow */}
          <div className="flex flex-col justify-between h-full bg-white">
            <div className="p-8 lg:p-12">
              <h3 className="text-2xl font-bold text-[#0C1F4A] mb-8 tracking-tight">
                SENTINEL Structured Workflow
              </h3>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0B1B3D] text-sm">Record Investigation Question</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Record the non-sensitive core inquiry consistently in one case workspace.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0B1B3D] text-sm">Store Provenance Metadata</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Keep source context, reported provenance, and access state with the case.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0B1B3D] text-sm">Documented Criteria & Limits</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Show available checks, criteria, status, and limitations alongside results.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0B1B3D] text-sm">Signed Report Ledger</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Sign reports and support cryptographic integrity verification under key.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 rounded bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                    5
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0B1B3D] text-sm">Human-Reviewed Follow-Up</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">Provide editable drafts and a structured place to record caseworker review.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Amber bottom banner */}
            <div className="bg-[#0B1B3D] text-white px-8 py-4 font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-between">
              <span>STRUCTURED · EVIDENCE-PRESERVED</span>
              <Plus className="w-4 h-4 text-[#EA580C]" />
            </div>
          </div>

        </div>

        {/* Natural Language features carousel list */}
        <div className="text-center">
          <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#0C1F4A] mb-8">
            Verifiable Architecture Standards
          </h3>

          {/* Sliding horizontal track */}
          <div className="w-full overflow-hidden relative py-4 mask-horizontal">
            <motion.div
              className="flex gap-6 w-max"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
            >
              {[1, 2].map((loopIdx) => (
                <React.Fragment key={loopIdx}>
                  {languageCases.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={`${item.title}-${loopIdx}`}
                        className="bg-white p-6 rounded-xl border border-neutral-300 shadow-sm w-72 flex flex-col justify-between flex-shrink-0 hover:shadow-md hover:border-neutral-400 transition-all cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-[#EA580C] mb-4">
                          <Icon className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-[#0C1F4A] text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">{item.desc}</p>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  );
}
