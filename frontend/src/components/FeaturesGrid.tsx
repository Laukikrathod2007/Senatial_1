"use client";

import React from "react";

export function FeaturesGrid() {
  const cards = [
    {
      title: "Audit Case Workspace",
      desc: "Records an investigation question, reported source, provenance note, access state, reviewer notes, and follow-up. Stores case metadata, not uploaded evidence files.",
      video: "https://cdn.reducto.ai/landing-page/illustrations/features/Features_Layout%20Extraction_v001.webm",
      icon: "📁",
    },
    {
      title: "Membership-Inference Analysis",
      desc: "Demonstrates LiRA and shadow-model methods against the project's local target to screen for membership signals. Local-model demo; not live applicant data.",
      video: "https://cdn.reducto.ai/landing-page/illustrations/features/Features_File%20Type%20Support_v001.webm",
      icon: "🔬",
    },
    {
      title: "Reason-Consistency Testing",
      desc: "Perturbs a feature named in a synthetic explanation to measure model response shifts. Provides a signal for human review, not proof of internal reasoning.",
      video: "https://cdn.reducto.ai/landing-page/illustrations/features/Features_Language%20Support_v001.webm",
      icon: "⚖️",
    },
    {
      title: "Cohort Stress Testing",
      desc: "Compares generated demographic cohorts against baseline distributions to screen for outcome disparities. A signal for review, not proof of causation.",
      video: "https://cdn.reducto.ai/landing-page/illustrations/features/Features_LLM%20optimized_v001.webm",
      icon: "📊",
    },
    {
      title: "Signed Report Ledger",
      desc: "Uses canonical JSON serialization, SHA-256 hash chaining, Merkle-root computation, and Ed25519 signatures to detect changes to exported reports.",
      video: "https://cdn.reducto.ai/landing-page/illustrations/features/Features_Image%20support_v001.webm",
      icon: "🔏",
    },
    {
      title: "Human Review & Follow-Up",
      desc: "Enables reviewers to record human notes and generate editable RTI or grievance drafts. A person must review, verify, and submit any follow-up.",
      staticCard: true,
      icon: "🛡️",
    },
  ];

  return (
    <section id="features" className="py-28 bg-[#fdfdfc] border-b border-neutral-200">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
        
        {/* Header - serif matching Reducto style */}
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#9177CF] block mb-3">
            :: Capabilities
          </span>
          <h2 
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            className="text-4xl sm:text-5xl font-normal text-[#0C1F4A] leading-tight tracking-tight mb-6"
          >
            Modular auditing and evidence preservation.
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 max-w-2xl mx-auto leading-relaxed">
            Six purpose-built capabilities for recording case context, testing local decision behavior, and protecting report integrity.
          </p>
        </div>

        {/* 3-Column Features Grid with dotted side dividers */}
        <div className="grid md:grid-cols-3 border-t border-b border-dashed border-neutral-300 divide-y md:divide-y-0 md:divide-x divide-dashed divide-neutral-300">
          {cards.map((item, idx) => (
            <div
              key={item.title}
              className="p-8 hover:bg-[#f9f9f8] transition-colors duration-300 flex flex-col justify-between min-h-[380px]"
            >
              {/* Media Visual */}
              <div className="aspect-[4/3] bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden flex items-center justify-center relative mb-8">
                {item.staticCard ? (
                  /* Static icon card */
                  <div className="flex flex-col items-center justify-center gap-4 text-neutral-400">
                    <span className="text-5xl">{item.icon}</span>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#EA580C] font-semibold">
                      On-Premise Ready
                    </span>
                  </div>
                ) : (
                  /* WebM video loops */
                  <video
                    src={item.video}
                    autoPlay={true}
                    muted={true}
                    playsInline={true}
                    loop={true}
                    className="w-full h-full object-cover mix-blend-multiply opacity-80"
                  />
                )}
              </div>

              {/* Title & Body */}
              <div>
                <h3 className="font-sans font-bold text-[#0C1F4A] text-base mb-3 flex items-center gap-2">
                  <span className="text-neutral-400 text-sm font-mono">{idx + 1}.</span>
                  <span>{item.title}</span>
                </h3>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
