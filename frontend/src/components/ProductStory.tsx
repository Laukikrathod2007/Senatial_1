"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function ProductStory() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const rotateX = useTransform(scrollYProgress, [0, 1], [15, -15]);
  const rotateY = useTransform(scrollYProgress, [0, 1], [-10, 10]);
  const translateY = useTransform(scrollYProgress, [0, 1], [20, -20]);

  const callouts = [
    {
      side: "left",
      icon: "📋",
      title: "Structured Investigation Records",
      body: "Evidence, source context, and technical analysis often become detached. SENTINEL anchors the question, provenance notes, access-state metadata, and reviewer findings in one case workspace.",
    },
    {
      side: "left",
      icon: "🔍",
      title: "Documented Testing & Limits",
      body: "Test results without context risk misinterpretation. SENTINEL displays exact screening criteria, execution status, and explicit methodological limits directly with results.",
    },
    {
      side: "right",
      icon: "🛡️",
      title: "Integrity-Verifiable Ledger",
      body: "Uses canonical JSON serialization, SHA-256 hash chaining, Merkle roots, and Ed25519 cryptographic signatures to help detect if exported report copies have been modified.",
    },
    {
      side: "right",
      icon: "✍️",
      title: "Human Review & Accountable Action",
      body: "Technical observations must lead to responsible action. Reviewers record human interpretations and generate editable inquiry drafts for verification before submission.",
    },
  ];

  const leftCallouts = callouts.filter((c) => c.side === "left");
  const rightCallouts = callouts.filter((c) => c.side === "right");

  return (
    <section
      ref={sectionRef}
      className="relative py-32 bg-white border-b border-neutral-150 overflow-hidden"
    >
      <div className="max-w-[1200px] mx-auto px-6">

        {/* ── Header ── */}
        <div className="text-center mb-24 max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            className="text-4xl sm:text-5xl lg:text-6xl font-normal text-[#0C1F4A] leading-tight tracking-tight mb-6"
          >
            Preserving evidence for accountable review.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-sm sm:text-base text-neutral-500 leading-relaxed"
          >
            Addressing the challenge of fragmented decision inquiries through structured case documentation, transparent test criteria, and tamper-evident reporting.
          </motion.p>
        </div>

        {/* ── Three-column body ── */}
        <div className="grid lg:grid-cols-[1fr_380px_1fr] gap-16 items-center">

          {/* LEFT */}
          <div className="flex flex-col gap-14">
            {leftCallouts.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
              >
                <p className="text-neutral-400 font-mono text-xs mb-1 flex items-center gap-1.5">
                  <span className="text-base leading-none">{c.icon}</span>
                  <span className="font-semibold text-[#0C1F4A] text-xs sm:text-sm">{c.title}</span>
                </p>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed mt-1.5 pl-6">
                  {c.body}
                </p>
              </motion.div>
            ))}
          </div>

          {/* CENTER — Premium 3D Floating Disc with concentrical orbiting scan rings */}
          <motion.div
            style={{ rotateX, rotateY, y: translateY }}
            className="flex flex-col items-center gap-6"
          >
            {/* Disc Container */}
            <div
              className="relative flex items-center justify-center"
              style={{ perspective: "1000px" }}
            >
              {/* Outer soft glowing background radial halo */}
              <div className="absolute inset-0 rounded-full blur-3xl opacity-40 scale-110 pointer-events-none"
                style={{ background: "radial-gradient(circle, #F59E0B 0%, #EA580C 50%, transparent 70%)" }}
              />

              {/* Main disc face */}
              <motion.div
                className="relative rounded-full flex items-center justify-center shadow-2xl border border-white/40 overflow-hidden"
                style={{
                  width: 320,
                  height: 320,
                  background: "radial-gradient(ellipse at 35% 30%, #fffbeb 0%, #fef3c7 45%, #fed7aa 80%, #ffedd5 100%)",
                }}
                animate={{ y: [0, -12, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              >
                {/* Dotted grid halftone texture overlay inside the disc itself */}
                <div 
                  className="absolute inset-0 opacity-[0.07] pointer-events-none"
                  style={{
                    backgroundImage: "radial-gradient(circle, #0B1B3D 2px, transparent 2px)",
                    backgroundSize: "12px 12px",
                  }}
                />

                {/* Concentric Rotating Ring 1 (Outer, Amber-Orange, Clockwise) */}
                <motion.div
                  className="absolute rounded-full border border-dashed border-[#EA580C]/35"
                  style={{ width: 270, height: 270 }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
                />

                {/* Concentric Rotating Ring 2 (Inner, Warm Gold, Counter-Clockwise) */}
                <motion.div
                  className="absolute rounded-full border border-dashed border-[#F59E0B]/45"
                  style={{ width: 210, height: 210 }}
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                />

                {/* Growing Glow Ring expanding from center */}
                <motion.div
                  className="absolute rounded-full border border-[#EA580C]/50"
                  style={{ width: 120, height: 120 }}
                  animate={{
                    scale: [1, 2.2],
                    opacity: [0.6, 0],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 3.5,
                    ease: "easeOut",
                  }}
                />

                {/* High-Contrast Dominant Centered Logo with Natural Floating and Rotation Sway */}
                <motion.div 
                  className="relative z-10 w-44 h-44 flex items-center justify-center pointer-events-none"
                  animate={{
                    y: [0, -12, 0],
                    rotate: [0, -4, 4, 0],
                    scale: [0.96, 1.04, 0.96]
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 4.5,
                    ease: "easeInOut"
                  }}
                >
                  <img
                    src="/logo-icon.png"
                    alt="SENTINEL Shield Logo"
                    className="w-32 h-32 object-contain filter drop-shadow-[0_10px_20px_rgba(12,31,74,0.18)]"
                  />
                </motion.div>
              </motion.div>

              {/* Tilted bottom base shadow */}
              <div
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 rounded-full blur-2xl opacity-25"
                style={{ width: 260, height: 36, background: "#0C1F4A" }}
              />

              {/* Connector dots left */}
              <div className="absolute left-0 top-1/3 w-10 flex items-center gap-1 -translate-x-full pointer-events-none">
                <div className="flex-1 h-px border-t border-dashed border-neutral-300" />
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 flex-shrink-0" />
              </div>
              <div className="absolute left-0 top-2/3 w-10 flex items-center gap-1 -translate-x-full pointer-events-none">
                <div className="flex-1 h-px border-t border-dashed border-neutral-300" />
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 flex-shrink-0" />
              </div>

              {/* Connector dots right */}
              <div className="absolute right-0 top-1/2 w-10 flex items-center gap-1 translate-x-full pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 flex-shrink-0" />
                <div className="flex-1 h-px border-t border-dashed border-neutral-300" />
              </div>
              <div className="absolute right-0 top-3/4 w-10 flex items-center gap-1 translate-x-full pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 flex-shrink-0" />
                <div className="flex-1 h-px border-t border-dashed border-neutral-300" />
              </div>
            </div>

            {/* Stat pill below disc */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-sm text-xs font-mono z-10"
            >
              <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
              <span className="text-[#0B1B3D] font-semibold">Deterministic Execution</span>
              <span className="text-amber-500/40">·</span>
              <span className="text-[#0B1B3D]/70">Ed25519 Cryptographic Signatures</span>
            </motion.div>
          </motion.div>

          {/* RIGHT */}
          <div className="flex flex-col gap-14">
            {rightCallouts.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 + 0.1 }}
              >
                <p className="text-neutral-400 font-mono text-xs mb-1 flex items-center gap-1.5">
                  <span className="text-base leading-none">{c.icon}</span>
                  <span className="font-semibold text-[#0C1F4A] text-xs sm:text-sm">{c.title}</span>
                </p>
                <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed mt-1.5 pl-6">
                  {c.body}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
