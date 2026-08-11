import { useState, useEffect, useRef } from "react";
import {
  api, ApiError, setToken,
  type LoginResponse, type Role
} from "./api/client";
import { AuditorConsole }  from "./pages/AuditorConsole";
import { CitizenPortal }   from "./pages/CitizenPortal";
import { VerifyReport }    from "./pages/VerifyReport";
import {
  Activity, Scale, ShieldCheck, KeyRound, ShieldAlert, Server,
  LogOut, LogIn, QrCode, Info, Shield, ArrowDown, Settings,
  Newspaper, Building2, UserCheck, ChevronRight, Check,
  Lock, GitMerge, BarChart3, FileSearch, Zap, ArrowRight
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────── */
type Tab = "citizen" | "auditor" | "verify";

const TABS: { id: Tab; label: string; needsAuth: boolean; icon: React.ReactNode }[] = [
  { id: "citizen",  label: "Check a decision", needsAuth: true,  icon: <ShieldCheck className="w-4 h-4" /> },
  { id: "auditor",  label: "Auditor console",  needsAuth: true,  icon: <Scale className="w-4 h-4" /> },
  { id: "verify",   label: "Verify a report",  needsAuth: false, icon: <QrCode className="w-4 h-4" /> },
];

const ROLES: { id: Role; label: string; desc: string }[] = [
  { id: "citizen",          label: "Citizen",                  desc: "Check individual data leaks & rejection reasons." },
  { id: "journalist",       label: "Journalist / RTI Activist", desc: "Run structured audits with query allowances." },
  { id: "certified_auditor",label: "Certified Auditor",        desc: "Run vulnerability scans & full fairness audits." },
  { id: "gov_self_audit",   label: "Government Self-Audit",    desc: "Full access for pre-launch safety checking." },
];

/* ─── Animated counter hook ──────────────────────────────────────── */
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return value;
}

/* ─── Intersection Observer hook ────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── Main App ───────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState<Tab>("citizen");
  const [session, setSession] = useState<LoginResponse | null>(null);
  const sandboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "verify") {
      setTab("verify");
      setTimeout(() => sandboxRef.current?.scrollIntoView({ behavior: "smooth" }), 500);
    }
  }, []);

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setTimeout(() => sandboxRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const active = TABS.find((e) => e.id === tab)!;

  return (
    <div className="min-h-screen bg-paper text-ink font-sans">

      {/* 1 — HERO */}
      <HeroBanner
        onLaunch={() => sandboxRef.current?.scrollIntoView({ behavior: "smooth" })}
        onVerify={() => handleTabChange("verify")}
      />

      {/* 2 — TRUST STRIP */}
      <TrustStrip />

      {/* 3 — PERSONA SELECTOR (who is this for?) */}
      <PersonaSection onLaunch={() => sandboxRef.current?.scrollIntoView({ behavior: "smooth" })} />

      {/* 4 — HOW IT WORKS (workflow diagram) */}
      <WorkflowSection />

      {/* 5 — FEATURE GRID */}
      <FeatureGrid />

      {/* 6 — LIVE SANDBOX CONSOLE */}
      <div ref={sandboxRef} className="border-t border-rule bg-white py-16 scroll-mt-4" id="sandbox">
        <div className="mx-auto max-w-5xl px-5 space-y-8">
          <div className="flex flex-wrap items-center justify-between border-b border-rule pb-5 gap-4">
            <div>
              <span className="text-[0.68rem] font-bold text-brand-gold uppercase tracking-[0.18em]">
                Interactive Sandbox
              </span>
              <h2 className="text-2xl font-serif font-extrabold text-accent mt-0.5">
                Auditor Sandbox Console
              </h2>
              <p className="text-xs text-muted mt-1 max-w-md">
                Live cryptographic audit engine running on a synthetic welfare dataset. All results are signed, verifiable, and exportable.
              </p>
            </div>
            <nav className="flex gap-1 bg-paper-sunk p-1 rounded-xl border border-rule">
              {TABS.map((entry) => {
                const sel = tab === entry.id;
                return (
                  <button
                    key={entry.id}
                    onClick={() => handleTabChange(entry.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold transition-all rounded-lg cursor-pointer ${
                      sel ? "bg-white text-brand-gold shadow-sm border border-rule/40" : "text-muted hover:text-ink"
                    }`}
                  >
                    {entry.icon}
                    <span className="hidden sm:inline">{entry.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <main className="space-y-6">
            <SessionBar session={session} onSession={setSession} />
            {active.needsAuth && !session ? (
              <div className="sheet rounded-2xl space-y-4">
                <h2 className="text-lg font-serif font-bold flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-brand-gold" />
                  Sign in to probe the AI system
                </h2>
                <p className="text-sm text-muted max-w-2xl leading-relaxed">
                  Auditing registers queries against the differential privacy budget. Select a credential role and sign in to begin probing.
                </p>
                <div className="p-3 bg-brand-gold-soft border border-brand-gold/15 rounded-xl text-xs text-muted flex gap-2.5">
                  <Info className="w-4 h-4 text-brand-gold flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    No account needed to verify sealed reports.{" "}
                    <button className="text-brand-gold underline font-bold hover:text-ink" onClick={() => handleTabChange("verify")}>
                      Verify a report →
                    </button>
                  </p>
                </div>
              </div>
            ) : tab === "citizen" ? (
              <CitizenPortal />
            ) : tab === "auditor" ? (
              <AuditorConsole />
            ) : (
              <VerifyReport />
            )}
          </main>
        </div>
      </div>

      {/* 7 — FOOTER */}
      <SiteFooter />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HERO BANNER
══════════════════════════════════════════════════════════════════ */
function HeroBanner({ onLaunch, onVerify }: { onLaunch: () => void; onVerify: () => void }) {
  const [typed, setTyped] = useState("");
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  const fullText = "Independent Algorithmic Trust\nLayer for Public-Sector AI";

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTyped(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(interval);
    }, 28);
    return () => clearInterval(interval);
  }, []);

  // Trigger stat counters when visible
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.3 });
    if (statsRef.current) obs.observe(statsRef.current);
    return () => obs.disconnect();
  }, []);

  const count1 = useCountUp(5891,  1600, statsVisible);
  const count2 = useCountUp(100,   1200, statsVisible);
  const count3 = useCountUp(448,   1400, statsVisible);
  const count4 = useCountUp(5,     1000, statsVisible);

  return (
    <section className="relative bg-accent text-white overflow-hidden border-t-4 border-brand-gold">
      {/* Grid overlay */}
      <div className="absolute inset-0 hero-grid pointer-events-none" />
      {/* Glow blobs */}
      <div className="absolute -right-32 top-0 w-[500px] h-[500px] rounded-full bg-brand-gold/4 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 bottom-0 w-80 h-80 rounded-full bg-blue-900/20 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-5xl px-5 py-5 md:py-8">

        {/* Nav bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-10">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Activity className="text-brand-gold w-7 h-7" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-gold rounded-full live-dot" />
            </div>
            <span className="font-serif text-xl font-extrabold tracking-tight">SENTINEL</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-[0.62rem] font-bold uppercase tracking-wider text-brand-gold bg-white/5 border border-brand-gold/25 px-3 py-1.5 rounded-lg">
              IEEE Tech for Tomorrow 2026 · TIPPSS
            </span>
            <button onClick={onVerify} className="text-[0.7rem] font-bold text-slate-300 hover:text-white border border-white/15 px-3 py-1.5 rounded-lg transition-all hover:border-white/30 cursor-pointer">
              Verify Report →
            </button>
          </div>
        </div>

        {/* Hero content */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            {/* Badge */}
            <span className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.2em] bg-brand-gold/10 border border-brand-gold/25 text-brand-gold px-3 py-1.5 rounded-full anim-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
              Live Audit System · Hackathon Demo
            </span>

            {/* Typewriter headline */}
            <h1 className="text-3xl md:text-4xl font-serif font-extrabold leading-tight whitespace-pre-line">
              {typed}
              <span className="inline-block w-0.5 h-8 bg-brand-gold ml-1 align-middle" style={{ animation: "typing-cursor 0.8s step-end infinite" }} />
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed max-w-md anim-fade-up delay-400">
              SENTINEL acts as an <strong className="text-white">outside auditor</strong> — verifying privacy leaks, explanation consistency, and subgroup fairness without ever touching backend model weights. Results are <strong className="text-white">cryptographically sealed</strong> and publicly verifiable.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 anim-fade-up delay-500">
              <button onClick={onLaunch} className="btn-gold rounded-xl shadow-xl flex items-center gap-2 cursor-pointer px-6 py-3 text-sm">
                Launch Audit Sandbox
                <ArrowDown className="w-4 h-4 animate-bounce" />
              </button>
              <button onClick={onVerify} className="btn-quiet bg-white/5 text-slate-200 border-white/20 hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer px-6 py-3 text-sm">
                <QrCode className="w-4 h-4 text-brand-gold" />
                Scan & Verify
              </button>
            </div>

            {/* Inline trust cues */}
            <div className="flex flex-wrap gap-4 text-[0.7rem] text-slate-400 font-semibold anim-fade-up delay-600">
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-gold" />India DPDP Act 2023</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-gold" />IEEE Std 7003-2024</span>
              <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-brand-gold" />Ed25519 Signed Reports</span>
            </div>
          </div>

          {/* Right: live mini-dashboard card */}
          <div className="anim-float hidden md:block">
            <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-5 space-y-3 anim-glow">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Audit Status</span>
                <span className="flex items-center gap-1.5 text-[0.65rem] font-bold text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-full border border-brand-gold/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                  ACTIVE
                </span>
              </div>
              {[
                { label: "Privacy Leakage Z-Score", value: "z = 7.73", color: "text-red-400", bar: 95 },
                { label: "DP Budget Consumed (ε)", value: "ε = 10.3", color: "text-brand-gold", bar: 68 },
                { label: "Fairness Disparity Gap", value: "44.8%",    color: "text-orange-400", bar: 45 },
                { label: "Chain Integrity",         value: "✓ 100%",   color: "text-green-400", bar: 100 },
              ].map((row) => (
                <div key={row.label} className="space-y-1">
                  <div className="flex items-center justify-between text-[0.7rem]">
                    <span className="text-slate-400">{row.label}</span>
                    <span className={`font-mono font-bold ${row.color}`}>{row.value}</span>
                  </div>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${row.bar}%`, background: row.bar > 80 ? "#ef4444" : row.bar > 60 ? "#c59b27" : "#22c55e" }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-white/10 text-[0.65rem] text-slate-500 font-mono">
                Last sealed block: <span className="text-slate-300">ed25519 · sha-256 · seq #2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats counter row */}
        <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 pt-8 border-t border-white/10">
          {[
            { label: "Shadow Queries Probed",   value: count1,            suffix: "",  prefix: "" },
            { label: "Merkle Chain Integrity",   value: count2,            suffix: "%", prefix: "" },
            { label: "Subgroup Disparity Gap",   value: (count3 / 10).toFixed(1), suffix: "%", prefix: "" },
            { label: "Audit Modules Active",     value: count4,            suffix: "",  prefix: "M" },
          ].map((s) => (
            <div key={s.label} className="stat-card">
              <div className="text-[1.9rem] font-mono font-extrabold shimmer-text">
                {s.prefix}{s.value}{s.suffix}
              </div>
              <div className="text-[0.65rem] text-slate-400 font-semibold uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   TRUST STRIP
══════════════════════════════════════════════════════════════════ */
function TrustStrip() {
  const items = [
    "India DPDP Act 2023", "IEEE Std 7003-2024", "TIPPSS Framework",
    "Ed25519 Cryptographic Signing", "Rényi Differential Privacy", "MeitY Sandbox Aligned",
  ];
  return (
    <div className="bg-accent-soft border-b border-rule py-3 overflow-hidden">
      <div className="flex animate-[marquee_25s_linear_infinite] gap-12 whitespace-nowrap w-max">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="flex items-center gap-2 text-[0.72rem] font-bold text-muted uppercase tracking-widest">
            <span className="w-1 h-1 rounded-full bg-brand-gold" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PERSONA SECTION — "Who is this for?"
══════════════════════════════════════════════════════════════════ */
const PERSONAS = [
  {
    id: "citizen",
    icon: <UserCheck className="w-6 h-6" />,
    title: "Citizen",
    subtitle: "Was my welfare application rejected unfairly?",
    points: [
      "See why the AI rejected or approved you",
      "Test if changing your stated profession flips the outcome",
      "Download a sealed RTI complaint PDF",
      "Get a cryptographically signed compliance certificate",
    ],
    tab: "citizen" as Tab,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    id: "journalist",
    icon: <Newspaper className="w-6 h-6" />,
    title: "Journalist / RTI Activist",
    subtitle: "Is this government AI system discriminating?",
    points: [
      "Run structured fairness audits across vulnerable groups",
      "Monitor the differential privacy budget draining in real-time",
      "Detect if the model memorises individual applicant data",
      "Export signed evidence for RTI filings or media reports",
    ],
    tab: "auditor" as Tab,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    id: "auditor",
    icon: <Scale className="w-6 h-6" />,
    title: "Certified Auditor",
    subtitle: "Does this AI meet IEEE 7003 fairness standards?",
    points: [
      "Run the full LiRA shadow-model membership inference test",
      "Sweep all subgroup combinations for disparity gaps",
      "Walk the Merkle chain and verify cryptographic integrity",
      "Simulate a 1-byte database tamper and watch verification fail",
    ],
    tab: "auditor" as Tab,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    id: "gov",
    icon: <Building2 className="w-6 h-6" />,
    title: "Government Body",
    subtitle: "Is our AI safe to deploy at scale?",
    points: [
      "Pre-launch safety audit before public rollout",
      "Full epsilon accounting for DPDP Act compliance",
      "Immutable cryptographic audit trail for accountability",
      "Ongoing monitoring with automatic chain breach alerts",
    ],
    tab: "auditor" as Tab,
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

function PersonaSection({ onLaunch }: { onLaunch: () => void }) {
  const [active, setActive] = useState(0);
  const { ref, inView } = useInView();
  const p = PERSONAS[active];

  return (
    <section ref={ref} className="py-16 mx-auto max-w-5xl px-5">
      <div className={`text-center space-y-2 mb-10 ${inView ? "anim-fade-up" : "opacity-0"}`}>
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-brand-gold bg-brand-gold-soft border border-brand-gold/15 px-3 py-1 rounded-full">
          Built for everyone in the accountability chain
        </span>
        <h2 className="text-2xl md:text-3xl font-serif font-extrabold text-accent">
          Who uses SENTINEL?
        </h2>
        <p className="text-sm text-muted max-w-xl mx-auto">
          Select your role to see exactly how SENTINEL empowers you.
        </p>
      </div>

      {/* Persona tab buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {PERSONAS.map((persona, i) => (
          <button
            key={persona.id}
            onClick={() => setActive(i)}
            className={`persona-card text-left ${active === i ? "active" : ""} ${inView ? `anim-fade-up delay-${(i + 1) * 100}` : "opacity-0"}`}
          >
            <div className={`${persona.bg} ${persona.color} p-2.5 rounded-xl w-fit mb-3`}>
              {persona.icon}
            </div>
            <div className="font-serif font-bold text-sm text-accent">{persona.title}</div>
            <div className="text-[0.7rem] text-muted mt-0.5 leading-snug">{persona.subtitle}</div>
          </button>
        ))}
      </div>

      {/* Active persona detail card */}
      <div className={`bg-white border border-rule rounded-2xl p-6 shadow-sm ${inView ? "anim-fade-up delay-400" : "opacity-0"}`}>
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="space-y-4">
            <div className={`${p.bg} ${p.color} p-3 rounded-xl w-fit`}>{p.icon}</div>
            <h3 className="text-xl font-serif font-extrabold text-accent">{p.title}</h3>
            <p className="text-sm text-muted italic">"{p.subtitle}"</p>
            <ul className="space-y-2.5">
              {p.points.map((point, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ink-soft">
                  <Check className="w-4 h-4 text-brand-gold mt-0.5 flex-shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-paper-sunk border border-rule rounded-xl p-5 space-y-3">
            <div className="text-xs font-bold text-muted uppercase tracking-wider mb-4">Your workflow in SENTINEL</div>
            {["Sign in with your role", "Run the audit probe", "Get sealed results", "Export / verify / file RTI"].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-gold text-white text-[0.65rem] font-extrabold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-ink-soft">{step}</span>
                {i < 3 && <ChevronRight className="w-3.5 h-3.5 text-muted ml-auto" />}
              </div>
            ))}
            <button
              onClick={onLaunch}
              className="btn-gold w-full mt-4 rounded-xl justify-center cursor-pointer"
            >
              Start as {p.title} →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   WORKFLOW SECTION — How SENTINEL Works
══════════════════════════════════════════════════════════════════ */
const WORKFLOW_STEPS = [
  {
    num: "01",
    icon: <FileSearch className="w-6 h-6" />,
    title: "You query the black-box AI",
    desc: "SENTINEL sends crafted probes to the target model's prediction endpoint — exactly as a real user would. No backend access needed.",
    detail: "Uses shadow model ensemble (LiRA) to calibrate baseline confidence scores for 5,891+ synthetic members vs. non-members.",
    color: "bg-blue-50 text-blue-600",
    borderColor: "border-blue-200",
  },
  {
    num: "02",
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Algorithms detect the anomalies",
    desc: "Five independent audit modules run simultaneously — checking privacy leakage, explanation consistency, subgroup disparities, and budget consumption.",
    detail: "Modules M1–M5: LiRA z-scores, Wachter counterfactuals, Rényi DP composition, IEEE 7003 fairness sweeps, and quota enforcement.",
    color: "bg-amber-50 text-amber-600",
    borderColor: "border-amber-200",
  },
  {
    num: "03",
    icon: <GitMerge className="w-6 h-6" />,
    title: "Results are chained & signed",
    desc: "Every audit finding is appended to a Merkle chain, signed with Ed25519 private keys, and position-bound to prevent deletion or splicing.",
    detail: "SHA-256 hash of (payload + previous_hash + sequence_index) ensures any tampering is immediately detectable across the full chain.",
    color: "bg-purple-50 text-purple-600",
    borderColor: "border-purple-200",
  },
  {
    num: "04",
    icon: <Lock className="w-6 h-6" />,
    title: "Sealed certificates issued",
    desc: "Citizens receive downloadable compliance certificates and pre-filled RTI request PDFs. Auditors receive full audit reports with QR codes.",
    detail: "Scanning the QR code routes directly to the Verify tab, auto-loading the chain and validating the seal — no login required.",
    color: "bg-green-50 text-green-600",
    borderColor: "border-green-200",
  },
];

function WorkflowSection() {
  const [activeStep, setActiveStep] = useState(0);
  const { ref, inView } = useInView(0.1);

  // Auto-advance steps
  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setActiveStep((s) => (s + 1) % WORKFLOW_STEPS.length), 3500);
    return () => clearInterval(t);
  }, [inView]);

  const step = WORKFLOW_STEPS[activeStep];

  return (
    <section ref={ref} className="py-16 bg-accent text-white relative overflow-hidden">
      <div className="absolute inset-0 hero-grid pointer-events-none opacity-50" />

      <div className="relative mx-auto max-w-5xl px-5">
        <div className={`text-center space-y-2 mb-12 ${inView ? "anim-fade-up" : "opacity-0"}`}>
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-brand-gold bg-white/5 border border-brand-gold/20 px-3 py-1 rounded-full">
            System Architecture
          </span>
          <h2 className="text-2xl md:text-3xl font-serif font-extrabold text-white">
            How SENTINEL works
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            A four-stage pipeline that audits any AI model from the outside — no white-box access, no code inspection.
          </p>
        </div>

        {/* Step selector row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {WORKFLOW_STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={`text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                activeStep === i
                  ? "bg-brand-gold border-brand-gold text-white shadow-lg scale-[1.02]"
                  : "bg-white/5 border-white/10 text-slate-400 hover:border-brand-gold/30 hover:text-white"
              }`}
            >
              <div className="font-mono text-2xl font-extrabold mb-1 opacity-60">{s.num}</div>
              <div className="text-xs font-bold leading-snug">{s.title}</div>
            </button>
          ))}
        </div>

        {/* Active step detail */}
        <div className={`bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 ${inView ? "anim-fade-up delay-300" : "opacity-0"}`}>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className={`${step.color} p-3 rounded-xl w-fit`}>{step.icon}</div>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-mono font-extrabold text-brand-gold/30">{step.num}</span>
                <h3 className="text-xl font-serif font-extrabold text-white">{step.title}</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{step.desc}</p>
              <p className="text-xs text-slate-400 leading-relaxed border-l-2 border-brand-gold/40 pl-4 italic">{step.detail}</p>
            </div>

            {/* Visual flow diagram */}
            <div className="hidden md:block">
              <svg viewBox="0 0 300 200" className="w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Nodes */}
                {[
                  { x: 40,  y: 100, label: "Target AI",     sub: "predict_proba" },
                  { x: 150, y: 50,  label: "Audit Engine",  sub: "5 modules" },
                  { x: 150, y: 150, label: "DP Budget",      sub: "ε accountant" },
                  { x: 260, y: 100, label: "Signed Report",  sub: "Ed25519" },
                ].map((node, i) => (
                  <g key={i}>
                    <rect x={node.x - 38} y={node.y - 18} width="76" height="36" rx="8"
                      fill={i === activeStep ? "#c59b27" : "rgba(255,255,255,0.07)"}
                      stroke={i === activeStep ? "#c59b27" : "rgba(255,255,255,0.12)"}
                      strokeWidth="1"
                    />
                    <text x={node.x} y={node.y - 4} textAnchor="middle" fill="white" fontSize="7" fontWeight="700">
                      {node.label}
                    </text>
                    <text x={node.x} y={node.y + 7} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="6">
                      {node.sub}
                    </text>
                  </g>
                ))}
                {/* Arrows */}
                <line x1="78" y1="90" x2="112" y2="62" stroke="rgba(197,155,39,0.4)" strokeWidth="1.5" markerEnd="url(#arr)" />
                <line x1="78" y1="110" x2="112" y2="140" stroke="rgba(197,155,39,0.4)" strokeWidth="1.5" />
                <line x1="188" y1="62" x2="222" y2="90" stroke="rgba(197,155,39,0.4)" strokeWidth="1.5" />
                <line x1="188" y1="140" x2="222" y2="110" stroke="rgba(197,155,39,0.4)" strokeWidth="1.5" />
                {/* Flow dot */}
                <circle r="4" fill="#c59b27">
                  <animateMotion dur="2s" repeatCount="indefinite" path="M78,90 L112,62 L188,62 L222,90" />
                </circle>
                <defs>
                  <marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="rgba(197,155,39,0.5)" />
                  </marker>
                </defs>
              </svg>
            </div>
          </div>

          {/* Step navigation dots */}
          <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-white/10">
            {WORKFLOW_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`rounded-full transition-all duration-300 cursor-pointer ${
                  activeStep === i ? "w-6 h-2 bg-brand-gold" : "w-2 h-2 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FEATURE GRID
══════════════════════════════════════════════════════════════════ */
const FEATURES = [
  { icon: <Shield className="w-5 h-5" />,   title: "Privacy Compliance (M1)", desc: "Runs Carlini's LiRA shadow-model tests to detect training data leakage and enforce anonymization under DPDP Act 2023 §6." },
  { icon: <Zap className="w-5 h-5" />,      title: "Stated Reason Integrity (M2)", desc: "Wachter counterfactual perturbations. Modifies only the blamed feature to prove causal responsibility and catch explanation fraud." },
  { icon: <Server className="w-5 h-5" />,   title: "Rényi DP Accountant (M5)", desc: "Monitors ε in α-space. Proper mathematical composition avoids overstating budget by 48× vs naive linear accumulation." },
  { icon: <QrCode className="w-5 h-5" />,   title: "Cryptographic Wax Seal (M3)", desc: "SHA-256 chain + Ed25519 signatures. Position-bound parameters prevent block deletion, insertion, or splicing." },
  { icon: <Scale className="w-5 h-5" />,    title: "IEEE Std 7003-2024 (RT)", desc: "Red-teams classifiers against vulnerable subgroups — migrants, elderly, seasonal workers — flagging 44.8% approval rate disparities." },
  { icon: <Settings className="w-5 h-5" />, title: "Secure Quota Gateway (M4)", desc: "Role-based JWT gateway controls query budgets. Prevents spam query attacks from exhausting the model's privacy allowance." },
];

function FeatureGrid() {
  const { ref, inView } = useInView(0.1);
  return (
    <section ref={ref} className="py-16 mx-auto max-w-5xl px-5">
      <div className={`text-center space-y-2 mb-10 ${inView ? "anim-fade-up" : "opacity-0"}`}>
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-brand-gold bg-brand-gold-soft border border-brand-gold/15 px-3 py-1 rounded-full">
          Five-Layer Audit Architecture
        </span>
        <h2 className="text-2xl md:text-3xl font-serif font-extrabold text-accent">
          What SENTINEL checks
        </h2>
        <p className="text-sm text-muted max-w-lg mx-auto">
          Five cryptographically linked audit modules, running in parallel, to evaluate a target model from the outside.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className={`step-card group ${inView ? `anim-fade-up delay-${Math.min((i + 1) * 100, 600)}` : "opacity-0"}`}
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-brand-gold-soft border border-brand-gold/20 rounded-xl text-brand-gold group-hover:bg-brand-gold group-hover:text-white group-hover:border-brand-gold transition-all duration-300">
                {f.icon}
              </div>
              <div className="space-y-1.5 flex-1">
                <h3 className="font-serif font-bold text-sm text-accent">{f.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{f.desc}</p>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-rule flex items-center gap-1 text-[0.68rem] font-bold text-brand-gold opacity-0 group-hover:opacity-100 transition-all duration-300">
              Explore in sandbox <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SESSION BAR
══════════════════════════════════════════════════════════════════ */
function SessionBar({ session, onSession }: { session: LoginResponse | null; onSession: (v: LoginResponse | null) => void }) {
  const [subject, setSubject] = useState("Auditor Profile");
  const [role, setRole]       = useState<Role>("journalist");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);

  if (session) {
    const sel = ROLES.find((r) => r.id === session.role);
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border border-accent bg-accent text-white px-5 py-3.5 rounded-xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative p-1.5 bg-brand-gold/10 rounded-lg border border-white/20">
            <Server className="w-4 h-4 text-brand-gold animate-pulse" />
          </div>
          <p className="text-sm">
            Authenticated as: <span className="font-bold text-brand-gold">{sel?.label}</span>
            <span className="text-slate-400 ml-2 text-xs font-mono">
              · {session.queries_per_audit.toLocaleString()} queries · ε ≤ {session.max_epsilon}
            </span>
          </p>
        </div>
        <button
          className="text-xs font-bold text-brand-gold hover:text-white flex items-center gap-1.5 cursor-pointer border border-brand-gold/30 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          onClick={() => { setToken(null); onSession(null); }}
        >
          <LogOut className="w-3.5 h-3.5" /> Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="sheet rounded-2xl space-y-4">
      <div className="space-y-1">
        <h3 className="text-lg font-serif font-bold flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-brand-gold" />
          Gateway Access Credentials
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          Select your delegation role to establish authenticated session quotas. The demo gateway issues JWT tokens with role-specific query limits.
        </p>
      </div>

      {/* Role preview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {ROLES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRole(r.id)}
            className={`text-left p-3 rounded-xl border text-xs transition-all duration-200 cursor-pointer ${
              role === r.id
                ? "border-brand-gold bg-brand-gold-soft text-accent font-bold"
                : "border-rule text-muted hover:border-rule-strong hover:text-ink-soft"
            }`}
          >
            <div className="font-bold mb-0.5 text-[0.78rem]">{r.label}</div>
            <div className="text-[0.68rem] leading-snug opacity-75">{r.desc}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-end pt-1">
        <label className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
          <span className="rule-label">Auditor Identifier</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="field text-sm"
            placeholder="e.g. RTI Auditor #21"
          />
        </label>
        <button
          className="btn-primary rounded-xl flex items-center gap-2 cursor-pointer h-[42px] px-6"
          disabled={busy || !subject.trim()}
          onClick={async () => {
            setBusy(true); setError(null);
            try {
              const res = await api.login(subject.trim(), role);
              setToken(res.access_token);
              onSession(res);
            } catch (e) {
              setError(e instanceof ApiError ? e.message : "Could not reach backend on port 8000.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <LogIn className="w-4 h-4" />
          {busy ? "Authenticating..." : "Establish Secure Session"}
        </button>
      </div>

      {error && (
        <div className="callout-flag flex items-center gap-2 rounded-xl">
          <ShieldAlert className="w-4 h-4 text-flag flex-shrink-0" />
          <p className="text-xs font-semibold">{error}</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   FOOTER
══════════════════════════════════════════════════════════════════ */
function SiteFooter() {
  return (
    <footer className="bg-accent border-t-4 border-brand-gold/30">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <div className="flex flex-wrap justify-between gap-8 mb-8">
          <div className="space-y-3 max-w-xs">
            <div className="flex items-center gap-2">
              <Activity className="text-brand-gold w-5 h-5" />
              <span className="font-serif text-lg font-extrabold text-white">SENTINEL</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Independent algorithmic trust and integrity verification layer for public-sector AI decision models. Evaluates privacy, fairness, and cryptographic integrity from the outside.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-3">
              <div className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">Compliance</div>
              {["India DPDP Act 2023", "IEEE Std 7003-2024", "TIPPSS Framework", "MeitY Sandbox"].map((s) => (
                <div key={s} className="text-slate-400 hover:text-white transition-colors cursor-default">{s}</div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-500">Modules</div>
              {["M1: Privacy Audit", "M2: Reason Integrity", "M3: Merkle Chain", "M4: Quota Gateway", "M5: DP Accountant"].map((s) => (
                <div key={s} className="text-slate-400 hover:text-white transition-colors cursor-default">{s}</div>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-wrap justify-between gap-3 text-[0.7rem] text-slate-500 font-semibold">
          <span>Synthetic welfare dataset · Ed25519 signed · No model weights accessed</span>
          <span>IEEE Tech for Tomorrow 2026 Hackathon · TIPPSS Track · Cybersecurity for Community Safety</span>
        </div>
      </div>
    </footer>
  );
}
