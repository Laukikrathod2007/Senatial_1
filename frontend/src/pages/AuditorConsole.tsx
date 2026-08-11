/**
 * Certified auditor console: full technical output, budget visibility, and the
 * fairness sweep a citizen role does not have the quota to run.
 */

import { useEffect, useState } from "react";
import {
  api,
  ApiError,
  type BudgetStatus,
  type ExplainabilityReport,
  type FairnessReport,
} from "../api/client";

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

      <section className="sheet">
        <h2 className="text-xl">Run an audit</h2>
        <p className="mt-2 max-w-2xl text-[0.95rem] text-muted">
          Every audit is checked against your role's query allowance and the
          target's remaining privacy budget <em>before</em> any probe is sent, so a
          refused audit costs the target nothing.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="btn-primary"
            disabled={busy !== null}
            onClick={() => run("explainability")}
          >
            {busy === "explainability" ? "Running…" : "Explanation consistency (M2)"}
          </button>
          <button
            className="btn-quiet"
            disabled={busy !== null}
            onClick={() => run("fairness")}
          >
            {busy === "fairness" ? "Running…" : "Fairness sweep (Red-Team)"}
          </button>
        </div>
        {error && <p className="callout-flag mt-4">{error}</p>}
      </section>

      {explain && <ExplainabilityCard report={explain} />}
      {fairness && <FairnessCard report={fairness} />}
    </>
  );
}

function BudgetCard({ budget }: { budget: BudgetStatus }) {
  const used = budget.epsilon_spent / budget.max_epsilon;
  const tone = used > 0.85 ? "tag-flag" : used > 0.6 ? "tag-caution" : "tag-clear";

  return (
    <section className="sheet">
      <h2 className="text-xl">Privacy budget</h2>
      <p className="mt-2 max-w-2xl text-[0.95rem] text-muted">
        Cumulative privacy loss from every probe sent to this target, by anyone.
      </p>

      <table className="sheet-table mt-4">
        <tbody>
          <tr>
            <td>Queries spent against this target</td>
            <td className="text-right font-mono text-[0.85rem]">
              {budget.queries_spent.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td>Privacy loss</td>
            <td className="text-right">
              {/* Lowercase-forced: the tag classes uppercase their text, which
                * would render the epsilon glyph as a capital E and misstate the
                * privacy parameter. */}
              <span className={`${tone} normal-case`}>
                ε {budget.epsilon_spent.toFixed(2)} of {budget.max_epsilon}
              </span>
            </td>
          </tr>
          <tr>
            <td>Rényi order used</td>
            <td className="text-right font-mono text-[0.85rem]">
              α* {budget.optimal_alpha}
            </td>
          </tr>
          <tr>
            <td>
              If summed naively per query
              <span className="mt-0.5 block text-[0.82rem] text-muted">
                The mistake proper composition avoids
              </span>
            </td>
            <td className="text-right">
              <span className="font-mono text-[0.85rem] text-flag">
                ε {budget.naive_linear_epsilon.toFixed(1)}
              </span>
              <span className="mt-0.5 block text-[0.82rem] text-muted">
                {budget.composition_saving} overstatement
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mt-3 text-[0.82rem] leading-relaxed text-muted">{budget.note}</p>
    </section>
  );
}

function ExplainabilityCard({ report }: { report: ExplainabilityReport }) {
  return (
    <section className="sheet">
      <h2 className="text-xl">Explanation consistency</h2>
      {report.headline && <p className="callout-flag mt-4">{report.headline}</p>}

      <table className="sheet-table mt-4">
        <thead>
          <tr>
            <th>Stated reason</th>
            <th className="text-right">Cases</th>
            <th className="text-right">Held up</th>
            <th className="text-right">Wrong</th>
            <th className="text-right">95% interval</th>
            <th className="text-right">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {report.per_feature.map((feature) => (
            <tr key={feature.feature}>
              <td>{feature.citizen_label}</td>
              <td className="text-right">{feature.cases_tested}</td>
              <td className="text-right">{(feature.reliability * 100).toFixed(1)}%</td>
              <td className="text-right font-semibold">
                {(feature.mismatch_rate * 100).toFixed(1)}%
              </td>
              <td className="text-right text-muted">
                {feature.mismatch_rate_ci[0].toFixed(2)}–
                {feature.mismatch_rate_ci[1].toFixed(2)}
              </td>
              <td className="text-right">
                <span
                  className={
                    feature.mismatch_rate >= 0.15
                      ? "tag-flag"
                      : feature.mismatch_rate >= 0.05
                        ? "tag-caution"
                        : "tag-quiet"
                  }
                >
                  {feature.verdict}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-[0.82rem] leading-relaxed text-muted">
        {report.cases_tested} rejections tested using {report.queries_used} queries.{" "}
        {report.method}.
      </p>
    </section>
  );
}

function FairnessCard({ report }: { report: FairnessReport }) {
  return (
    <section className="sheet">
      <h2 className="text-xl">Fairness sweep</h2>
      {report.headline && <p className="callout-flag mt-4">{report.headline}</p>}

      <table className="sheet-table mt-4">
        <thead>
          <tr>
            <th>Group</th>
            <th className="text-right">Tested</th>
            <th className="text-right">Rejected</th>
            <th className="text-right">vs baseline</th>
            <th className="text-right">Flagged</th>
          </tr>
        </thead>
        <tbody>
          {report.cohorts.map((cohort) => (
            <tr key={cohort.category}>
              <td>
                {cohort.affected_group}
                <span className="mt-0.5 block text-[0.82rem] leading-snug text-muted">
                  {cohort.description}
                </span>
              </td>
              <td className="text-right">{cohort.profiles_tested}</td>
              <td className="text-right">
                {(cohort.rejection_rate * 100).toFixed(1)}%
              </td>
              <td className="text-right font-semibold">
                <span className={cohort.flagged ? "text-flag" : "text-muted"}>
                  {cohort.disparity >= 0 ? "+" : ""}
                  {(cohort.disparity * 100).toFixed(1)}%
                </span>
              </td>
              <td className="text-right">
                <span className={cohort.flagged ? "tag-flag" : "tag-quiet"}>
                  {cohort.flagged ? "Yes" : "No"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-[0.82rem] leading-relaxed text-muted">
        Baseline rejection rate {(report.baseline_rejection_rate * 100).toFixed(1)}%
        over {report.baseline_profiles} matched clean applicants.
      </p>

      <p className="callout-note mt-4">{report.disclosure}</p>
    </section>
  );
}
