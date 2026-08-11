/**
 * Certified auditor console: full technical output, privacy budget visual gauges,
 * and the fairness sweep cohorts.
 */

import { useEffect, useState } from "react";
import {
  api,
  ApiError,
  type BudgetStatus,
  type ExplainabilityReport,
  type FairnessReport,
} from "../api/client";
import {
  Activity,
  AlertTriangle,
  Users,
  Scale,
  Gauge,
  Info,
  ShieldCheck,
  Zap
} from "lucide-react";

export function AuditorConsole() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const [fairness, setFairness] = useState<FairnessReport | null>(null);
  const [explain, setExplain] = useState<ExplainabilityReport | null>(null);

  async function refreshBudget() {
    try {
      setBudget(await api.budget());
    } catch {
      /* budget is supplementary; a failure here should not blank the console */
    }
  }

  useEffect(() => {
    void refreshBudget();
  }, []);

  async function run(kind: "fairness" | "explainability") {
    setBusy(kind);
    setError(null);
    try {
      if (kind === "fairness") {
        const { report } = await api.auditFairness();
        setFairness(report);
      } else {
        const { report } = await api.auditExplainability();
        setExplain(report);
      }
      await refreshBudget();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not reach the audit service.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {budget && <BudgetCard budget={budget} />}

      <section className="bg-white border border-rule rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-rule bg-paper flex items-center justify-between">
          <h2 className="font-serif font-extrabold text-accent flex items-center gap-2">
            <Scale className="w-5 h-5 text-brand-gold" /> Systematic Audits
          </h2>
          <span className="tag-gold">IEEE 7003-2024</span>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted leading-relaxed max-w-2xl">
            Every audit is preflight-checked against your role's query allowance and the target's remaining privacy budget <em>before</em> any probe is sent.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary rounded-xl flex items-center gap-2 cursor-pointer"
              disabled={busy !== null} onClick={() => run("explainability")}>
              <Activity className="w-4 h-4" />
              {busy === "explainability" ? "Auditing Reasons..." : "Audit Stated Reasons (M2)"}
            </button>
            <button className="btn-quiet rounded-xl flex items-center gap-2 border-brand-gold text-brand-gold hover:bg-brand-gold-soft cursor-pointer"
              disabled={busy !== null} onClick={() => run("fairness")}>
              <Users className="w-4 h-4" />
              {busy === "fairness" ? "Stress-Testing Cohorts..." : "Run Fairness Red-Team (RT)"}
            </button>
          </div>
          {error && (
            <div className="callout-flag rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-flag mt-0.5" />
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}
        </div>
      </section>

      {explain && <ExplainabilityCard report={explain} />}
      {fairness && <FairnessCard report={fairness} />}
    </>
  );
}

function BudgetCard({ budget }: { budget: BudgetStatus }) {
  const used = budget.epsilon_spent / budget.max_epsilon;
  const pct = Math.min(100, used * 100);
  const tone = used > 0.85 ? "tag-flag" : used > 0.6 ? "tag-caution" : "tag-clear";
  const barColor = used > 0.85 ? "bg-flag" : used > 0.6 ? "bg-caution" : "bg-clear";

  return (
    <section className="bg-white border border-rule rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-rule bg-paper">
        <h2 className="font-serif font-extrabold text-accent flex items-center gap-2">
          <Gauge className="w-5 h-5 text-brand-gold animate-pulse" /> Privacy Loss Budget (ε)
        </h2>
        <span className={tone}>{budget.epsilon_spent.toFixed(2)} / {budget.max_epsilon} ε spent</span>
      </div>
      <div className="p-6 space-y-5">
        <p className="text-sm text-muted leading-relaxed">
          Differential Privacy epsilon measures information leak. We restrict cumulative epsilon to prevent the audit engine itself from becoming a data leak vector.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-muted">Budget consumed</span>
            <span className="font-mono text-ink">{pct.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-rule-strong rounded-full overflow-hidden">
            <div className={`h-full ${barColor} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[0.65rem] text-muted font-mono">
            <span>0% (clean)</span><span>60% (caution)</span><span>85% (critical)</span><span>100% exhausted</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Queries Probed",   value: budget.queries_spent.toLocaleString(), sub: "Total target queries", color: "text-ink" },
            { label: "Rényi Order α*",    value: `α* ${budget.optimal_alpha}`,          sub: "Optimal DP order",   color: "text-accent" },
            { label: "Naive ε (Wrong)",   value: `ε ${budget.naive_linear_epsilon.toFixed(1)}`, sub: budget.composition_saving + " saved", color: "text-flag" },
          ].map(s => (
            <div key={s.label} className="bg-paper border border-rule rounded-xl p-4 space-y-1">
              <span className="rule-label block">{s.label}</span>
              <span className={`text-xl font-mono font-extrabold ${s.color}`}>{s.value}</span>
              <span className="text-[0.65rem] text-muted block">{s.sub}</span>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2.5 p-3 bg-clear-soft border border-clear/20 rounded-xl text-xs text-clear">
          <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="font-medium leading-relaxed">{budget.note}</p>
        </div>
      </div>
    </section>
  );
}

function ExplainabilityCard({ report }: { report: ExplainabilityReport }) {
  return (
    <section className="bg-white border border-rule rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-rule bg-paper">
        <h2 className="font-serif font-extrabold text-accent flex items-center gap-2">
          <Activity className="w-5 h-5 text-brand-gold" /> Stated Reasons Integrity
        </h2>
      </div>
      <div className="p-6 space-y-4">
        {report.headline && (
          <div className="callout-flag rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-flag" />
            <p className="text-sm font-semibold">{report.headline}</p>
          </div>
        )}
        <div className="space-y-3">
          {report.per_feature.map(feature => {
            const rate = feature.mismatch_rate * 100;
            const flagged = rate >= 15;
            const tone = flagged ? "tag-flag" : rate >= 5 ? "tag-caution" : "tag-clear";
            const barColor = flagged ? "bg-flag" : rate >= 5 ? "bg-caution" : "bg-clear";
            return (
              <div key={feature.feature} className="p-4 bg-paper border border-rule rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-sm text-accent">{feature.citizen_label}</span>
                  <span className={tone}>{feature.verdict}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[0.7rem] font-bold text-muted">
                    <span>{feature.cases_tested} cases tested</span>
                    <span>{rate.toFixed(1)}% mismatch</span>
                  </div>
                  <div className="h-2 bg-rule rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} rounded-full transition-all duration-500`} style={{ width: `${Math.min(rate, 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-[0.62rem] text-muted italic">
                    <span>95% CI: {feature.mismatch_rate_ci[0].toFixed(2)}–{feature.mismatch_rate_ci[1].toFixed(2)}</span>
                    <span>Flip: {((1 - feature.reliability) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[0.7rem] text-muted italic text-right">
          {report.cases_tested} rejections tested · {report.queries_used} probes · {report.method}
        </p>
      </div>
    </section>
  );
}

function FairnessCard({ report }: { report: FairnessReport }) {
  return (
    <section className="bg-white border border-rule rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-rule bg-paper flex items-center justify-between">
        <h2 className="font-serif font-extrabold text-accent flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-gold" /> Vulnerable Cohort Red-Team Sweep
        </h2>
        {report.headline && <span className="tag-flag">Disparity Detected</span>}
      </div>
      <div className="p-6 space-y-4">
        {report.headline && (
          <div className="callout-flag rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-flag" />
            <p className="text-sm font-semibold">{report.headline}</p>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          {report.cohorts.map(cohort => {
            const rej = cohort.rejection_rate * 100;
            const base = report.baseline_rejection_rate * 100;
            const gap = cohort.disparity * 100;
            return (
              <div key={cohort.category} className={`p-4 rounded-2xl border space-y-3 ${
                cohort.flagged ? "border-flag/40 bg-flag-soft/30" : "border-rule bg-paper"
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif font-bold text-sm text-accent leading-snug">{cohort.affected_group}</h3>
                  <span className={cohort.flagged ? "tag-flag" : "tag-clear"}>
                    {cohort.flagged ? "Disparity" : "Safe"}
                  </span>
                </div>
                <p className="text-[0.72rem] text-muted leading-relaxed">{cohort.description}</p>
                <div className="space-y-2 pt-2 border-t border-rule">
                  {[{ label: "Cohort Rejection", val: rej, color: cohort.flagged ? "bg-flag" : "bg-clear" },
                    { label: "Baseline Rate",    val: base, color: "bg-muted" }].map(bar => (
                    <div key={bar.label} className="space-y-1">
                      <div className="flex justify-between text-[0.65rem] font-bold text-muted">
                        <span>{bar.label}</span><span>{bar.val.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-rule rounded-full overflow-hidden">
                        <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${Math.min(bar.val, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-[0.7rem] font-extrabold pt-1">
                    <span className="text-muted font-normal">Disparity gap</span>
                    <span className={cohort.flagged ? "text-flag" : "text-clear"}>
                      {gap >= 0 ? "+" : ""}{gap.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-start gap-2 p-3 bg-paper border border-rule rounded-xl text-xs text-muted">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Baseline rejection {(report.baseline_rejection_rate * 100).toFixed(1)}% over {report.baseline_profiles} clean profiles. Measured under IEEE Std 7003-2024.</p>
        </div>
        <div className="flex items-start gap-2 p-3 bg-caution-soft border border-caution/20 rounded-xl text-xs text-caution">
          <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="font-semibold">{report.disclosure}</p>
        </div>
      </div>
    </section>
  );
}
