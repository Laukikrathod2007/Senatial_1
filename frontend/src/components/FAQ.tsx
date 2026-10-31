"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: "Can SENTINEL check a student's MahaDBT application?",
      answer: "Not currently. MahaDBT is relevant to the Maharashtra public-interest use case, but SENTINEL is an independent prototype and is not connected to the portal and does not inspect live applications.",
    },
    {
      question: "Can a college, NGO, or e-Seva operator enter a student's personal records?",
      answer: "They should not use real or confidential records in the current demo. The case workspace stores notes and provenance metadata; it is not a secure evidence repository.",
    },
    {
      question: "What does a valid report signature mean?",
      answer: "It helps check whether report contents changed relative to the configured signing key (using canonical JSON serialization, SHA-256 Merkle roots, and Ed25519 signatures). It does not prove that the report is correct, that an external service was tested, or that an independent authority endorsed it.",
    },
    {
      question: "Does SENTINEL decide whether a scholarship was wrongly denied or file an appeal?",
      answer: "No. It does not decide eligibility, make legal findings, or file an appeal. It can support a structured review and produce an editable draft for a person to check, verify, and send.",
    },
  ];

  return (
    <section id="faq" className="py-24 bg-white border-b border-neutral-200">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-16">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Title and CTA button */}
          <div className="lg:col-span-4 lg:sticky lg:top-28">
            <h2 
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              className="text-4xl sm:text-5xl font-normal text-[#0C1F4A] leading-tight tracking-tight mb-8"
            >
              Questions,<br />answered.
            </h2>
            <a
              href="#decision-scanner"
              className="inline-flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-[#EA580C] to-[#F59E0B] hover:from-[#C2410C] hover:to-[#EA580C] text-white font-mono text-xs font-bold tracking-wider uppercase transition-all duration-300 rounded-lg shadow-sm"
            >
              Launch Demo →
            </a>
          </div>

          {/* Right Column: Expanding Accordion List */}
          <div className="lg:col-span-8 divide-y divide-neutral-200 border-t border-neutral-200">
            {faqs.map((faq, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div key={idx} className="py-6 first:pt-4 last:pb-4">
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left group gap-4"
                  >
                    <span className="text-base sm:text-lg font-medium text-[#0B1B3D] group-hover:text-[#EA580C] transition-colors duration-200">
                      {faq.question}
                    </span>
                    <div className="w-8 h-8 rounded border border-neutral-300 flex items-center justify-center text-neutral-500 bg-neutral-50 flex-shrink-0">
                      {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed mt-4 max-w-2xl">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
