import { useState, useEffect } from "react";
import { api, ApiError, setToken, type LoginResponse, type Role } from "./api/client";
import { AuditorConsole } from "./pages/AuditorConsole";
import { CitizenPortal } from "./pages/CitizenPortal";
import { VerifyReport } from "./pages/VerifyReport";
import {
  Activity,
  Scale,
  ShieldCheck,
  KeyRound,
  ShieldAlert,
  Server,
  LogOut,
  LogIn,
  QrCode,
  Info
} from "lucide-react";

type Tab = "citizen" | "auditor" | "verify";

const TABS: { id: Tab; label: string; needsAuth: boolean; icon: React.ReactNode }[] = [
  { 
    id: "citizen", 
    label: "Check a decision", 
    needsAuth: true,
    icon: <ShieldCheck className="w-4 h-4" />
  },
  { 
    id: "auditor", 
    label: "Auditor console", 
    needsAuth: true,
    icon: <Scale className="w-4 h-4" />
  },
  { 
    id: "verify", 
    label: "Verify a report", 
    needsAuth: false,
    icon: <QrCode className="w-4 h-4" />
  },
];

const ROLES: { id: Role; label: string; desc: string }[] = [
  { id: "citizen", label: "Citizen", desc: "Check individual data leaks & rejection reasons." },
  { id: "journalist", label: "Journalist / RTI Activist", desc: "Run structured audits with query allowances." },
  { id: "certified_auditor", label: "Certified Auditor", desc: "Run vulnerability scans & full fairness audits." },
  { id: "gov_self_audit", label: "Government Self-Audit", desc: "Full access for pre-launch safety checking." },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("citizen");
  const [session, setSession] = useState<LoginResponse | null>(null);

  // Read tab parameter from URL on load (for QR Verification redirection)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "verify") {
      setTab("verify");
    }
  }, []);

  const active = TABS.find((entry) => entry.id === tab)!;

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1c1a17]">
      <div className="mx-auto max-w-5xl px-5 pb-20 space-y-8">
        
        {/* Navigation Masthead Header */}
        <Masthead tab={tab} onTab={setTab} />

        <main className="space-y-6">
          {/* Active Session Status Bar */}
          <SessionBar session={session} onSession={setSession} />

          {/* Conditional Screen Rendering */}
          {active.needsAuth && !session ? (
            <section className="sheet rounded-xl border-rule bg-white shadow-sm space-y-4">
              <h2 className="text-xl font-serif font-bold flex items-center gap-2">
                <LogIn className="w-5 h-5 text-accent" />
                Sign in to run an audit
              </h2>
              <p className="max-w-2xl text-[0.95rem] text-muted leading-relaxed font-medium">
                Auditing sends real-time queries to the scoring systems under test. It consumes queries and registers cumulative privacy budget parameters, so checks are authenticated.
              </p>
              <div className="p-3 bg-paper-sunk rounded border border-rule text-xs text-muted flex gap-2">
                <Info className="w-4 h-4 text-muted flex-shrink-0 mt-0.5" />
                <p>
                  To verify signed certificate reports or Merkle roots without an account, switch directly to the{" "}
                  <button
                    className="text-accent underline hover:text-ink font-semibold"
                    onClick={() => setTab("verify")}
                  >
                    Verify a report
                  </button>{" "}
                  portal (no sign-in required).
                </p>
              </div>
            </section>
          ) : tab === "citizen" ? (
            <CitizenPortal />
          ) : tab === "auditor" ? (
            <AuditorConsole />
          ) : (
            <VerifyReport />
          )}
        </main>

        <footer className="mt-14 border-t border-rule pt-5 text-[0.8rem] leading-relaxed text-muted font-medium flex flex-wrap justify-between gap-3">
          <span>Demo auditing trained classifier target model on synthetic welfare dataset.</span>
          <span>IEEE Tech for Tomorrow 2026 Hackathon (TIPPSS track)</span>
        </footer>
      </div>
    </div>
  );
}

function Masthead({ tab, onTab }: { tab: Tab; onTab: (value: Tab) => void }) {
  return (
    <header className="border-b border-rule pt-8 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div className="flex items-center gap-2">
          <Activity className="text-accent w-7 h-7" />
          <h1 className="font-serif text-[2.2rem] tracking-tight font-extrabold">SENTINEL</h1>
        </div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted font-mono bg-paper-sunk border border-rule px-3 py-1 rounded">
          IEEE Pune Section · TIPPSS Track
        </p>
      </div>
      <p className="max-w-3xl font-serif text-[1.1rem] italic text-ink-soft leading-relaxed">
        Independent algorithmic trust and integrity verification layer for public-sector decision models. Evaluates data memorization, explanation consistency, and subgroup fairness from the outside.
      </p>

      {/* Navigation Buttons */}
      <nav className="-mb-px flex flex-wrap gap-x-1">
        {TABS.map((entry) => {
          const selected = tab === entry.id;
          return (
            <button
              key={entry.id}
              aria-selected={selected}
              onClick={() => onTab(entry.id)}
              className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-bold transition-all cursor-pointer ${
                selected
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {entry.icon}
              {entry.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

function SessionBar({
  session,
  onSession,
}: {
  session: LoginResponse | null;
  onSession: (value: LoginResponse | null) => void;
}) {
  const [subject, setSubject] = useState("Auditor Profile");
  const [role, setRole] = useState<Role>("journalist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) {
    const selectedRole = ROLES.find((entry) => entry.id === session.role);
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-white px-5 py-3 rounded-lg shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-accent-soft rounded border border-accent/20">
            <Server className="w-4 h-4 text-accent animate-pulse" />
          </div>
          <p className="text-sm">
            Authenticated: <span className="font-bold text-accent">{selectedRole?.label}</span>
            <span className="text-muted ml-2 font-medium">
              ({session.queries_per_audit.toLocaleString()} Q quota · ε {session.max_epsilon} max ceiling)
            </span>
          </p>
        </div>
        <button
          className="text-xs font-bold text-accent hover:text-ink flex items-center gap-1 cursor-pointer border border-accent/20 px-3 py-1.5 rounded bg-accent-soft hover:bg-accent-soft/80 transition-colors"
          onClick={() => {
            setToken(null);
            onSession(null);
          }}
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </section>
    );
  }

  return (
    <section className="sheet rounded-xl border-rule bg-white shadow-sm space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-serif font-bold flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-accent" />
          Gateway Access Credentials
        </h2>
        <p className="text-xs text-muted leading-relaxed font-medium">
          Select your delegation role to establish connection quotas. The demo gateway issues authenticated JWT sessions.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3 items-end">
        <label className="flex flex-col gap-1.5">
          <span className="rule-label">Auditor Identifier</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="field rounded border border-rule-strong focus:border-accent text-sm"
            placeholder="e.g. RTI Auditor #21"
          />
        </label>
        
        <label className="flex flex-col gap-1.5">
          <span className="rule-label">Credential Authorization Role</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="field rounded border border-rule-strong focus:border-accent text-sm"
          >
            {ROLES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>

        <button
          className="btn-primary rounded flex items-center gap-2 cursor-pointer h-[38px] font-bold"
          disabled={busy || subject.trim() === ""}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const response = await api.login(subject.trim(), role);
              setToken(response.access_token);
              onSession(response);
            } catch (caught) {
              setError(
                caught instanceof ApiError
                  ? caught.message
                  : "Could not reach the service. Is the backend running on port 8000?",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <LogIn className="w-4 h-4" />
          {busy ? "Authenticating Session..." : "Establish Secure Session"}
        </button>
      </div>

      {error && (
        <div className="callout-flag mt-4 flex items-center gap-2 rounded">
          <ShieldAlert className="w-4 h-4 text-flag" />
          <p className="text-xs font-semibold">{error}</p>
        </div>
      )}
    </section>
  );
}
