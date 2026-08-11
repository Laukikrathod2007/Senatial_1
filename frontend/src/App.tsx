import { useState } from "react";
import { api, ApiError, setToken, type LoginResponse, type Role } from "./api/client";
import { AuditorConsole } from "./pages/AuditorConsole";
import { CitizenPortal } from "./pages/CitizenPortal";
import { VerifyReport } from "./pages/VerifyReport";

type Tab = "citizen" | "auditor" | "verify";

const TABS: { id: Tab; label: string; needsAuth: boolean }[] = [
  { id: "citizen", label: "Check a decision", needsAuth: true },
  { id: "auditor", label: "Auditor console", needsAuth: true },
  { id: "verify", label: "Verify a report", needsAuth: false },
];

const ROLES: { id: Role; label: string }[] = [
  { id: "citizen", label: "Citizen" },
  { id: "journalist", label: "Journalist" },
  { id: "certified_auditor", label: "Certified auditor" },
  { id: "gov_self_audit", label: "Government self-audit" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("citizen");
  const [session, setSession] = useState<LoginResponse | null>(null);

  const active = TABS.find((entry) => entry.id === tab)!;

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-5xl px-5 pb-20">
        <Masthead tab={tab} onTab={setTab} />

        <main className="mt-8 space-y-6">
          <SessionBar session={session} onSession={setSession} />

          {active.needsAuth && !session ? (
            <section className="sheet">
              <h2 className="text-xl">Sign in to run an audit</h2>
              <p className="mt-2 max-w-2xl text-[0.95rem] text-muted">
                Auditing sends real queries to the system under test and spends a
                measured privacy budget, so it is never anonymous. Verification is
                different: it is open to everyone, needs no account, and is on the{" "}
                <button
                  className="text-accent underline underline-offset-2"
                  onClick={() => setTab("verify")}
                >
                  Verify a report
                </button>{" "}
                tab.
              </p>
            </section>
          ) : tab === "citizen" ? (
            <CitizenPortal />
          ) : tab === "auditor" ? (
            <AuditorConsole />
          ) : (
            <VerifyReport />
          )}
        </main>

        <footer className="mt-14 border-t border-rule pt-5 text-[0.82rem] leading-relaxed text-muted">
          The demo audits a locally-trained stand-in model on synthetic data —
          disclosed openly, never presented as a live government system. The
          methodology is what transfers: the same code runs unmodified against any
          classifier that exposes predictions.
        </footer>
      </div>
    </div>
  );
}

function Masthead({ tab, onTab }: { tab: Tab; onTab: (value: Tab) => void }) {
  return (
    <header className="border-b border-ink pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="font-serif text-[2.1rem] tracking-tight">SENTINEL</h1>
        <p className="text-[0.82rem] text-muted">
          IEEE Tech for Tomorrow 2026 · TIPPSS
        </p>
      </div>
      <p className="mt-1 max-w-3xl pb-5 font-serif text-[1.05rem] italic text-ink-soft">
        Independent verification for public-sector AI systems — using query access
        alone, with no model internals and no training data.
      </p>

      <nav className="-mb-px flex flex-wrap gap-x-7">
        {TABS.map((entry) => {
          const selected = tab === entry.id;
          return (
            <button
              key={entry.id}
              aria-selected={selected}
              onClick={() => onTab(entry.id)}
              className={`border-b-2 pb-2.5 text-sm transition-colors ${
                selected
                  ? "border-accent font-semibold text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
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
  const [subject, setSubject] = useState("reporter");
  const [role, setRole] = useState<Role>("journalist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) {
    const label = ROLES.find((entry) => entry.id === session.role)?.label ?? session.role;
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 border border-rule bg-white px-5 py-3">
        <p className="text-sm">
          Signed in as <span className="font-semibold">{label}</span>
          <span className="text-muted">
            {" "}
            · {session.queries_per_audit.toLocaleString()} queries per audit ·
            budget ceiling ε {session.max_epsilon}
          </span>
        </p>
        <button
          className="text-sm text-accent underline underline-offset-2"
          onClick={() => {
            setToken(null);
            onSession(null);
          }}
        >
          Sign out
        </button>
      </section>
    );
  }

  return (
    <section className="sheet">
      <h2 className="text-lg">Sign in</h2>
      <p className="mt-1 max-w-2xl text-[0.9rem] text-muted">
        Each role carries a different query allowance and privacy ceiling. A
        citizen can check their own case; a systematic sweep requires an auditor.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="rule-label">Name</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="field w-52"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="rule-label">Role</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            className="field w-56"
          >
            {ROLES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn-primary"
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
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>

      {error && <p className="callout-flag mt-4">{error}</p>}
    </section>
  );
}
