/**
 * Demo auditor console: full technical output and prototype query-budget gauge,
 * and the fairness sweep cohorts.
 */

import { useEffect, useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  api,
  ApiError,
  type BudgetStatus,
  type AuditJob,
  type ExplainabilityReport,
  type FairnessReport,
  type Sealed,
} from "../api/client";
import { jsPDF } from "jspdf";
import {
  Activity,
  AlertTriangle,
  Download,
  Users,
  Scale,
  Gauge,
  Info,
  ShieldCheck,
  Zap
} from "lucide-react";

export function AuditorConsole() {
  const { t } = useLanguage();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<BudgetStatus | null>(null);
  const [fairness, setFairness] = useState<FairnessReport | null>(null);
  const [fairnessSeal, setFairnessSeal] = useState<Sealed | null>(null);
  const [explain, setExplain] = useState<ExplainabilityReport | null>(null);
  const [job, setJob] = useState<AuditJob | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);

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

  const activeJobId = job?.job_id;
  const activeJobStatus = job?.status;

  useEffect(() => {
    if (!activeJobId || activeJobStatus === "completed" || activeJobStatus === "failed") return;
    const controller = new AbortController();
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;

    const schedule = (delay: number) => {
      if (active) timer = setTimeout(() => void poll(), delay);
    };

    const poll = async () => {
      if (!active || inFlight) return;
      inFlight = true;
      try {
        const current = await api.auditJob(activeJobId, controller.signal);
        if (!active) return;
        setJob(current);
        setPollError(null);
        if (current.status === "completed" && current.result) {
          setFairness(current.result.report);
          setFairnessSeal(current.result.sealed);
          setBusy(null);
          void refreshBudget();
        } else if (current.status === "failed") {
          setError(current.error_message ?? "The audit could not be completed.");
          setBusy(null);
        } else {
          schedule(700);
        }
      } catch (caught) {
        if (!active || controller.signal.aborted) return;
        setPollError(
          caught instanceof ApiError
            ? caught.message
            : "Progress connection interrupted; retrying automatically.",
        );
        schedule(1500);
      } finally {
        inFlight = false;
      }
    };

    schedule(250);
    return () => {
      active = false;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [activeJobId, activeJobStatus]);

  async function run(kind: "fairness" | "http-fairness" | "explainability") {
    setBusy(kind);
    setError(null);
    setPollError(null);
    try {
      if (kind === "fairness") {
        setJob(await api.startFairnessJob());
      } else if (kind === "http-fairness") {
        setJob(await api.startHttpFairnessJob());
      } else {
        const { report } = await api.auditExplainability();
        setExplain(report);
        await refreshBudget();
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not reach the audit service.",
      );
    } finally {
      if (kind === "explainability") setBusy(null);
    }
  }

  function downloadFairnessReport() {
    if (!fairness || !fairnessSeal) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 16;
    const width = 178;
    let y = 18;
    const write = (text: string, size = 10, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, width);
      const needed = lines.length * (size * 0.48) + 3;
      if (y + needed > 278) { doc.addPage(); y = 18; }
      doc.text(lines, margin, y);
      y += needed;
    };
    write(fairness.target ? "SENTINEL · LOCAL HTTP TARGET AUDIT" : "SENTINEL · SYNTHETIC FAIRNESS STRESS TEST", 16, true);
    write(fairness.target ? `${fairness.target.model_id} · ${fairness.target.model_version ?? "model version unavailable"}` : "Synthetic local welfare eligibility model · generated data only", 9);
    write(`Report sequence ${fairnessSeal.sequence} · SHA-256 ${fairnessSeal.report_hash}`, 8);
    write(`Ed25519 signature ${fairnessSeal.signature}`, 8);
    y += 3;
    write("Method and scope", 12, true);
    write(fairness.method);
    write(`Baseline: ${fairness.baseline_rejection_rate === null ? "unavailable" : `${(fairness.baseline_rejection_rate * 100).toFixed(2)}% rejection`} across ${fairness.baseline_profiles} completed profiles.`);
    write(`Queries used: ${fairness.queries_used}.`);
    y += 2;
    write("Cohort results", 12, true);
    for (const cohort of fairness.cohorts) {
      write(`${cohort.affected_group} (completed n=${cohort.profiles_tested}, attempted=${cohort.profiles_attempted ?? cohort.profiles_tested})`, 10, true);
      if (cohort.rejection_rate !== null && cohort.rejection_rate_ci && cohort.baseline_rejection_rate !== null && cohort.disparity !== null) {
        write(`Rejection ${(cohort.rejection_rate * 100).toFixed(2)}% (95% Wilson CI ${(cohort.rejection_rate_ci[0] * 100).toFixed(2)}–${(cohort.rejection_rate_ci[1] * 100).toFixed(2)}%); baseline ${(cohort.baseline_rejection_rate * 100).toFixed(2)}%; gap ${(cohort.disparity * 100).toFixed(2)} percentage points; exploratory p=${cohort.p_value.toExponential(2)}.`);
      } else {
        write("Metrics unavailable because too few target responses completed.");
      }
      if (cohort.profiles_failed) write(`Failed probes: ${cohort.profiles_failed} (${JSON.stringify(cohort.failed_probe_types ?? {})}).`);
    }
    y += 2;
    write("Interpretation limitation", 12, true);
    write(fairness.disclosure);
    write("Synthetic model only. Not evidence about a real person, public service, or deployed system. Hash and signature establish integrity of these bytes, not truth or certification.");
    doc.save(`sentinel-synthetic-fairness-${fairnessSeal.sequence}.pdf`);
  }

  function downloadExactFairnessData() {
    if (!fairness || !fairnessSeal) return;
    const payload = {
      dataset: fairness.target?.model_id ?? "welfare-eligibility-demo (synthetic)",
      report: fairness,
      seal: fairnessSeal,
      limitation: "Synthetic stand-in model only; not evidence about a real person or deployed service.",
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `sentinel-synthetic-fairness-${fairnessSeal.sequence}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {budget && <BudgetCard budget={budget} t={t} />}

      <section className="bg-white border border-rule rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-rule bg-paper flex items-center justify-between">
          <h2 className="font-serif font-extrabold text-accent flex items-center gap-2">
            <Scale className="w-5 h-5 text-brand-gold" /> {t.auditor_dataset_title}
          </h2>
          <span className="tag-quiet">{t.auditor_dataset_tag}</span>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted leading-relaxed max-w-2xl">
            {t.auditor_dataset_desc}
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="btn-primary rounded-xl flex items-center gap-2 cursor-pointer"
              disabled={busy !== null} onClick={() => run("explainability")}>
              <Activity className="w-4 h-4" />
              {busy === "explainability" ? t.auditor_running : "Audit Stated Reasons (M2)"}
            </button>
            <button className="btn-quiet rounded-xl flex items-center gap-2 border-brand-gold text-brand-gold hover:bg-brand-gold-soft cursor-pointer"
              disabled={busy !== null} onClick={() => run("fairness")}>
              <Users className="w-4 h-4" />
              {busy === "fairness" ? t.auditor_running : t.auditor_run_synthetic_btn}
            </button>
            <button className="btn-quiet rounded-xl flex items-center gap-2 cursor-pointer"
              disabled={busy !== null} onClick={() => run("http-fairness")}>
              <Zap className="w-4 h-4" />
              {busy === "http-fairness" ? t.auditor_running : t.auditor_run_http_btn}
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
      {fairness && <FairnessCard report={fairness} seal={fairnessSeal} onDownload={downloadFairnessReport} onDownloadExact={downloadExactFairnessData} t={t} />}
      {job && <AuditJobCard job={job} pollingError={pollError} />}
    </>
  );
}

function AuditJobCard({ job, pollingError }: { job: AuditJob; pollingError: string | null }) {
  const title = job.status === "queued" ? "Audit queued" :
    job.status === "running" ? "Audit running" :
      job.status === "completed" ? "Audit complete" : "Audit failed";
  return (
    <section className="bg-white border border-rule rounded-2xl shadow-sm p-6 space-y-3" aria-live="polite">
      <div className="flex justify-between items-center gap-3">
        <h2 className="font-serif font-extrabold text-accent">{title}</h2>
        <span className="tag-quiet">{job.progress_pct.toFixed(0)}%</span>
      </div>
      <p className="text-sm text-muted">
        {job.completed_probes.toLocaleString()} successful · {job.failed_probes.toLocaleString()} failed · {job.unattempted_probes.toLocaleString()} not attempted · {job.total_probes.toLocaleString()} planned probes
      </p>
      <div className="h-2 bg-rule rounded-full overflow-hidden" role="progressbar" aria-label="Audit probe progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={job.progress_pct}>
        <div className="h-full bg-brand-gold rounded-full transition-all" style={{ width: `${Math.min(100, job.progress_pct)}%` }} />
      </div>
      {pollingError && <p className="text-xs text-caution">{pollingError}</p>}
      {job.status === "failed" && job.error_message && <p className="text-sm text-flag">{job.error_message}</p>}
      <p className="text-[0.7rem] text-muted break-all">Job {job.job_id} · {job.target_id}</p>
    </section>
  );
}

function BudgetCard({ budget, t }: { budget: BudgetStatus; t: ReturnType<typeof useLanguage>["t"] }) {
  const used = budget.epsilon_spent / budget.max_epsilon;
  const pct = Math.min(100, used * 100);
  const tone = used > 0.85 ? "tag-flag" : used > 0.6 ? "tag-caution" : "tag-clear";
  const barColor = used > 0.85 ? "bg-flag" : used > 0.6 ? "bg-caution" : "bg-clear";

  return (
    <section className="bg-white border border-rule rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-rule bg-paper">
        <h2 className="font-serif font-extrabold text-accent flex items-center gap-2">
          <Gauge className="w-5 h-5 text-brand-gold animate-pulse" /> {t.auditor_budget_title}
        </h2>
        <span className={tone}>{budget.epsilon_spent.toFixed(2)} / {budget.max_epsilon} ε spent</span>
      </div>
      <div className="p-6 space-y-5">
        <p className="text-sm text-muted leading-relaxed">
          {t.auditor_budget_note}
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
            { label: t.auditor_budget_queries, value: budget.queries_spent.toLocaleString(), sub: "Total target queries", color: "text-ink" },
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

function FairnessCard({ report, seal, onDownload, onDownloadExact, t }: { report: FairnessReport; seal: Sealed | null; onDownload: () => void; onDownloadExact: () => void; t: ReturnType<typeof useLanguage>["t"] }) {
  return (
    <section className="bg-white border border-rule rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-rule bg-paper flex items-center justify-between">
        <h2 className="font-serif font-extrabold text-accent flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-gold" /> {t.auditor_fairness_heading}
        </h2>
        <div className="flex gap-2">
          <button type="button" onClick={onDownloadExact} disabled={!seal} className="btn-quiet inline-flex items-center gap-2" aria-label="Download exact audit data as JSON">
            <Download className="w-4 h-4" /> {t.auditor_download_json}
          </button>
          <button type="button" onClick={onDownload} disabled={!seal} className="btn-quiet inline-flex items-center gap-2" aria-label="Download readable PDF report from these results">
            <Download className="w-4 h-4" /> {t.auditor_download_pdf}
          </button>
        </div>
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
            const rej = cohort.rejection_rate === null ? null : cohort.rejection_rate * 100;
            const base = report.baseline_rejection_rate === null ? null : report.baseline_rejection_rate * 100;
            const gap = cohort.disparity === null ? null : cohort.disparity * 100;
            return (
              <div key={cohort.category} className={`p-4 rounded-2xl border space-y-3 ${
                cohort.flagged ? "border-flag/40 bg-flag-soft/30" : "border-rule bg-paper"
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif font-bold text-sm text-accent leading-snug">{cohort.affected_group}</h3>
                  <span className={cohort.flagged ? "tag-flag" : "tag-quiet"}>
                    {cohort.flagged ? t.auditor_status_flagged : t.auditor_status_normal}
                  </span>
                </div>
                <p className="text-[0.72rem] text-muted leading-relaxed">{cohort.description}</p>
                <div className="space-y-2 pt-2 border-t border-rule">
                  {[{ label: t.auditor_cohort_col_rate, val: rej, color: cohort.flagged ? "bg-flag" : "bg-clear" },
                    { label: t.auditor_baseline_rate,    val: base, color: "bg-muted" }].map(bar => (
                    <div key={bar.label} className="space-y-1">
                      <div className="flex justify-between text-[0.65rem] font-bold text-muted">
                        <span>{bar.label}</span><span>{bar.val === null ? "Unavailable" : `${bar.val.toFixed(1)}%`}</span>
                      </div>
                      <div className="h-1.5 bg-rule rounded-full overflow-hidden">
                        <div className={`h-full ${bar.color} rounded-full`} style={{ width: `${Math.min(bar.val ?? 0, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between text-[0.7rem] font-extrabold pt-1">
                    <span className="text-muted font-normal">{t.auditor_cohort_col_gap}</span>
                    <span className={cohort.flagged ? "text-flag" : "text-clear"}>
                      {gap === null ? "Unavailable" : `${gap >= 0 ? "+" : ""}${gap.toFixed(1)}%`}
                    </span>
                  </div>
                  <p className="text-xs text-muted">{cohort.rejection_rate_ci ? `95% Wilson CI: ${(cohort.rejection_rate_ci[0] * 100).toFixed(1)}–${(cohort.rejection_rate_ci[1] * 100).toFixed(1)}%` : "95% Wilson CI unavailable"} · p={cohort.p_value.toExponential(2)} · completed n={cohort.profiles_tested}{cohort.profiles_failed ? ` · failed ${cohort.profiles_failed}` : ""}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-start gap-2 p-3 bg-paper border border-rule rounded-xl text-xs text-muted">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Target: {report.target ? `${report.target.model_id} (${report.target.model_version ?? "version unavailable"}) via ${report.target.type}` : "built-in synthetic model"}. Baseline rejection {report.baseline_rejection_rate === null ? "unavailable" : `${(report.baseline_rejection_rate * 100).toFixed(1)}%`} over {report.baseline_profiles} completed profiles. Method: {report.method}. Threshold flags are statistical prompts, not proof of discrimination.</p>
        </div>
        <div className="flex items-start gap-2 p-3 bg-caution-soft border border-caution/20 rounded-xl text-xs text-caution">
          <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p className="font-semibold">{report.disclosure}</p>
        </div>
        {seal && <p className="text-xs text-muted break-all">Sealed report #{seal.sequence} · SHA-256 {seal.report_hash}</p>}
      </div>
    </section>
  );
}
