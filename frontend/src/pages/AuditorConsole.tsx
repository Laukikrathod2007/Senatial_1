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

      <section className="sheet rounded-xl border-rule bg-white shadow-sm space-y-4">
        <h2 className="text-xl font-serif font-bold flex items-center gap-2">
          <Scale className="w-5 h-5 text-accent" />
          Systematic Audits
        </h2>
        <p className="mt-2 max-w-2xl text-[0.92rem] text-muted leading-relaxed font-medium">
          Every audit is preflight-checked against your role's query allowance and the target's remaining privacy budget <em>before</em> any probe is sent. Refused audits cost the target zero queries.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="btn-primary rounded flex items-center gap-2 cursor-pointer"
            disabled={busy !== null}
            onClick={() => run("explainability")}
          >
            <Activity className="w-4 h-4" />
            {busy === "explainability" ? "Auditing Reasons..." : "Audit Stated Reasons (M2)"}
          </button>
          <button
            className="btn-quiet rounded flex items-center gap-2 border-accent text-accent hover:bg-accent-soft transition-all cursor-pointer"
            disabled={busy !== null}
            onClick={() => run("fairness")}
          >
            <Users className="w-4 h-4 text-accent" />
            {busy === "fairness" ? "Stress-Testing Cohorts..." : "Run Fairness Red-Team (RT)"}
          </button>
        </div>
        {error && (
          <div className="callout-flag mt-4 flex items-start gap-2 rounded">
            <AlertTriangle className="w-4 h-4 text-flag mt-0.5" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
        )}
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
  const progressColor = used > 0.85 ? "bg-flag" : used > 0.6 ? "bg-caution" : "bg-clear";

  return (
    <section className="sheet rounded-xl border-rule bg-white shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-2">
        <h2 className="text-xl font-serif font-bold flex items-center gap-2">
          <Gauge className="w-5 h-5 text-accent animate-pulse" />
          Privacy Loss Budget
        </h2>
        <span className={`rounded-full ${tone} px-3 py-1 font-bold text-xs uppercase normal-case`}>
          ε {budget.epsilon_spent.toFixed(2)} / {budget.max_epsilon} spent
        </span>
      </div>

      <p className="text-xs text-muted leading-relaxed font-medium">
        Differential Privacy (DP) measures information leak (epsilon). We restrict the cumulative leak to ensure the audit engine itself doesn't become a source of citizen data leaks.
      </p>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full bg-rule-strong h-3 rounded-full overflow-hidden p-0.5">
          <div className={`h-full ${progressColor} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }}></div>
        </div>
        <div className="flex justify-between text-[0.7rem] text-muted font-bold font-mono">
          <span>0% Spent</span>
          <span>{pct.toFixed(0)}% Budget Exhausted</span>
          <span>100% (ε {budget.max_epsilon})</span>
        </div>
      </div>

      {/* Grid Comparisons */}
      <div className="grid sm:grid-cols-3 gap-4 pt-3 border-t border-rule">
        <div className="p-3 bg-paper rounded border border-rule">
          <span className="text-[0.65rem] text-muted block uppercase tracking-wider font-semibold">Queries Probed</span>
          <span className="text-xl font-mono font-bold text-ink">{budget.queries_spent.toLocaleString()}</span>
          <span className="text-[0.62rem] text-muted block mt-0.5">Total queries against target system</span>
        </div>
        <div className="p-3 bg-paper rounded border border-rule">
          <span className="text-[0.65rem] text-muted block uppercase tracking-wider font-semibold">Rényi Order Order</span>
          <span className="text-xl font-mono font-bold text-ink">α* {budget.optimal_alpha}</span>
          <span className="text-[0.62rem] text-muted block mt-0.5">Mathematically optimal DP order</span>
        </div>
        <div className="p-3 bg-paper rounded border border-rule">
          <span className="text-[0.65rem] text-muted block uppercase tracking-wider font-semibold">Naive ε Estimate</span>
          <span className="text-xl font-mono font-bold text-flag">ε {budget.naive_linear_epsilon.toFixed(1)}</span>
          <span className="text-[0.62rem] text-muted block mt-0.5 text-flag font-semibold">
            {budget.composition_saving} overstatement saved
          </span>
        </div>
      </div>

      <div className="p-3 bg-clear-soft text-clear border border-clear/30 rounded text-xs leading-relaxed flex gap-2">
        <ShieldCheck className="w-4 h-4 text-clear flex-shrink-0 mt-0.5" />
        <p className="font-medium">{budget.note}</p>
      </div>
    </section>
  );
}

function ExplainabilityCard({ report }: { report: ExplainabilityReport }) {
  return (
    <section className="sheet rounded-xl border-rule bg-white shadow-sm space-y-4">
      <h2 className="text-xl font-serif font-bold flex items-center gap-2">
        <Activity className="w-5 h-5 text-accent animate-pulse" />
        Stated Reasons Integrity Reports
      </h2>
      {report.headline && (
        <div className="callout-flag mt-4 flex items-center gap-2 rounded">
          <AlertTriangle className="w-4 h-4 text-flag mt-0.5" />
          <p className="text-sm font-semibold">{report.headline}</p>
        </div>
      )}

      <div className="space-y-4 mt-4">
        {report.per_feature.map((feature) => {
          const rate = feature.mismatch_rate * 100;
          const isFlagged = rate >= 15;
          const tone = isFlagged ? "tag-flag" : rate >= 5 ? "tag-caution" : "tag-clear";
          const progressColor = isFlagged ? "bg-flag" : rate >= 5 ? "bg-caution" : "bg-clear";
          
          return (
            <div key={feature.feature} className="p-3 bg-paper border border-rule rounded-lg space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-serif font-semibold">{feature.citizen_label}</span>
                <span className={`rounded-full ${tone} text-[0.65rem] px-2.5 py-0.5 font-bold`}>
                  {feature.verdict}
                </span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-[0.72rem] font-bold text-muted">
                  <span>Tested {feature.cases_tested} cases</span>
                  <span>{rate.toFixed(1)}% Mismatch Ratio</span>
                </div>
                <div className="w-full bg-rule h-2 rounded-full overflow-hidden">
                  <div className={`h-full ${progressColor} rounded-full transition-all duration-500`} style={{ width: `${rate}%` }}></div>
                </div>
                <div className="text-[0.65rem] text-muted italic flex justify-between">
                  <span>95% CI interval: {feature.mismatch_rate_ci[0].toFixed(2)} – {feature.mismatch_rate_ci[1].toFixed(2)}</span>
                  <span>Flip rate: {((1 - feature.reliability) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[0.7rem] text-muted italic text-right mt-2">
        Tested {report.cases_tested} rejections using {report.queries_used} probes. {report.method}.
      </p>
    </section>
  );
}

function FairnessCard({ report }: { report: FairnessReport }) {
  return (
    <section className="sheet rounded-xl border-rule bg-white shadow-sm space-y-4">
      <h2 className="text-xl font-serif font-bold flex items-center gap-2">
        <Users className="w-5 h-5 text-accent animate-pulse" />
        Vulnerable Cohort Red-Team Sweep
      </h2>
      {report.headline && (
        <div className="callout-flag mt-4 flex items-center gap-2 rounded">
          <AlertTriangle className="w-4 h-4 text-flag mt-0.5" />
          <p className="text-sm font-semibold">{report.headline}</p>
        </div>
      )}

      {/* Grid of cohort cards */}
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        {report.cohorts.map((cohort) => {
          const rejections = cohort.rejection_rate * 100;
          const baseline = report.baseline_rejection_rate * 100;
          const gap = cohort.disparity * 100;
          
          return (
            <div key={cohort.category} className={`p-4 rounded-lg border flex flex-col justify-between space-y-3 shadow-xs ${
              cohort.flagged ? "border-flag bg-flag-soft/40" : "border-rule bg-paper"
            }`}>
              <div className="space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-serif font-bold text-sm text-ink">{cohort.affected_group}</h3>
                  <span className={`rounded-full text-[0.62rem] font-bold px-2 py-0.5 ${
                    cohort.flagged ? "tag-flag" : "tag-quiet"
                  }`}>
                    {cohort.flagged ? "DISPARITY DETECTED" : "CLEARED SAFE"}
                  </span>
                </div>
                <p className="text-[0.72rem] text-muted leading-relaxed font-medium">
                  {cohort.description}
                </p>
              </div>

              {/* Visual Bars for Rejection Comparison */}
              <div className="space-y-2 pt-2 border-t border-rule-strong/20">
                <div className="space-y-1">
                  <div className="flex justify-between text-[0.68rem] font-bold">
                    <span className="text-muted">Rejection Rate:</span>
                    <span className={cohort.flagged ? "text-flag" : "text-ink"}>{rejections.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-rule h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full ${cohort.flagged ? "bg-flag" : "bg-clear"} rounded-full`} style={{ width: `${rejections}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[0.68rem] font-bold">
                    <span className="text-muted">Baseline Rate:</span>
                    <span>{baseline.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-rule h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-muted rounded-full" style={{ width: `${baseline}%` }}></div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[0.7rem] font-bold pt-1">
                  <span className="text-muted font-normal">Disparity Discrepancy:</span>
                  <span className={cohort.flagged ? "text-flag font-extrabold" : "text-muted"}>
                    {gap >= 0 ? "+" : ""}{gap.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-paper rounded border border-rule text-xs text-muted flex gap-2">
        <Info className="w-4 h-4 text-muted flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed font-medium">
          Baseline rejection rate is {(report.baseline_rejection_rate * 100).toFixed(1)}% over {report.baseline_profiles} matched clean applicant profiles. Cohort disparities are measured under IEEE Std 7003-2024.
        </p>
      </div>

      <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded text-xs flex gap-2">
        <Zap className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="font-semibold leading-relaxed">{report.disclosure}</p>
      </div>
    </section>
  );
}
