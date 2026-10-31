"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

const tabs = [
  {
    id: "college",
    label: "College Scholarship Desks",
    icon: "🎓",
    accentHex: "#4A7FB5",
    bgGradient: "linear-gradient(135deg, #E8F0F9 0%, #D8E8F5 100%)",
    tag: "Use cases",
    title: "College Scholarship Sections & Student Help Desks",
    body: [
      "Help students understand application process issues and organize questions for the relevant authority. Keep the ",
      { text: "reported concern and its source", colored: true },
      " together, document what is missing or uncertain, and prepare a ",
      { text: "human-reviewed follow-up draft", colored: true },
      ".",
    ],
    quote: "SENTINEL provides a structured intake so help desk coordinators don't lose track of applicant context when helping students follow up on stalled status updates.",
    quoteAuthor: "3 Documented Criteria Workflow",
    quoteOrg: "Student Inquiry Support",
    illustration: "https://cdn.reducto.ai/landing-page/illustrations/use-cases-finance-illustration.svg",
    pills: ["Intake", "Context"],
  },
  {
    id: "ngo",
    label: "NGOs & Public Auditors",
    icon: "⚖️",
    accentHex: "#3A8C6E",
    bgGradient: "linear-gradient(135deg, #E6F4EE 0%, #D8EFE6 100%)",
    tag: "Use cases",
    title: "NGO Caseworkers & Public-Interest Auditors",
    body: [
      "Help communities document recurring decision anomalies and examine whether they warrant a more formal, authorized audit. Organize concerns, ",
      { text: "provenance notes, and reviewer logs", colored: true },
      " in one case, inspect test limitations, and check whether a ",
      { text: "signed report copy has changed", colored: true },
      ".",
    ],
    quote: "3/3 planted criteria signaled in the controlled flawed fixture. Test criteria and limitations are displayed right alongside results to prevent over-interpretation.",
    quoteAuthor: "Controlled Test Demonstration",
    quoteOrg: "Evidence-Preserving Review",
    illustration: "https://cdn.reducto.ai/landing-page/illustrations/use-cases-insurance-illustration.svg",
    pills: ["Provenance", "Signatures"],
  },
  {
    id: "student",
    label: "Students & Communities",
    icon: "👥",
    accentHex: "#C4A882",
    bgGradient: "linear-gradient(135deg, #F5EFE6 0%, #EDE3D8 100%)",
    tag: "Use cases",
    title: "Students, Families & Community Members",
    body: [
      "Understand what questions can be asked, what remains uncertain, and what a human should review next. Get a clear explanation of ",
      { text: "what tests do and do not show", colored: true },
      ", keep reported facts separate from interpretations, and use an ",
      { text: "editable draft as a starting point", colored: true },
      ".",
    ],
    quote: "No real application records are needed for the demo. Students get clear, accessible explanations rather than confusing technical verdicts.",
    quoteAuthor: "0 Real Records Needed",
    quoteOrg: "Public-Interest Clarity",
    illustration: "https://cdn.reducto.ai/landing-page/illustrations/use-cases-healthcare-illustration.svg",
    pills: ["Clarity", "Drafts"],
  },
  {
    id: "assisted",
    label: "Assisted-Access (e-Seva)",
    icon: "🏢",
    accentHex: "#9B6B3A",
    bgGradient: "linear-gradient(135deg, #F5EBE0 0%, #EDE0D4 100%)",
    tag: "Use cases",
    title: "Aaple Sarkar / e-Seva Assisted-Access Setting",
    body: [
      "Treat Aaple Sarkar and e-Seva operators as a ",
      { text: "potential assisted-access channel", colored: true },
      " to help residents understand a process and navigate next steps. Any future deployment requires clear ",
      { text: "staff training, privacy controls, and approved procedures", colored: true },
      ".",
    ],
    quote: "Operators act as navigation guides, not automated judges. Assisted-service points help bridge the digital divide while adhering to strict privacy guardrails.",
    quoteAuthor: "Assisted-Access Context",
    quoteOrg: "Community Service Setting",
    illustration: "https://cdn.reducto.ai/landing-page/illustrations/use-cases-legal-illustration.svg",
    pills: ["Access", "Protocols"],
  },
];

type BodyPart = string | { text: string; colored: boolean };

export function UseCaseTabs() {
  const [activeIdx, setActiveIdx] = useState(0);
  const tab = tabs[activeIdx];

  return (
    <section id="use-cases" className="py-28 bg-[#f3f2ef] border-b border-neutral-200">
      <div className="max-w-[1100px] mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16 max-w-xl mx-auto">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 flex items-center justify-center gap-2 mb-4">
            🔗 Target Personas
          </span>
          <h2
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            className="text-4xl sm:text-5xl font-normal text-[#0C1F4A] tracking-tight leading-tight mb-4"
          >
            Built for accountable public-interest review.
          </h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            Designed for college scholarship desks, community NGOs, students, and assisted-service settings in Maharashtra.
          </p>
        </div>

        {/* ── Underline Tab Row — matching Reducto exactly ── */}
        <div className="flex items-center gap-1 border-b border-neutral-300 mb-0 overflow-x-auto scrollbar-none">
          {tabs.map((t, idx) => (
            <button
              key={t.id}
              onClick={() => setActiveIdx(idx)}
              className={`relative flex items-center gap-2 px-5 py-3 text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                activeIdx === idx
                  ? "text-[#0C1F4A] font-semibold"
                  : "text-neutral-400 hover:text-neutral-600"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {activeIdx === idx && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: t.accentHex }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          ))}
          <a
            href="#contact"
            className="ml-auto shrink-0 flex items-center gap-1.5 px-4 py-2.5 mb-[1px] text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-700 transition-colors rounded-sm"
          >
            <span className="opacity-60 text-[8px]">⠿</span>
            <span>Try your own</span>
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>

        {/* ── Main Panel ── */}
        <div className="border-x border-b border-neutral-200 bg-white shadow-sm overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="grid md:grid-cols-2 min-h-[460px]"
            >
              {/* LEFT: Description + Quote */}
              <div className="flex flex-col justify-between p-10 md:p-12 border-r border-neutral-100">
                <div>
                  <span
                    className="text-[10px] font-mono font-bold uppercase tracking-widest mb-4 block"
                    style={{ color: tab.accentHex }}
                  >
                    {tab.tag}
                  </span>
                  <h3
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    className="text-3xl font-normal text-[#0C1F4A] mb-5 leading-snug"
                  >
                    {tab.title}
                  </h3>
                  <p className="text-sm text-neutral-600 leading-relaxed mb-7">
                    {(tab.body as BodyPart[]).map((part, i) =>
                      typeof part === "string" ? (
                        <span key={i}>{part}</span>
                      ) : (
                        <span
                          key={i}
                          className="font-medium"
                          style={{ color: tab.accentHex }}
                        >
                          {part.text}
                        </span>
                      )
                    )}
                  </p>
                  <a
                    href="#contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0C1F4A] hover:bg-[#071230] text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    Get started <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Customer Quote */}
                <div className="mt-10 pt-8 border-t border-neutral-100">
                  <div className="flex gap-0.5 mb-3">
                    <span className="text-xl leading-none font-serif" style={{ color: tab.accentHex }}>❝</span>
                    <span className="text-xl leading-none font-serif" style={{ color: tab.accentHex }}>❝</span>
                  </div>
                  <p className="text-sm font-medium text-[#0C1F4A] leading-relaxed mb-4 italic">
                    {tab.quote}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="text-neutral-400">{tab.quoteAuthor}</span>
                    <span className="text-neutral-200">|</span>
                    <span className="font-bold tracking-widest text-neutral-600 uppercase">{tab.quoteOrg}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT: Illustration */}
              <div
                className="relative flex flex-col items-center justify-center p-10 overflow-hidden"
                style={{ background: tab.bgGradient }}
              >
                {/* Classification pills */}
                <div className="absolute top-5 left-5 flex gap-2 z-10">
                  {tab.pills.map((pill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 text-[9px] font-bold font-mono uppercase text-white flex items-center gap-1 shadow"
                      style={{ backgroundColor: i === 0 ? "#555" : tab.accentHex }}
                    >
                      <span className="opacity-60 text-[8px]">⠿</span>
                      {pill}
                    </span>
                  ))}
                </div>

                {/* SVG illustration */}
                <img
                  src={tab.illustration}
                  alt={`${tab.title} preview`}
                  className="w-full max-w-[340px] object-contain drop-shadow-xl rounded"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
