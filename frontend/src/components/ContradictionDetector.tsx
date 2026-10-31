"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

export function ContradictionDetector() {
  const [fixtureMode, setFixtureMode] = useState<"flawed" | "clean">("flawed");
  const [resolved, setResolved] = useState<boolean>(false);

  const refApproved = 35;
  const refTotal = 50;
  const compApproved = fixtureMode === "flawed" ? 20 : 35;
  const compTotal = 50;
  const diffPoints = fixtureMode === "flawed" ? 30 : 0;

  return (
    <section id="decision-review" className="py-20 bg-[#f3f2ef] border-b border-[rgba(12,31,74,0.08)]">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <span className="font-mono text-xs tracking-wider text-[#0C1F4A]/50 block mb-2">
              / SCHOLARSHIP COHORT DIFFERENCE REVIEW
            </span>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-[#0C1F4A]">
              Examine cohort differences with documented criteria.
            </h2>
          </div>

          {/* Fixture Toggle */}
          <div className="inline-flex p-1 bg-white border border-neutral-300 rounded-lg shadow-xs font-mono text-xs">
            <button
              onClick={() => { setFixtureMode("flawed"); setResolved(false); }}
              className={`px-3 py-1.5 rounded transition-all ${
                fixtureMode === "flawed"
                  ? "bg-[#0C1F4A] text-white font-bold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Known-Flawed Fixture
            </button>
            <button
              onClick={() => { setFixtureMode("clean"); setResolved(false); }}
              className={`px-3 py-1.5 rounded transition-all ${
                fixtureMode === "clean"
                  ? "bg-gradient-to-r from-[#EA580C] to-[#F59E0B] text-white font-bold shadow-xs"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Clean Control Fixture
            </button>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-neutral-500 max-w-3xl mb-12">
          Controlled demonstration review. When test cohorts exhibit outcome disparities in local fixtures, SENTINEL flags the gap for human interpretation and review rather than automated conclusions.
        </p>

        {/* Comparison Panel */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-neutral-300 shadow-xl overflow-hidden mb-10">
          <div className="grid md:grid-cols-2 relative divide-y md:divide-y-0 md:divide-x divide-neutral-200">
            
            {/* Left side: Reference Cohort */}
            <div className="p-8 bg-[#f0fdf4]/30">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold text-green-700">Reference Cohort</span>
                <span className="text-[10px] text-neutral-400 font-mono">Controlled Group A</span>
              </div>
              <div className="text-3xl font-mono font-extrabold text-[#0C1F4A] mb-2">
                {refApproved} / {refTotal} ({Math.round((refApproved/refTotal)*100)}%)
              </div>
              <div className="text-xs text-neutral-500 mb-6">Approval Rate (Baseline)</div>
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                <span>Sample Size: 50 records</span>
                <span className="text-green-600">Controlled Baseline ✓</span>
              </div>
            </div>

            {/* Warning Diamond Divider */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex flex-col items-center">
              <motion.div
                animate={diffPoints > 0 ? { scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={`w-10 h-10 rounded-lg text-white flex items-center justify-center shadow-lg font-bold text-sm ${
                  diffPoints > 0 ? "bg-amber-500" : "bg-emerald-600"
                }`}
              >
                {diffPoints > 0 ? "⚠" : "✓"}
              </motion.div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded mt-2 block shadow-sm border ${
                diffPoints > 0 
                  ? "bg-amber-100 border-amber-300 text-amber-800" 
                  : "bg-emerald-100 border-emerald-300 text-emerald-800"
              }`}>
                {diffPoints} PT DIFF
              </span>
            </div>

            {/* Right side: Comparison Cohort */}
            <div className={`p-8 transition-colors ${diffPoints > 0 ? "bg-[#fffbeb]/30" : "bg-[#f0fdf4]/30"}`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`text-xs font-mono font-bold ${diffPoints > 0 ? "text-amber-700" : "text-green-700"}`}>
                  Comparison Cohort
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">Controlled Group B</span>
              </div>
              <div className="text-3xl font-mono font-extrabold text-[#0C1F4A] mb-2">
                {compApproved} / {compTotal} ({Math.round((compApproved/compTotal)*100)}%)
              </div>
              <div className="text-xs text-neutral-500 mb-6">Approval Rate (Comparison)</div>
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                <span>Sample Size: 50 records</span>
                <span className={diffPoints > 0 ? "text-amber-600" : "text-green-600"}>
                  {diffPoints > 0 ? "Observed Signal ⚠" : "Parity Observed ✓"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Row below */}
          <div className="bg-neutral-50 border-t border-neutral-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 text-neutral-700">
              <AlertTriangle className={`w-4 h-4 ${diffPoints > 0 ? "text-amber-500" : "text-emerald-500"}`} />
              <span>
                {resolved 
                  ? "Human interpretation recorded. Note saved to case metadata."
                  : diffPoints > 0 
                    ? "REVIEW: 30 percentage point gap observed in controlled fixture. Human review required."
                    : "CONTROL: 0 percentage point difference observed on clean control fixture."}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setResolved(true)}
                className="px-4 py-2 border border-[#0C1F4A] hover:bg-[#0C1F4A] hover:text-white rounded transition-all font-mono text-xs"
              >
                Add Human Interpretation
              </button>
              {resolved && (
                <button
                  onClick={() => setResolved(false)}
                  className="px-3 py-2 border border-neutral-300 hover:bg-neutral-100 text-neutral-600 rounded text-xs"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="text-[11px] text-center text-neutral-400 font-mono mb-10">
          * Illustrative controlled test. Not a result about MahaDBT, a college, or actual applicants.
        </p>

        {/* 3 Principles */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white p-5 rounded-xl border border-neutral-300">
            <h4 className="font-bold text-xs text-[#0C1F4A] uppercase tracking-wider mb-2 font-mono">1. Controlled Fixtures</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Tested on 100/101 synthetic row demonstration sets to validate auditor tooling without accessing confidential records.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-300">
            <h4 className="font-bold text-xs text-[#0C1F4A] uppercase tracking-wider mb-2 font-mono">2. Disparity Screening, Not Proof</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              A difference in approval rates signals a pattern for human examination; it does not establish bias or legal infringement.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-300">
            <h4 className="font-bold text-xs text-[#0C1F4A] uppercase tracking-wider mb-2 font-mono">3. Documented Boundaries</h4>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Every result is paired with its specific test parameters and screening limits, preventing premature over-interpretation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
