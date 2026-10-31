"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface VerificationCheck {
  label: string;
  status: "PASS" | "SIGNAL" | "REVIEW" | "NOT RUN" | "VERIFY";
  badge: string;
}

interface TestControlEntity {
  name: string;
  type: string;
  summary: string;
  criteriaSignaled: string;
  checks: VerificationCheck[];
}

const testEntities: TestControlEntity[] = [
  {
    name: "Clean Control Fixture",
    type: "Baseline Synthetic Set (100 Rows)",
    summary: "0 fixture signals on clean control",
    criteriaSignaled: "0 / 3 Criteria Signaled",
    checks: [
      { label: "Conflicting application statuses", status: "PASS", badge: "CASE FIXTURE" },
      { label: "Missing rejection reason", status: "PASS", badge: "CASE FIXTURE" },
      { label: "Subgroup approval gap", status: "PASS", badge: "FIXTURE TEST" },
      { label: "Membership inference", status: "NOT RUN", badge: "LOCAL AUDIT" },
      { label: "Reason consistency", status: "NOT RUN", badge: "LOCAL AUDIT" },
      { label: "Signed report integrity", status: "VERIFY", badge: "LEDGER KEY" },
    ],
  },
  {
    name: "Known-Flawed Fixture",
    type: "Planted Flaw Demonstration (101 Rows)",
    summary: "3 of 3 planted case criteria signaled",
    criteriaSignaled: "3 / 3 Criteria Signaled",
    checks: [
      { label: "Conflicting application statuses", status: "SIGNAL", badge: "CASE FIXTURE" },
      { label: "Missing rejection reason", status: "SIGNAL", badge: "CASE FIXTURE" },
      { label: "Subgroup approval gap", status: "REVIEW", badge: "30-PT DIFF" },
      { label: "Membership inference", status: "NOT RUN", badge: "LOCAL AUDIT" },
      { label: "Reason consistency", status: "NOT RUN", badge: "LOCAL AUDIT" },
      { label: "Signed report integrity", status: "VERIFY", badge: "LEDGER KEY" },
    ],
  },
];

export function BidDocumentAnimation() {
  const [entityIdx, setEntityIdx] = useState(0);
  const [currentCheckIdx, setCurrentCheckIdx] = useState(0);

  const activeEntity = testEntities[entityIdx];
  const checksToDisplay = activeEntity.checks.slice(0, currentCheckIdx + 1);

  // Cycle through checking animation step-by-step
  useEffect(() => {
    const checkTimer = setInterval(() => {
      setCurrentCheckIdx((prev) => {
        if (prev < activeEntity.checks.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 900);

    return () => clearInterval(checkTimer);
  }, [entityIdx]);

  // Cycle entities every 12 seconds
  useEffect(() => {
    const entityTimer = setInterval(() => {
      setEntityIdx((prev) => (prev + 1) % testEntities.length);
      setCurrentCheckIdx(0);
    }, 12000);

    return () => clearInterval(entityTimer);
  }, []);

  return (
    <section id="decision-scanner" className="py-16 bg-[#e8e6e1] border-y border-[rgba(12,31,74,0.1)] relative">
      <div className="max-w-[1440px] mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <span className="font-mono text-xs tracking-wider text-[#0C1F4A]/50 block mb-1">
              / CONTROLLED DECISION-TEST SCANNER
            </span>
            <h3 className="text-2xl font-medium tracking-tight text-[#0C1F4A]">
              Screening criteria demonstration under controlled fixtures
            </h3>
          </div>

          {/* Entity toggle */}
          <div className="inline-flex p-1 bg-white border border-neutral-300 rounded-lg shadow-xs font-mono text-xs">
            {testEntities.map((ent, idx) => (
              <button
                key={ent.name}
                onClick={() => { setEntityIdx(idx); setCurrentCheckIdx(0); }}
                className={`px-3 py-1.5 rounded transition-all ${
                  entityIdx === idx
                    ? "bg-[#0C1F4A] text-white font-bold"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {ent.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-stretch relative min-h-[440px]">
          {/* Left Side: Document Conveyor Belt */}
          <div className="lg:col-span-7 bg-[#f3f2ef]/40 rounded-2xl border border-neutral-300 relative overflow-hidden flex items-center p-6 shadow-inner">
            <motion.div
              className="flex items-center gap-6"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ repeat: Infinity, duration: 15, ease: "linear" }}
            >
              {[1, 2].map((loopIdx) => (
                <React.Fragment key={loopIdx}>
                  <div className="w-40 h-56 bg-white border border-neutral-300 rounded-xl p-3 shadow-sm flex flex-col justify-between flex-shrink-0">
                    <div className="h-1 bg-green-500 rounded-t-lg" />
                    <div>
                      <div className="font-mono text-[9px] text-[#0C1F4A]/50 mb-1">STAGE 1</div>
                      <div className="font-bold text-xs text-[#0C1F4A] truncate">Case Intake</div>
                      <div className="w-16 h-2 bg-neutral-200 rounded mt-2" />
                      <div className="w-24 h-1.5 bg-neutral-100 rounded mt-1" />
                      <div className="w-20 h-1.5 bg-neutral-100 rounded mt-1" />
                    </div>
                    <div className="w-full h-8 bg-neutral-50 rounded border border-dashed border-neutral-200 mt-2 flex items-center justify-center text-[9px] font-mono text-neutral-400">
                      Non-sensitive Question
                    </div>
                  </div>

                  <div className="w-40 h-56 bg-white border border-neutral-300 rounded-xl p-3 shadow-sm flex flex-col justify-between flex-shrink-0">
                    <div className="h-1 bg-sky-500 rounded-t-lg" />
                    <div>
                      <div className="font-mono text-[9px] text-[#0C1F4A]/50 mb-1">STAGE 2</div>
                      <div className="font-bold text-xs text-[#0C1F4A] truncate">Provenance Notes</div>
                      <div className="w-16 h-2 bg-neutral-200 rounded mt-2" />
                      <div className="w-20 h-1.5 bg-neutral-100 rounded mt-1" />
                    </div>
                    <div className="w-full h-8 bg-neutral-50 rounded border border-dashed border-neutral-200 mt-2 flex items-center justify-center text-[9px] font-mono text-neutral-400">
                      Access-State Metadata
                    </div>
                  </div>

                  <div className="w-40 h-56 bg-white border border-neutral-300 rounded-xl p-3 shadow-sm flex flex-col justify-between flex-shrink-0">
                    <div className="h-1 bg-amber-500 rounded-t-lg" />
                    <div>
                      <div className="font-mono text-[9px] text-[#0C1F4A]/50 mb-1">STAGE 3</div>
                      <div className="font-bold text-xs text-[#0C1F4A] truncate">Test Fixture</div>
                      <div className="w-16 h-2 bg-neutral-200 rounded mt-2" />
                    </div>
                    <div className="w-full h-8 bg-neutral-50 rounded border border-dashed border-neutral-200 mt-2 flex items-center justify-center text-[9px] font-mono text-neutral-400">
                      100 / 101 Rows
                    </div>
                  </div>

                  <div className="w-40 h-56 bg-white border border-neutral-300 rounded-xl p-3 shadow-sm flex flex-col justify-between flex-shrink-0">
                    <div className="h-1 bg-purple-500 rounded-t-lg" />
                    <div>
                      <div className="font-mono text-[9px] text-[#0C1F4A]/50 mb-1">STAGE 4</div>
                      <div className="font-bold text-xs text-[#0C1F4A] truncate">Signed Ledger</div>
                      <div className="w-20 h-2 bg-neutral-200 rounded mt-2" />
                      <div className="w-16 h-1.5 bg-neutral-100 rounded mt-1" />
                    </div>
                    <div className="w-full h-8 bg-neutral-50 rounded border border-dashed border-neutral-200 mt-2 flex items-center justify-center text-[9px] font-mono text-neutral-400">
                      Ed25519 · SHA-256
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </motion.div>

            {/* Central Vertical Scan Line & Badge */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#EA580C] z-20 flex items-center justify-center -translate-x-1/2">
              <div className="absolute inset-0 bg-[#EA580C] shadow-[0_0_15px_#EA580C]" />
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-12 h-12 rounded-full bg-white border-2 border-[#EA580C] shadow-lg z-30 flex items-center justify-center p-1"
              >
                <img src="/logo-icon.png" alt="SENTINEL Shield" className="w-7 h-7 object-contain" />
              </motion.div>
            </div>

            {/* Dotted Scan Overlay Mask */}
            <div className="absolute left-1/2 right-0 top-0 bottom-0 pointer-events-none opacity-20 bg-[#EA580C]/10" />
          </div>

          {/* Right Side: Verification Output Card */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-300 p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
                <div>
                  <h4 className="font-bold text-[#0B1B3D] text-sm truncate max-w-[200px]">
                    {activeEntity.name}
                  </h4>
                  <span className="text-[10px] text-neutral-400 font-mono">{activeEntity.type}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 text-[#0B1B3D] font-mono text-[10px] font-bold uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-ping" />
                  <span>Fixture Execution</span>
                </div>
              </div>

              {/* Checks Rows */}
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                <AnimatePresence>
                  {checksToDisplay.map((item) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-between p-2 rounded bg-[#f3f2ef]/40 border border-neutral-200"
                    >
                      <div className="flex items-center gap-2">
                        {item.status === "PASS" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                        {item.status === "SIGNAL" && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                        {item.status === "REVIEW" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        {item.status === "NOT RUN" && <span className="w-4 h-4 rounded-full border border-neutral-300 flex items-center justify-center text-[9px] text-neutral-400">-</span>}
                        {item.status === "VERIFY" && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                        <span className="text-xs font-semibold text-[#0C1F4A]">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-mono font-bold text-neutral-400 border border-neutral-200 px-1 py-0.5 rounded">
                          {item.badge}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold uppercase ${
                            item.status === "PASS"
                              ? "text-green-600"
                              : item.status === "SIGNAL" || item.status === "REVIEW"
                              ? "text-amber-600"
                              : item.status === "VERIFY"
                              ? "text-blue-600"
                              : "text-neutral-400"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Summary card once complete */}
            <div className="mt-6 pt-4 border-t border-neutral-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-[#0C1F4A]">
                  {activeEntity.criteriaSignaled}
                </span>
                <span className="text-xs font-mono text-neutral-500">
                  {activeEntity.summary}
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono mt-2">
                * Controlled test result, not a real-world accuracy estimate. These are screening criteria rather than legal findings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
