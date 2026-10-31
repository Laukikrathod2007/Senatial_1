
import { motion } from "framer-motion";
import { ArrowRight, Shield, Award, Clock, Database } from "lucide-react";

interface HeroProps {
  onLaunch?: () => void;
}

export function Hero({ onLaunch }: HeroProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 28 } as any,
    },
  };

  return (
    <section className="relative pt-36 pb-20 overflow-hidden bg-dot-grid border-b border-[#0B1B3D]/8">
      {/* Corner crosshairs */}
      <div className="absolute top-28 left-6 text-[#0B1B3D]/25 font-mono text-xs select-none pointer-events-none">+</div>
      <div className="absolute top-28 right-6 text-[#0B1B3D]/25 font-mono text-xs select-none pointer-events-none">+</div>
      <div className="absolute bottom-6 left-6 text-[#0B1B3D]/25 font-mono text-xs select-none pointer-events-none">+</div>
      <div className="absolute bottom-6 right-6 text-[#0B1B3D]/25 font-mono text-xs select-none pointer-events-none">+</div>

      {/* Subtle warm amber ambient radial highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[360px] bg-gradient-to-b from-[#F59E0B]/10 via-[#EA580C]/5 to-transparent blur-[120px] pointer-events-none -z-0" />

      <div className="max-w-[1440px] mx-auto px-6 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center text-center max-w-5xl mx-auto"
        >
          {/* Top Event Badge */}
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-amber-500/25 bg-white/90 shadow-sm mb-8 text-[11px] font-mono tracking-wide text-[#0B1B3D]"
          >
            <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
            <a 
              href="https://www.techfortomorrow.tech/" 
              target="_blank" 
              rel="noreferrer"
              className="hover:text-[#EA580C] transition-colors flex items-center gap-1 font-medium"
            >
              Tech for Tomorrow 2026 · Pune, Maharashtra · IEEE Computer Society Hackathon
            </a>
          </motion.div>

          {/* Clean, Decongested Editorial Heading */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-[#0B1B3D] leading-[1.15] mb-5 max-w-4xl"
          >
            Make scholarship &amp; welfare decisions{" "}
            <span className="font-serif italic font-medium bg-gradient-to-r from-[#EA580C] via-[#F59E0B] to-[#D97706] bg-clip-text text-transparent block sm:inline">
              easier to question.
            </span>
          </motion.h1>

          {/* Subtitle / Lead Paragraph */}
          <motion.p
            variants={itemVariants}
            className="text-base sm:text-lg text-[#0B1B3D]/75 max-w-2xl leading-relaxed mb-6 font-normal"
          >
            A public-interest workspace for examining automated decisions and organizing human-reviewed next steps across college scholarship teams, NGOs, and community centres.
          </motion.p>

          {/* Compact, Sleek Scope Note Pill */}
          <motion.div
            variants={itemVariants}
            className="w-full max-w-2xl bg-amber-500/10 border border-amber-500/25 rounded-lg px-4 py-2.5 text-xs text-[#0B1B3D]/80 font-mono text-left mb-8 flex items-center gap-3 shadow-sm"
          >
            <span className="px-2 py-0.5 rounded bg-[#EA580C] text-white text-[10px] font-bold uppercase tracking-wider shrink-0">
              SCOPE NOTE
            </span>
            <span className="leading-snug">
              Current demo runs locally with controlled examples and is not connected to MahaDBT, college scholarship systems, or Aaple Sarkar/e-Seva centres.
            </span>
          </motion.div>

          {/* Call to Actions */}
          <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <button
              onClick={onLaunch}
              className="inline-flex items-center gap-3 px-6 py-3.5 bg-gradient-to-r from-[#EA580C] to-[#F59E0B] hover:from-[#C2410C] hover:to-[#EA580C] text-white font-mono uppercase text-xs tracking-wider font-semibold rounded-lg shadow-md shadow-orange-500/20 transition-all group cursor-pointer"
            >
              <span>LAUNCH DEMO</span>
              <span className="w-6 h-6 bg-white/20 rounded flex items-center justify-center text-white transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>

            <a
              href="#how-it-works"
              className="inline-flex items-center px-6 py-3.5 border border-[#0B1B3D]/25 hover:border-[#0B1B3D] hover:bg-white/80 text-[#0B1B3D] font-mono uppercase text-xs tracking-wider font-semibold rounded-lg transition-all"
            >
              EXPLORE THE AUDIT WORKFLOW
            </a>
          </motion.div>

          {/* ── System Walkthrough Video Card (Directly below Hero Actions) ── */}
          <motion.div 
            variants={itemVariants}
            className="w-full max-w-5xl mb-14 text-left"
          >
            <div className="bg-white rounded-3xl border border-[#0B1B3D]/10 p-6 sm:p-8 lg:p-10 shadow-sm">
              <div className="grid lg:grid-cols-12 gap-8 items-center">
                
                {/* Left Column: Announcement Details */}
                <div className="lg:col-span-5 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-[#EA580C] text-[11px] font-mono font-bold tracking-wider uppercase mb-4 w-fit border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] animate-pulse" />
                    <span>What's new · Walkthrough</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-[#0B1B3D] tracking-tight leading-[1.15] mb-3">
                    Introducing: <br />
                    <span className="font-sans font-bold bg-gradient-to-r from-[#EA580C] via-[#F59E0B] to-[#D97706] bg-clip-text text-transparent">
                      SENTINEL Engine
                    </span>
                  </h2>

                  <p className="text-xs sm:text-sm text-[#0B1B3D]/70 font-sans leading-relaxed mb-6">
                    Watch how SENTINEL probes automated scholarship decisions from the outside, uncovers algorithmic bias without internal access, and seals verifiable cryptographic proof packs.
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={onLaunch}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#EA580C] to-[#F59E0B] hover:from-[#C2410C] hover:to-[#EA580C] text-white font-mono uppercase text-[11px] tracking-wider font-bold rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer group"
                    >
                      <span>LAUNCH LIVE DEMO</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </button>

                    <a
                      href="#how-it-works"
                      className="inline-flex items-center justify-center px-4 py-2.5 border border-[#0B1B3D]/20 hover:border-[#0B1B3D] hover:bg-neutral-50 text-[#0B1B3D] font-mono uppercase text-[11px] tracking-wider font-semibold rounded-xl transition-all"
                    >
                      EXPLORE WORKFLOW
                    </a>
                  </div>
                </div>

                {/* Right Column: HTML5 Video Player */}
                <div className="lg:col-span-7">
                  <div className="relative rounded-2xl overflow-hidden bg-[#0B1B3D] border border-[#0B1B3D]/15 shadow-xl aspect-video">
                    <video
                      src="/Demo_sentinel.mp4"
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover rounded-2xl"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-[#0B1B3D]/50 px-1">
                    <span>SENTINEL · End-to-End System Demonstration</span>
                    <span className="text-[#EA580C] font-semibold">Demo_sentinel.mp4</span>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>

          {/* Enriched Audit Telemetry & Benchmark Matrix */}
          <motion.div
            variants={itemVariants}
            className="w-full max-w-5xl border-t border-[#0B1B3D]/10 pt-8"
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#0B1B3D]/70">
                  Audit Telemetry · Controlled Synthetic Benchmark
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#0B1B3D]/40 uppercase tracking-widest hidden sm:inline">
                Zero-Privilege Verification
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Stat 1: Audit Latency */}
              <div className="group relative flex flex-col p-4 bg-white/95 border border-[#0B1B3D]/10 rounded-xl shadow-sm hover:border-[#EA580C]/50 hover:shadow-md transition-all duration-300 text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-[#EA580C] group-hover:scale-105 transition-transform">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded">
                    &lt; 120ms
                  </span>
                </div>
                <div className="font-mono text-xl font-bold text-[#0B1B3D] tracking-tight group-hover:text-[#EA580C] transition-colors">
                  Sub-Second
                </div>
                <div className="text-[11px] font-semibold text-[#0B1B3D]/80 uppercase tracking-wider font-mono mt-0.5">
                  Audit Probe Latency
                </div>
                <p className="text-[11px] text-[#0B1B3D]/60 mt-1.5 leading-snug">
                  Zero-overhead black-box query evaluation without privileged server or database access.
                </p>
                <div className="mt-3 pt-2 border-t border-[#0B1B3D]/5 flex items-center justify-between text-[9px] font-mono text-[#0B1B3D]/40">
                  <span>BASELINE LATENCY</span>
                  <span className="text-[#EA580C] font-semibold">ACTIVE</span>
                </div>
              </div>

              {/* Stat 2: Synthetic Fixtures */}
              <div className="group relative flex flex-col p-4 bg-white/95 border border-[#0B1B3D]/10 rounded-xl shadow-sm hover:border-[#EA580C]/50 hover:shadow-md transition-all duration-300 text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-[#D97706] group-hover:scale-105 transition-transform">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-semibold bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded">
                    FIXTURE MATRIX
                  </span>
                </div>
                <div className="font-mono text-xl font-bold text-[#0B1B3D] tracking-tight group-hover:text-[#EA580C] transition-colors">
                  100 / 101
                </div>
                <div className="text-[11px] font-semibold text-[#0B1B3D]/80 uppercase tracking-wider font-mono mt-0.5">
                  Clean vs. Flawed Rows
                </div>
                <p className="text-[11px] text-[#0B1B3D]/60 mt-1.5 leading-snug">
                  100 clean student profiles vs 1 injected covert gatekeeping anomaly for stress testing.
                </p>
                <div className="mt-3 pt-2 border-t border-[#0B1B3D]/5 flex items-center justify-between text-[9px] font-mono text-[#0B1B3D]/40">
                  <span>SYNTHETIC PROFILES</span>
                  <span className="text-amber-700 font-semibold">100% ISOLATED</span>
                </div>
              </div>

              {/* Stat 3: Anomaly Recall */}
              <div className="group relative flex flex-col p-4 bg-white/95 border border-[#0B1B3D]/10 rounded-xl shadow-sm hover:border-[#EA580C]/50 hover:shadow-md transition-all duration-300 text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-[#EA580C] group-hover:scale-105 transition-transform">
                    <Shield className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-semibold bg-orange-500/10 text-orange-700 border border-orange-500/20 rounded">
                    RECALL: 100%
                  </span>
                </div>
                <div className="font-mono text-xl font-bold text-[#0B1B3D] tracking-tight group-hover:text-[#EA580C] transition-colors">
                  3 / 3 Vectors
                </div>
                <div className="text-[11px] font-semibold text-[#0B1B3D]/80 uppercase tracking-wider font-mono mt-0.5">
                  Criteria Signaled
                </div>
                <p className="text-[11px] text-[#0B1B3D]/60 mt-1.5 leading-snug">
                  Catches income threshold traps, demographic category flips, and quota depletion bugs.
                </p>
                <div className="mt-3 pt-2 border-t border-[#0B1B3D]/5 flex items-center justify-between text-[9px] font-mono text-[#0B1B3D]/40">
                  <span>FLAW CAPTURE</span>
                  <span className="text-emerald-600 font-semibold">3 OF 3 FLAGGED</span>
                </div>
              </div>

              {/* Stat 4: Cryptographic Proof */}
              <div className="group relative flex flex-col p-4 bg-white/95 border border-[#0B1B3D]/10 rounded-xl shadow-sm hover:border-[#EA580C]/50 hover:shadow-md transition-all duration-300 text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-700 group-hover:scale-105 transition-transform">
                    <Award className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 text-[9px] font-mono font-semibold bg-blue-500/10 text-blue-700 border border-blue-500/20 rounded">
                    MERKLE SEAL
                  </span>
                </div>
                <div className="font-mono text-xl font-bold text-[#0B1B3D] tracking-tight group-hover:text-[#EA580C] transition-colors">
                  Ed25519
                </div>
                <div className="text-[11px] font-semibold text-[#0B1B3D]/80 uppercase tracking-wider font-mono mt-0.5">
                  Signature Algo
                </div>
                <p className="text-[11px] text-[#0B1B3D]/60 mt-1.5 leading-snug">
                  SHA-256 Merkle root ledger guarantees reports cannot be altered or backdated for appeals.
                </p>
                <div className="mt-3 pt-2 border-t border-[#0B1B3D]/5 flex items-center justify-between text-[9px] font-mono text-[#0B1B3D]/40">
                  <span>TAMPER PROOF</span>
                  <span className="text-blue-700 font-semibold">LEGAL ADMISSIBLE</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#0B1B3D]/50 font-mono mt-4 text-center">
              * Controlled demonstration results only. They are not findings about MahaDBT, a college, a student, or any live public service.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
