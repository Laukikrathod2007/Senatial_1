"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Split, Sparkles, CheckSquare, X, ArrowRight, CheckCircle2 } from "lucide-react";

interface Step {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  desc: string;
  videoUrl: string;
  
  // Custom PS-Aligned Feature Details for the Modal
  tag: string;
  title: string;
  definition: string;
  whoItIsFor: string;
  problemItSolves: string;
  studioCta: string;
}

export function HowItWorks() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [modalStep, setModalStep] = useState<Step | null>(null);

  const steps: Step[] = [
    {
      id: "listen",
      name: "Listen",
      icon: FileText,
      color: "#4A9B7F",
      label: "Understand the concern",
      desc: "A student or community member explains what happened, and a helper turns it into a clear, non-sensitive question.",
      videoUrl: "https://cdn.reducto.ai/landing-page/illustrations/Section%202/Section%202_Parse_v004.webm",
      
      tag: "Case Intake",
      title: "Understand the concern and clarify the question",
      definition: "The Listen stage records an investigation question without collecting sensitive personal records, converting informal student inquiries into structured review questions.",
      whoItIsFor: "Students, families, college scholarship staff, NGO workers, or assisted-service operators.",
      problemItSolves: "People often struggle to articulate whether an issue is a status update lag, a procedural breakdown, or an algorithmic anomaly. For example: 'Status unchanged — what specific information can the student request?'",
      studioCta: "Review intake protocol in the case workspace."
    },
    {
      id: "document",
      name: "Document",
      icon: Split,
      color: "#2563EB",
      label: "Record source & context",
      desc: "Capture where the concern came from, what is known, and what permission or information would be needed for a real investigation.",
      videoUrl: "https://cdn.reducto.ai/landing-page/illustrations/Section%202/Section%202_Split_v004.webm",
      
      tag: "Provenance Workspace",
      title: "Record source, context, and access-state",
      definition: "The case workspace records provenance and access-state metadata without functioning as a confidential document repository, keeping context intact.",
      whoItIsFor: "College scholarship sections, NGOs, and case organizers.",
      problemItSolves: "Prevents sources, assumptions, and follow-up from becoming separated from the original question across distributed volunteers or offices.",
      studioCta: "Inspect case provenance records."
    },
    {
      id: "examine",
      name: "Examine",
      icon: Sparkles,
      color: "#CA8A04",
      label: "Check decision behavior",
      desc: "Select an appropriate test, review its criteria, and examine any observed signals and limitations.",
      videoUrl: "https://cdn.reducto.ai/landing-page/illustrations/Section%202/Section%202_Extract_v004.webm",
      
      tag: "Audit Modules",
      title: "Check decision behavior under controlled fixtures",
      definition: "Executes controlled test fixtures (clean control vs. known-flawed control) or local audit modules (membership inference, reason consistency, cohort stress tests) against target behavior.",
      whoItIsFor: "Technical auditors, researchers, trained NGO staff, or service owners.",
      problemItSolves: "Prevents misinterpreting results by showing exact test criteria, execution status, and explicit methodological limits directly alongside observed signals.",
      studioCta: "Run fixture analysis in the audit runner."
    },
    {
      id: "followup",
      name: "Follow Up",
      icon: CheckSquare,
      color: "#8B5E3C",
      label: "Review & take next step",
      desc: "A human reviews the report, records an interpretation, and decides whether to prepare an information request, grievance, or other follow-up.",
      videoUrl: "https://cdn.reducto.ai/landing-page/illustrations/Section%202/Section%202_Classify_v002.webm",
      
      tag: "Accountable Action",
      title: "Review findings and prepare human-verified follow-up",
      definition: "Enables reviewers to record human interpretations, verify Ed25519-signed report copies via SHA-256 Merkle roots, and produce editable RTI or grievance drafts.",
      whoItIsFor: "Students, college support staff, NGOs, and community-facing operators.",
      problemItSolves: "Bridges raw technical observations to responsible action. SENTINEL generates editable drafts; humans verify, sign, and submit them.",
      studioCta: "Generate editable follow-up drafts."
    },
  ];

  const activeStep = steps[activeIdx];

  return (
    <section id="how-it-works" className="py-28 bg-[#fdfdfc] border-b border-neutral-200">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
        
        {/* Section Header */}
        <div className="text-center mb-20 max-w-3xl mx-auto flex flex-col items-center">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-[#3B82F6] block mb-4">
            ⠿ Core Workflow
          </span>
          <h2 
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            className="text-4xl sm:text-5xl lg:text-6xl font-normal leading-tight tracking-tight text-[#0C1F4A] mb-4"
          >
            From a student's concern to accountable follow-up.
          </h2>
          <p className="text-sm sm:text-base text-neutral-500 max-w-xl leading-relaxed">
            A structured 4-stage public-interest workflow that connects case provenance, controlled decision testing, and tamper-evident reporting.
          </p>
        </div>

        {/* ── Two Column Reducto Accordion Layout ── */}
        <div className="grid lg:grid-cols-12 gap-16 items-start mt-12">
          
          {/* Left Column: Interactive vertical accordion list */}
          <div className="lg:col-span-6 space-y-6">
            {steps.map((step, idx) => {
              const isActive = idx === activeIdx;
              const StepIcon = step.icon;

              return (
                <div 
                  key={step.id} 
                  className={`border-b border-neutral-100 pb-6 transition-all duration-300 ${
                    isActive ? "" : "opacity-60 hover:opacity-100"
                  }`}
                >
                  {/* Step Header Title Link */}
                  <button
                    onClick={() => setActiveIdx(idx)}
                    className="w-full flex items-center gap-3.5 text-left cursor-pointer focus:outline-none"
                  >
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                      style={{ 
                        backgroundColor: isActive ? `${step.color}15` : "transparent",
                        color: isActive ? step.color : "#999"
                      }}
                    >
                      <StepIcon className="w-5 h-5" />
                    </div>
                    
                    <h3 
                      className="text-xl sm:text-2xl font-bold tracking-tight transition-colors duration-200"
                      style={{ color: isActive ? step.color : "#0C1F4A" }}
                    >
                      {step.name}
                    </h3>
                  </button>

                  {/* Expanded Accordion Body */}
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="pl-11 pt-3">
                          <p className="text-xs font-bold text-[#0C1F4A] mb-2 font-mono uppercase tracking-wider">
                            {step.label}
                          </p>
                          <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                            {step.desc}
                          </p>
                          <button
                            onClick={() => setModalStep(step)}
                            className="inline-flex items-center text-xs font-bold transition-all duration-200 hover:gap-1.5 cursor-pointer"
                            style={{ color: step.color }}
                          >
                            <span>Learn more</span>
                            <span className="ml-1">→</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Right Column: Asset Preview Area */}
          <div className="lg:col-span-6 bg-[#f8f8f6] rounded-2xl border border-neutral-200/80 p-8 shadow-sm min-h-[420px] flex items-center justify-center relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="w-full h-full flex items-center justify-center"
              >
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    src={activeStep.videoUrl}
                    autoPlay={true}
                    muted={true}
                    playsInline={true}
                    loop={true}
                    className="w-full max-h-[340px] object-contain rounded-xl drop-shadow-lg"
                  />
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur border border-neutral-200 px-3 py-1.5 rounded-lg shadow-sm font-mono text-[9px] text-[#0C1F4A] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-ping" />
                    <span>{activeStep.label}</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>

      {/* ── Slide-up / Fade-in Reducto Feature Page Modal ── */}
      <AnimatePresence>
        {modalStep && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#0C1F4A]/30 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-neutral-200 relative flex flex-col"
            >
              {/* Modal Top Close Bar */}
              <div className="flex justify-end p-4 border-b border-neutral-100">
                <button 
                  onClick={() => setModalStep(null)}
                  className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Core Layout — matching Reducto feature description page exactly */}
              <div className="p-8 sm:p-12 space-y-12">
                
                {/* Hero section of the feature page */}
                <div className="grid md:grid-cols-12 gap-8 items-center border-b border-neutral-100 pb-10">
                  <div className="md:col-span-7 space-y-4">
                    <span 
                      className="text-xs font-mono font-bold uppercase tracking-widest"
                      style={{ color: modalStep.color }}
                    >
                      {modalStep.name}
                    </span>
                    <h3 
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                      className="text-3xl sm:text-4xl font-normal text-[#0C1F4A] leading-tight"
                    >
                      {modalStep.title}
                    </h3>
                    <p className="text-sm text-neutral-500 leading-relaxed">
                      {modalStep.desc}
                    </p>
                    
                    <div className="flex flex-wrap gap-3 pt-2">
                      <button 
                        onClick={() => setModalStep(null)}
                        className="px-5 py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-mono font-bold uppercase tracking-wider transition-colors"
                      >
                        Try the API free
                      </button>
                      <button 
                        onClick={() => setModalStep(null)}
                        className="px-5 py-2.5 border border-neutral-300 text-[#0C1F4A] hover:bg-neutral-50 text-xs font-mono font-bold uppercase tracking-wider transition-colors"
                      >
                        Request a demo
                      </button>
                    </div>
                  </div>

                  <div className="md:col-span-5 flex justify-center">
                    <video 
                      src={modalStep.videoUrl} 
                      autoPlay 
                      muted 
                      loop 
                      className="w-full max-h-[220px] object-contain rounded-xl shadow-md border border-neutral-100"
                    />
                  </div>
                </div>

                {/* Specs Section: Definition, Who it's for, Problem it solves */}
                <div className="grid md:grid-cols-12 gap-8 items-start">
                  
                  {/* Left big serif subtitle */}
                  <div className="md:col-span-5">
                    <span 
                      className="text-xs font-mono font-bold uppercase tracking-widest block mb-3"
                      style={{ color: modalStep.color }}
                    >
                      {modalStep.tag}
                    </span>
                    <h4 
                      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                      className="text-2xl sm:text-3xl font-normal text-[#0C1F4A] leading-tight"
                    >
                      Turn any bid file into clean structured decisions.
                    </h4>
                  </div>

                  {/* Right specifications column */}
                  <div className="md:col-span-7 space-y-8 font-sans">
                    <div className="border-t border-neutral-100 pt-4">
                      <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 block mb-1">DEFINITION</span>
                      <p className="text-sm text-neutral-800 leading-relaxed font-normal">
                        {modalStep.definition}
                      </p>
                    </div>

                    <div className="border-t border-neutral-100 pt-4">
                      <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 block mb-1">WHO IT'S FOR</span>
                      <p className="text-sm text-neutral-600 leading-relaxed font-normal">
                        {modalStep.whoItIsFor}
                      </p>
                    </div>

                    <div className="border-t border-neutral-100 pt-4">
                      <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 block mb-1">THE PROBLEM IT SOLVES</span>
                      <p className="text-sm text-neutral-600 leading-relaxed font-normal">
                        {modalStep.problemItSolves}
                      </p>
                    </div>
                  </div>

                </div>

                {/* Bottom navigation switcher - showing other features */}
                <div className="border-t border-neutral-100 pt-8">
                  <span className="text-[10px] font-mono font-bold uppercase text-neutral-400 block mb-4">THE AGENTIC DOCUMENT PLATFORM</span>
                  <h4 
                    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                    className="text-2xl font-normal text-[#0C1F4A] mb-6"
                  >
                    Document work starts here
                  </h4>

                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {steps.map((item) => {
                      const isCurrent = item.id === modalStep.id;
                      return (
                        <div 
                          key={item.id} 
                          className={`p-5 rounded-xl border transition-all duration-300 ${
                            isCurrent ? "border-neutral-900 bg-neutral-50 shadow-sm" : "border-neutral-200 hover:border-neutral-300 hover:shadow-sm"
                          }`}
                        >
                          <span className="text-[10px] font-mono text-neutral-400 block mb-2">/{item.id}</span>
                          <h5 className="font-bold text-[#0C1F4A] text-sm mb-1">{item.name}</h5>
                          <p className="text-[10px] text-neutral-500 leading-relaxed mb-4 truncate">
                            {item.label}
                          </p>
                          {isCurrent ? (
                            <span className="text-[10px] font-bold text-neutral-400 block font-mono">You are here</span>
                          ) : (
                            <button
                              onClick={() => setModalStep(item)}
                              className="text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer font-mono hover:underline"
                              style={{ color: item.color }}
                            >
                              <span>Read more</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom CTA block */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-neutral-800">
                    {modalStep.studioCta}
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setModalStep(null)}
                      className="px-4 py-2 bg-neutral-900 text-white rounded text-xs font-bold hover:bg-neutral-800 transition-colors"
                    >
                      Open Studio
                    </button>
                    <button 
                      onClick={() => setModalStep(null)}
                      className="px-4 py-2 border border-neutral-300 text-[#0C1F4A] rounded text-xs font-bold hover:bg-neutral-50 transition-colors"
                    >
                      Request a demo
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
