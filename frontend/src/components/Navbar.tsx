import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronDown, 
  ArrowRight, 
  GraduationCap, 
  Scale, 
  Store, 
  Building2, 
  Landmark, 
  ShieldCheck, 
  FileText, 
  Layers,
  Sparkles,
  ArrowUpRight
} from "lucide-react";

interface NavbarProps {
  onDocsClick?: () => void;
  onLaunchDemo?: () => void;
}

export function Navbar({ onDocsClick, onLaunchDemo }: NavbarProps) {
  const [openMenu, setOpenMenu] = useState<"sectors" | "capabilities" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleMenu = (menu: "sectors" | "capabilities") => {
    setOpenMenu(prev => (prev === menu ? null : menu));
  };

  const closeMenu = () => setOpenMenu(null);

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-[#FAF9F6]/90 border-b border-[rgba(11,27,61,0.08)] px-6 lg:px-16 py-3.5"
      ref={menuRef}
    >
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        {/* Logo and Wordmark */}
        <a href="#" className="flex items-center gap-3 group" onClick={closeMenu}>
          <img
            src="/logo-icon.png"
            alt="SENTINEL Icon"
            className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <div className="flex flex-col text-left">
            <span className="text-xl font-bold font-sans tracking-tight text-[#0B1B3D] leading-none">
              SENTINEL
            </span>
            <span className="text-[9px] font-mono tracking-widest text-[#EA580C] uppercase mt-0.5 font-bold">
              Public-Interest Audit
            </span>
          </div>
        </a>

        {/* Navigation Links with Reducto-style Clickable Mega-Menu */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-mono tracking-wider font-semibold text-[#0B1B3D]/70">
          <a 
            href="#how-it-works" 
            onClick={closeMenu}
            className="hover:text-[#0B1B3D] transition-colors py-2 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#F59E0B] hover:after:w-full after:transition-all after:duration-300"
          >
            HOW IT WORKS
          </a>

          {/* Sectors / Ecosystem Mega-Menu Button */}
          <button
            onClick={() => toggleMenu("sectors")}
            className={`flex items-center gap-1.5 py-2 transition-colors cursor-pointer relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-[#F59E0B] after:transition-all after:duration-300 ${
              openMenu === "sectors" 
                ? "text-[#0B1B3D] font-bold after:w-full" 
                : "hover:text-[#0B1B3D] after:w-0 hover:after:w-full"
            }`}
          >
            <span>SECTORS</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenu === "sectors" ? "rotate-180 text-[#EA580C]" : ""}`} />
          </button>

          {/* Capabilities Mega-Menu Button */}
          <button
            onClick={() => toggleMenu("capabilities")}
            className={`flex items-center gap-1.5 py-2 transition-colors cursor-pointer relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:bg-[#F59E0B] after:transition-all after:duration-300 ${
              openMenu === "capabilities" 
                ? "text-[#0B1B3D] font-bold after:w-full" 
                : "hover:text-[#0B1B3D] after:w-0 hover:after:w-full"
            }`}
          >
            <span>CAPABILITIES</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openMenu === "capabilities" ? "rotate-180 text-[#EA580C]" : ""}`} />
          </button>

          <a 
            href="#decision-review" 
            onClick={closeMenu}
            className="hover:text-[#0B1B3D] transition-colors py-2 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#F59E0B] hover:after:w-full after:transition-all after:duration-300"
          >
            COHORT REVIEW
          </a>

          <a 
            href="#decision-scanner" 
            onClick={closeMenu}
            className="hover:text-[#0B1B3D] transition-colors py-2 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#F59E0B] hover:after:w-full after:transition-all after:duration-300"
          >
            SCANNER
          </a>

          {onDocsClick && (
            <button 
              onClick={() => { closeMenu(); onDocsClick(); }}
              className="hover:text-[#0B1B3D] text-left transition-colors py-2 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-[#F59E0B] hover:after:w-full after:transition-all after:duration-300 cursor-pointer"
            >
              DOCS
            </button>
          )}
        </nav>

        {/* Call to Actions */}
        <div className="flex items-center gap-3">
          <a
            href="#how-it-works"
            onClick={closeMenu}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 border border-[#0B1B3D]/30 hover:bg-[#0B1B3D] hover:text-white text-xs font-mono font-bold tracking-wider uppercase transition-all duration-300 rounded"
          >
            WORKFLOW
          </a>
          <button
            onClick={() => { closeMenu(); onLaunchDemo?.(); }}
            className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-[#F59E0B] via-[#EA580C] to-[#D97706] text-white hover:brightness-105 shadow-sm shadow-amber-500/25 text-xs font-mono font-bold tracking-wider uppercase transition-all duration-300 rounded cursor-pointer"
          >
            LAUNCH DEMO →
          </button>
        </div>
      </div>

      {/* ── Reducto-Style Mega-Menu Dropdown Panel ── */}
      <AnimatePresence>
        {openMenu === "sectors" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-6 right-6 lg:left-16 lg:right-16 top-full mt-2 bg-white rounded-2xl border border-neutral-200/80 shadow-2xl p-6 lg:p-8 overflow-hidden z-50 max-w-[1200px] mx-auto"
          >
            <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-bold mb-6 pb-2 border-b border-neutral-100 flex items-center justify-between">
              <span>Sectors & Deployment Context</span>
              <span className="text-amber-600 font-normal">Maharashtra Public-Interest Ecosystem</span>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-center">
              {/* Left 6-card grid matching the screenshot layout */}
              <div className="lg:col-span-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. All Sectors */}
                <a href="#use-cases" onClick={closeMenu} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-[#EA580C] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#EA580C] group-hover:text-white transition-all">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-sans font-bold text-xs text-[#0B1B3D] group-hover:text-[#EA580C] transition-colors">
                      All Sectors
                    </h5>
                    <p className="text-[11px] text-neutral-500 leading-snug mt-0.5 font-sans">
                      Explore document workflows across public-interest settings.
                    </p>
                  </div>
                </a>

                {/* 2. College Desks */}
                <a href="#use-cases" onClick={closeMenu} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-sans font-bold text-xs text-[#0B1B3D] group-hover:text-blue-600 transition-colors">
                      College Help Desks
                    </h5>
                    <p className="text-[11px] text-neutral-500 leading-snug mt-0.5 font-sans">
                      Help students record stall notices and prepare inquiry drafts.
                    </p>
                  </div>
                </a>

                {/* 3. Community NGOs */}
                <a href="#use-cases" onClick={closeMenu} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-sans font-bold text-xs text-[#0B1B3D] group-hover:text-emerald-600 transition-colors">
                      Community NGOs
                    </h5>
                    <p className="text-[11px] text-neutral-500 leading-snug mt-0.5 font-sans">
                      Organize recurring concerns and inspect test limitations.
                    </p>
                  </div>
                </a>

                {/* 4. Assisted-Service Points */}
                <a href="#use-cases" onClick={closeMenu} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-sans font-bold text-xs text-[#0B1B3D] group-hover:text-purple-600 transition-colors">
                      Aaple Sarkar / e-Seva
                    </h5>
                    <p className="text-[11px] text-neutral-500 leading-snug mt-0.5 font-sans">
                      Assisted navigation points with strict privacy boundaries.
                    </p>
                  </div>
                </a>

                {/* 5. MahaDBT Context */}
                <a href="#use-cases" onClick={closeMenu} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-sans font-bold text-xs text-[#0B1B3D] group-hover:text-orange-600 transition-colors">
                      MahaDBT Context
                    </h5>
                    <p className="text-[11px] text-neutral-500 leading-snug mt-0.5 font-sans">
                      Target scholarship scheme context and state workflow models.
                    </p>
                  </div>
                </a>

                {/* 6. Audit & Vigilance */}
                <a href="#use-cases" onClick={closeMenu} className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-neutral-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-slate-500/10 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-slate-700 group-hover:text-white transition-all">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-sans font-bold text-xs text-[#0B1B3D] group-hover:text-slate-700 transition-colors">
                      Audit & Research
                    </h5>
                    <p className="text-[11px] text-neutral-500 leading-snug mt-0.5 font-sans">
                      Independent screening analysis with zero real-data exposure.
                    </p>
                  </div>
                </a>

              </div>

              {/* Right Side Isometric Card matching the Reducto graphic */}
              <div className="lg:col-span-4 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-amber-600/10 border border-amber-500/20 rounded-xl p-5 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded">
                      Demo Fixtures
                    </span>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>

                  {/* Isometric Stack Graphic */}
                  <div className="relative py-4 flex items-center justify-center">
                    <div className="relative w-44 h-24">
                      {/* Layer 3 (bottom) */}
                      <div className="absolute inset-x-2 bottom-0 h-16 bg-white border border-neutral-300 rounded-lg shadow-sm transform -rotate-3 skew-x-6 opacity-70" />
                      {/* Layer 2 (middle) */}
                      <div className="absolute inset-x-1 bottom-2 h-16 bg-white border border-amber-300/80 rounded-lg shadow-md transform rotate-1 skew-x-3 opacity-90" />
                      {/* Layer 1 (top) */}
                      <div className="absolute inset-x-0 bottom-4 h-16 bg-white border-2 border-amber-500 rounded-lg shadow-lg transform -rotate-1 p-2 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] font-bold text-[#0B1B3D]">100/101 Rows</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        <div className="space-y-1">
                          <div className="h-1.5 bg-neutral-200 rounded w-3/4" />
                          <div className="h-1 bg-amber-400 rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <h5 className="font-sans font-bold text-xs text-[#0B1B3D] mt-2">
                    Controlled Fixture Runner
                  </h5>
                  <p className="text-[11px] text-neutral-600 leading-relaxed mt-1 font-sans">
                    Test decision behavior safely without handling real or confidential student records.
                  </p>
                </div>

                <button
                  onClick={() => { closeMenu(); onLaunchDemo?.(); }}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#EA580C] hover:text-[#C2410C] group cursor-pointer"
                >
                  <span>Launch Decision Scanner</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Capabilities Dropdown Panel ── */}
        {openMenu === "capabilities" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-6 right-6 lg:left-16 lg:right-16 top-full mt-2 bg-white rounded-2xl border border-neutral-200/80 shadow-2xl p-6 lg:p-8 overflow-hidden z-50 max-w-[1200px] mx-auto"
          >
            <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 font-bold mb-6 pb-2 border-b border-neutral-100 flex items-center justify-between">
              <span>Auditing & Verification Capabilities</span>
              <span className="text-amber-600 font-normal">Evidence Preservation Architecture</span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <a href="#features" onClick={closeMenu} className="group p-3 rounded-xl hover:bg-neutral-50 transition-colors border border-neutral-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 font-bold block mb-1">01 · Prototype</span>
                <h5 className="font-sans font-bold text-xs text-[#0B1B3D] group-hover:text-amber-600 transition-colors">
                  Audit Case Workspace
                </h5>
                <p className="text-[11px] text-neutral-500 leading-snug mt-1">
                  Records question, source, provenance note, and access-state metadata in one place.
                </p>
              </a>

              <a href="#features" onClick={closeMenu} className="group p-3 rounded-xl hover:bg-neutral-50 transition-colors border border-neutral-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-blue-600 font-bold block mb-1">02 · Local Demo</span>
                <h5 className="font-sans font-bold text-xs text-[#0B1B3D] group-hover:text-blue-600 transition-colors">
                  Membership-Inference
                </h5>
                <p className="text-[11px] text-neutral-500 leading-snug mt-1">
                  LiRA and shadow-model analysis against local target to screen for membership signals.
                </p>
              </a>

              <a href="#features" onClick={closeMenu} className="group p-3 rounded-xl hover:bg-neutral-50 transition-colors border border-neutral-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 font-bold block mb-1">03 · Local Demo</span>
                <h5 className="font-sans font-bold text-xs text-[#0B1B3D] group-hover:text-purple-600 transition-colors">
                  Reason-Consistency Testing
                </h5>
                <p className="text-[11px] text-neutral-500 leading-snug mt-1">
                  Perturb synthetic explanation features to measure decision model responses.
                </p>
              </a>

              <a href="#features" onClick={closeMenu} className="group p-3 rounded-xl hover:bg-neutral-50 transition-colors border border-neutral-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 font-bold block mb-1">04 · Local Demo</span>
                <h5 className="font-sans font-bold text-xs text-[#0B1B3D] group-hover:text-amber-600 transition-colors">
                  Cohort Stress Testing
                </h5>
                <p className="text-[11px] text-neutral-500 leading-snug mt-1">
                  Compare demographic cohorts to baseline distributions to identify outcome gaps.
                </p>
              </a>

              <a href="#features" onClick={closeMenu} className="group p-3 rounded-xl hover:bg-neutral-50 transition-colors border border-neutral-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 font-bold block mb-1">05 · Prototype</span>
                <h5 className="font-sans font-bold text-xs text-[#0B1B3D] group-hover:text-emerald-600 transition-colors">
                  Signed Report Ledger
                </h5>
                <p className="text-[11px] text-neutral-500 leading-snug mt-1">
                  Canonical JSON, SHA-256 Merkle roots, and Ed25519 signatures detect tampering.
                </p>
              </a>

              <a href="#features" onClick={closeMenu} className="group p-3 rounded-xl hover:bg-neutral-50 transition-colors border border-neutral-100">
                <span className="text-[10px] font-mono uppercase tracking-wider text-rose-600 font-bold block mb-1">06 · Prototype</span>
                <h5 className="font-sans font-bold text-xs text-[#0B1B3D] group-hover:text-rose-600 transition-colors">
                  Human Follow-Up Drafts
                </h5>
                <p className="text-[11px] text-neutral-500 leading-snug mt-1">
                  Reviewer notes and editable RTI / grievance inquiry drafts for human verification.
                </p>
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
