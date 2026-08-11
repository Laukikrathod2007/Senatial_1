/**
 * Citizen portal.
 *
 * Designed against docs 5.2: understandable to a 7th-9th standard reader. No
 * statistical vocabulary is shown by default; the technical detail sits behind
 * a disclosure so an auditor can still reach it without it being the first
 * thing a worried citizen sees.
 */

import { useState } from "react";
import {
  api,
  ApiError,
  type ExplainabilityReport,
  type MembershipReport,
  type PlainLanguage,
  type Sealed,
} from "../api/client";

// An actual planted canary from the demo dataset (training index
// canary_indices[7]), in the target's feature order: income, household size,
// land acres, years at address, aadhaar seeded, documents complete, prior
// schemes, age.
//
// These must be the real stored values, not plausible-looking ones. M1 asks
// whether the target memorized *this exact record*; an invented near-miss is a
// record it genuinely never saw, and correctly scores as not memorized.
const PLANTED_RECORD = [221305.94, 14, 28.8, 56.42, 0, 0, 8, 93.81];

// The outcome recorded for that applicant. This canary was rejected, and the
// score is measured against the confidence assigned to its true label -- so a
// wrong label here measures the wrong thing.
const PLANTED_LABEL = 0;

type Result =
  | { kind: "membership"; plain: PlainLanguage; report: MembershipReport; sealed: Sealed }
  | {
      kind: "explainability";
      plain: PlainLanguage;
      report: ExplainabilityReport;
      sealed: Sealed;
    };

export function CitizenPortal() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);

  async function run(kind: "membership" | "explainability") {
    setBusy(kind);
    setError(null);
    setResult(null);
    setShowTechnical(false);
    try {
      if (kind === "membership") {
        const { report, sealed } = await api.auditMembership(
          PLANTED_RECORD,
          PLANTED_LABEL,
          "my-record",
        );
        setResult({ kind, plain: report.plain_language, report, sealed });
      } else {
        const { report, sealed } = await api.auditExplainability();
        setResult({ kind, plain: report.plain_language, report, sealed });
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not reach the audit service. Is the backend running?",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <section className="sheet">
        <h2 className="text-xl">Check a decision that affected you</h2>
        <p className="mt-2 max-w-2xl text-[0.95rem] text-muted">
          Each check questions the system that made the decision. It does not need
          that system's permission, and it does not need your personal data.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <QuestionButton
            title="Did this system store my information?"
            detail="Tests whether the system memorised one specific person's record instead of learning general patterns."
            busy={busy === "membership"}
            disabled={busy !== null}
            onClick={() => run("membership")}
          />
          <QuestionButton
            title="Was I given the real reason?"
            detail="Tests whether fixing the reason you were given would actually have changed the decision."
            busy={busy === "explainability"}
            disabled={busy !== null}
            onClick={() => run("explainability")}
          />
        </div>

        {error && <p className="callout-flag mt-5">{error}</p>}
      </section>

      {result && (
        <section className="sheet">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl">Your result</h2>
            <span className="rule-label">Report #{result.sealed.sequence}</span>
          </div>

          <dl className="plain-answer mt-4">
            <dt>What we found</dt>
            <dd>{result.plain.what_we_found}</dd>
            <dt>What it means</dt>
            <dd>{result.plain.what_it_means}</dd>
            <dt>What you can do</dt>
            <dd>{result.plain.what_you_can_do}</dd>
            <dt>How sure are we</dt>
            <dd className="text-ink-soft">{result.plain.how_sure_are_we}</dd>
          </dl>

          <p className="callout-clear mt-5">
            This result was sealed and signed. It cannot be altered later without
            the change being detectable — anyone can check it, without an account,
            on the Verify a report tab.
          </p>

          <div className="mt-5 border-t border-rule pt-4">
            <button
              className="text-sm text-accent underline underline-offset-2"
              onClick={() => setShowTechnical((shown) => !shown)}
            >
              {showTechnical ? "Hide technical detail" : "Show technical detail"}
            </button>
            {showTechnical && <TechnicalDetail result={result} />}
          </div>
        </section>
      )}
    </>
  );
}

function QuestionButton({
  title,
  detail,
  busy,
  disabled,
  onClick,
}: {
  title: string;
  detail: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="border border-rule-strong bg-white px-5 py-4 text-left transition-colors
                 hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="block font-serif text-[1.0625rem] font-semibold">
        {busy ? "Checking…" : title}
      </span>
      <span className="mt-1 block text-[0.85rem] leading-snug text-muted">
        {detail}
      </span>
    </button>
  );
}

function TechnicalDetail({ result }: { result: Result }) {
  if (result.kind === "membership") {
    const finding = result.report.findings[0];
    return (
      <div className="mt-4">
        <table className="sheet-table">
          <tbody>
            <Row label="Memorization z-score" value={finding.memorization_z.toFixed(2)} />
            <Row label="p-value (one-sided)" value={finding.p_value.toExponential(1)} />
            <Row label="Reference models" value={String(finding.shadow_models)} />
            <Row
              label="Decoy control (mean)"
              value={finding.decoy_mean_score?.toFixed(3) ?? "—"}
            />
            <Row label="Queries used" value={String(result.report.queries_used)} />
          </tbody>
        </table>
        <p className="mt-3 text-[0.82rem] leading-relaxed text-muted">
          {result.report.method}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <table className="sheet-table">
        <thead>
          <tr>
            <th>Reason given</th>
            <th className="text-right">Cases</th>
            <th className="text-right">Reason wrong</th>
            <th className="text-right">95% interval</th>
          </tr>
        </thead>
        <tbody>
          {result.report.per_feature.map((feature) => (
            <tr key={feature.feature}>
              <td>{feature.citizen_label}</td>
              <td className="text-right">{feature.cases_tested}</td>
              <td className="text-right">
                {(feature.mismatch_rate * 100).toFixed(1)}%
              </td>
              <td className="text-right text-muted">
                {feature.mismatch_rate_ci[0].toFixed(2)}–
                {feature.mismatch_rate_ci[1].toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[0.82rem] leading-relaxed text-muted">
        {result.report.method}. Scope: {result.report.scope}.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td>{label}</td>
      <td className="text-right font-mono text-[0.85rem]">{value}</td>
    </tr>
  );
}
