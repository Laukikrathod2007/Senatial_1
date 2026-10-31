import React, { useEffect, useMemo, useState } from "react";
import {
  api, ApiError, type AuditCase, type CaseAccessState,
  type CaseEvidenceSource, type CaseRun, type ExecutionStatus
} from "../api/client";
import { useLanguage } from "../i18n/LanguageContext";
import { getLocalizedDraftTemplate } from "../i18n/translations";
import { Activity, ArrowLeft, ClipboardCheck, Plus, ShieldAlert, Trash2 } from "lucide-react";

function statusClass(status: ExecutionStatus) {
  if (status === "COMPLETED") return "case-status case-status-complete";
  if (status === "FAILED" || status === "ACCESS_DENIED" || status === "QUOTA_EXCEEDED") return "case-status case-status-failed";
  if (status === "RUNNING" || status === "DEGRADED") return "case-status case-status-warning";
  return "case-status";
}

export function CaseWorkspace() {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<AuditCase[]>([]);
  const [selected, setSelected] = useState<AuditCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variant, setVariant] = useState<"clean" | "known_flawed">("known_flawed");
  const [verification, setVerification] = useState<string | null>(null);
  const [copyVerification, setCopyVerification] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    target_name: "",
    investigation_question: "",
    evidence_source: "citizen_or_ngo_report" as CaseEvidenceSource,
    provenance_note: "",
    evidence_reference: "",
    access_state: "not_provided" as CaseAccessState,
  });
  const [reviewNotes, setReviewNotes] = useState("");
  const [draft, setDraft] = useState("");
  const [ownerResponse, setOwnerResponse] = useState("");
  const [remediation, setRemediation] = useState<AuditCase["remediation_status"]>("not_contacted");

  const latestRun = useMemo(() => selected?.runs.at(-1) ?? null, [selected]);

  const sourceLabels: Record<CaseEvidenceSource, string> = {
    citizen_or_ngo_report: t("source_citizen_or_ngo_report", "Citizen or NGO report"),
    public_document: t("source_public_document", "Public document"),
    public_interface: t("source_public_interface", "Public-facing interface"),
    authorised_dataset: t("source_authorised_dataset", "Authorised dataset"),
    synthetic_demo: t("source_synthetic_demo", "SENTINEL synthetic demonstration"),
    other: t("source_other", "Other source"),
  };

  const accessLabels: Record<CaseAccessState, string> = {
    not_provided: t("access_not_provided", "Not provided"),
    public_source: t("access_public_source", "Public source"),
    consent_recorded: t("access_consent_recorded", "Consent recorded"),
    written_authority: t("access_written_authority", "Written authority recorded"),
    denied: t("access_denied", "Access denied"),
    not_applicable: t("access_not_applicable", "Not applicable"),
  };

  const statusLabels: Record<ExecutionStatus, string> = {
    NOT_APPLICABLE: t("status_NOT_APPLICABLE", "Not applicable"),
    PREREQUISITE_MISSING: t("status_PREREQUISITE_MISSING", "Prerequisite missing"),
    ACCESS_DENIED: t("status_ACCESS_DENIED", "Access denied"),
    QUOTA_EXCEEDED: t("status_QUOTA_EXCEEDED", "Quota exceeded"),
    RUNNING: t("status_RUNNING", "Running"),
    COMPLETED: t("status_COMPLETED", "Completed"),
    FAILED: t("status_FAILED", "Failed"),
    DEGRADED: t("status_DEGRADED", "Degraded"),
    SUPERSEDED: t("status_SUPERSEDED", "Superseded"),
  };

  function displayDate(value: string) {
    const locale = language === "mr" ? "mr-IN" : language === "hi" ? "hi-IN" : "en-IN";
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
    } catch {
      return new Date(value).toLocaleString();
    }
  }

  async function refreshCases() {
    const next = await api.cases();
    setItems(next);
    return next;
  }

  async function openCase(caseId: string) {
    setError(null);
    setVerification(null);
    const detail = await api.auditCase(caseId);
    setSelected(detail);
    setReviewNotes(detail.human_review_notes);
    setDraft(detail.rti_draft);
    setOwnerResponse(detail.system_owner_response);
    setRemediation(detail.remediation_status);
  }

  useEffect(() => {
    let active = true;
    api.cases().then((next) => {
      if (active) setItems(next);
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof ApiError ? caught.message : t("cases_loading", "Could not load audit cases."));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [t]);

  async function createCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api.createCase(form);
      await refreshCases();
      setForm({
        title: "", target_name: "", investigation_question: "",
        evidence_source: "citizen_or_ngo_report", provenance_note: "",
        evidence_reference: "", access_state: "not_provided",
      });
      await openCase(created.case_id);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not create the case.");
    } finally {
      setBusy(false);
    }
  }

  async function runFixture() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setVerification(null);
    try {
      const run: CaseRun = await api.runCaseFixture(selected.case_id, variant);
      const updated = await api.auditCase(selected.case_id);
      setSelected(updated);
      setItems(await api.cases());
      if (run.execution_status !== "COMPLETED") {
        setError(run.error_message ?? "The fixture test did not complete.");
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not run the controlled fixture test.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCaseChanges(extra: Partial<Pick<AuditCase, "human_review_status">> = {}) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateCase(selected.case_id, {
        human_review_notes: reviewNotes,
        rti_draft: draft,
        system_owner_response: ownerResponse,
        remediation_status: remediation,
        ...extra,
      });
      setSelected(updated);
      setItems(await api.cases());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save case updates.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (!selected || !window.confirm(t("draft_confirm_delete", "Delete this case and its private case notes? Its synthetic signed reports remain in the public integrity ledger."))) return;
    setBusy(true);
    try {
      await api.deleteCase(selected.case_id);
      setSelected(null);
      setItems(await api.cases());
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete this case.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyLatest() {
    const sequence = latestRun?.report_sequence;
    if (sequence == null) return;
    setVerification(language === "mr" ? "स्वाक्षरी केलेला अहवाल पडताळत आहे..." : language === "hi" ? "हस्ताक्षरित रिपोर्ट की जांच की जा रही है..." : "Checking the signed report...");
    try {
      const result = await api.verifyReport(sequence);
      if (result.valid) {
        setVerification(
          language === "mr"
            ? `अहवाल #${sequence} अखंड आहे आणि त्याची Ed25519 डिजिटल स्वाक्षरी वैध आहे. (हे निष्कर्षाचे कायदेशीर समर्थन करत नाही)`
            : language === "hi"
            ? `रिपोर्ट #${sequence} अखंड है और इसका Ed25519 डिजिटल हस्ताक्षर मान्य है। (यह निष्कर्ष की कानूनी पुष्टि नहीं करता)`
            : `Report ${sequence} is intact and its signature is valid. This does not prove the finding is true or official.`
        );
      } else {
        setVerification(
          language === "mr"
            ? `पडताळणी अयशस्वी: ${result.reason}`
            : language === "hi"
            ? `सत्यापन विफल: ${result.reason}`
            : `Verification failed: ${result.reason}`
        );
      }
    } catch (caught) {
      setVerification(caught instanceof ApiError ? caught.message : "Could not verify this report.");
    }
  }

  async function downloadSignedCopy() {
    const sequence = latestRun?.report_sequence;
    if (sequence == null) return;
    try {
      const copy = await api.signedReportCopy(sequence);
      const blob = new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `sentinel-signed-report-${sequence}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not download the signed report copy.");
    }
  }

  async function verifyUploadedCopy(file: File) {
    setCopyVerification(language === "mr" ? "अहवाल प्रत पडताळत आहे..." : language === "hi" ? "रिपोर्ट प्रति की जांच जारी है..." : "Checking the report copy...");
    try {
      if (file.size > 1_000_000) {
        throw new Error(language === "mr" ? "कृपया १ MB पेक्षा लहान JSON फाईल निवडा." : language === "hi" ? "कृपया 1 MB से छोटी JSON फाइल चुनें।" : "Choose a JSON file smaller than 1 MB.");
      }
      const parsed = JSON.parse(await file.text());
      const result = await api.verifyReportCopy(parsed);
      if (result.valid) {
        setCopyVerification(
          language === "mr"
            ? `प्रतीचा हॅश व स्वाक्षरी वैध आहे. ${result.reason}`
            : language === "hi"
            ? `प्रति की हैश और डिजिटल हस्ताक्षर मान्य हैं। ${result.reason}`
            : `Copy hash and signature are valid. ${result.reason}`
        );
      } else {
        setCopyVerification(
          language === "mr"
            ? `प्रत नाकारली: ${result.reason}`
            : language === "hi"
            ? `प्रति अस्वीकृत: ${result.reason}`
            : `Copy rejected: ${result.reason}`
        );
      }
    } catch (caught) {
      setCopyVerification(caught instanceof ApiError || caught instanceof Error ? caught.message : "Could not verify this report copy.");
    }
  }

  const fieldClass = "field w-full";
  const labelClass = "block text-sm font-semibold text-ink mb-1.5";

  return (
    <section className="case-workspace space-y-6" aria-labelledby="case-workspace-title">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
        <div className="max-w-3xl">
          <h2 id="case-workspace-title" className="text-2xl font-serif font-bold text-accent">
            {t("cases_title", "Audit cases")}
          </h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            {t("cases_subtitle", "Record a concern and where it came from, see which checks are actually possible, and keep findings, review, and follow-up together.")}
          </p>
        </div>
        {selected && (
          <button type="button" className="btn-quiet flex items-center gap-2 cursor-pointer" onClick={() => { setSelected(null); setError(null); }}>
            <ArrowLeft className="h-4 w-4" /> {t("cases_all_button", "All cases")}
          </button>
        )}
      </header>

      <div className="rounded-xl border border-caution/30 bg-caution-soft px-4 py-3 text-sm leading-relaxed text-ink">
        <strong>{t("cases_evidence_boundary_title", "Evidence boundary:")}</strong>{" "}
        {t("cases_evidence_boundary_desc", "this demo stores case notes and provenance in the local database, but it does not accept evidence files or connect to a government service. Do not enter Aadhaar numbers, bank details, health records, or other sensitive personal data. Fixture results are fictional.")}
      </div>

      {error && (
        <div className="callout-flag flex items-start gap-2 rounded-lg" role="alert">
          <ShieldAlert className="mt-0.5 h-4 w-4 flex-none" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!selected ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <form className="space-y-4" onSubmit={createCase}>
            <h3 className="text-lg font-bold text-ink">{t("cases_start_title", "Start a case")}</h3>
            
            <label className="block">
              <span className={labelClass}>{t("cases_field_title", "Case title")}</span>
              <input
                className={fieldClass}
                required
                minLength={4}
                maxLength={120}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder={t("cases_field_title_placeholder", "A short, factual name for this concern")}
              />
            </label>

            <label className="block">
              <span className={labelClass}>{t("cases_field_target", "Target or service being investigated")}</span>
              <input
                className={fieldClass}
                required
                minLength={2}
                maxLength={160}
                value={form.target_name}
                onChange={(event) => setForm({ ...form, target_name: event.target.value })}
                placeholder={t("cases_field_target_placeholder", "Name the service, agency, or synthetic scenario")}
              />
            </label>

            <label className="block">
              <span className={labelClass}>{t("cases_field_question", "Investigation question")}</span>
              <textarea
                className={`${fieldClass} min-h-24`}
                required
                minLength={8}
                maxLength={2000}
                value={form.investigation_question}
                onChange={(event) => setForm({ ...form, investigation_question: event.target.value })}
                placeholder={t("cases_field_question_placeholder", "What specific uncertainty are you trying to resolve?")}
              />
            </label>

            <label className="block">
              <span className={labelClass}>{t("cases_field_source", "Evidence source")}</span>
              <select
                className={fieldClass}
                value={form.evidence_source}
                onChange={(event) => setForm({ ...form, evidence_source: event.target.value as CaseEvidenceSource })}
              >
                {Object.entries(sourceLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className={labelClass}>{t("cases_field_provenance", "Provenance note")}</span>
              <textarea
                className={`${fieldClass} min-h-20`}
                maxLength={1500}
                value={form.provenance_note}
                onChange={(event) => setForm({ ...form, provenance_note: event.target.value })}
                placeholder={t("cases_field_provenance_placeholder", "Who supplied it, when, and how was it obtained? Describe the source; do not paste the record.")}
              />
            </label>

            <label className="block">
              <span className={labelClass}>
                {t("cases_field_reference", "Reference or source identifier")}{" "}
                <span className="font-normal text-muted">{t("cases_field_reference_optional", "(optional)")}</span>
              </span>
              <input
                className={fieldClass}
                maxLength={600}
                value={form.evidence_reference}
                onChange={(event) => setForm({ ...form, evidence_reference: event.target.value })}
                placeholder={t("cases_field_reference_placeholder", "A public URL, publication title, or your own redacted reference code")}
              />
            </label>

            <label className="block">
              <span className={labelClass}>{t("cases_field_access", "Permission or access state")}</span>
              <select
                className={fieldClass}
                value={form.access_state}
                onChange={(event) => setForm({ ...form, access_state: event.target.value as CaseAccessState })}
              >
                {Object.entries(accessLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted">
                {t("cases_field_access_hint", "This records what you report. SENTINEL does not verify consent or legal authority.")}
              </span>
            </label>

            <button className="btn-primary flex min-h-11 items-center gap-2 cursor-pointer" type="submit" disabled={busy}>
              <Plus className="h-4 w-4" />
              {busy ? t("cases_creating_btn", "Creating case…") : t("cases_create_btn", "Create case")}
            </button>
          </form>

          <aside aria-labelledby="saved-cases-heading">
            <div className="flex items-baseline justify-between gap-3 pb-3">
              <h3 id="saved-cases-heading" className="text-lg font-bold text-ink">{t("cases_list_heading", "Your cases")}</h3>
              <span className="text-sm tabular text-muted">{items.length}</span>
            </div>
            {loading ? (
              <p className="py-6 text-sm text-muted">{t("cases_loading", "Loading cases…")}</p>
            ) : items.length === 0 ? (
              <div className="border-y border-rule py-6">
                <p className="font-semibold">{t("cases_empty_title", "No cases have been created.")}</p>
                <p className="mt-1 text-sm text-muted">{t("cases_empty_desc", "Start with a specific question and record where the information came from.")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-rule border-y border-rule">
                {items.map((item) => (
                  <li key={item.case_id}>
                    <button
                      type="button"
                      onClick={() => void openCase(item.case_id).catch((caught: unknown) => setError(caught instanceof ApiError ? caught.message : "Could not load this case."))}
                      className="group w-full py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold cursor-pointer"
                    >
                      <span className="block font-semibold text-ink group-hover:text-accent">{item.title}</span>
                      <span className="mt-1 block text-sm text-muted">{item.target_name} · {sourceLabels[item.evidence_source]}</span>
                      <span className="mt-1 block text-xs text-muted">{t("cases_created_on", "Created")} {displayDate(item.created_at)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      ) : (
        <CaseDetail
          item={selected}
          latestRun={latestRun}
          variant={variant}
          busy={busy}
          reviewNotes={reviewNotes}
          draft={draft}
          ownerResponse={ownerResponse}
          remediation={remediation}
          verification={verification}
          sourceLabels={sourceLabels}
          accessLabels={accessLabels}
          statusLabels={statusLabels}
          displayDate={displayDate}
          onVariant={setVariant}
          onRun={() => void runFixture()}
          onReviewNotes={setReviewNotes}
          onDraft={setDraft}
          onOwnerResponse={setOwnerResponse}
          onRemediation={setRemediation}
          onSave={saveCaseChanges}
          onGenerateDraft={() => {
            if (draft.trim() && !window.confirm(t("draft_confirm_replace", "Generating another template replaces the draft currently shown. Continue?"))) return;
            setDraft(getLocalizedDraftTemplate(selected, "rti", language));
            setRemediation("draft_prepared");
          }}
          onGenerateGrievance={() => {
            if (draft.trim() && !window.confirm(t("draft_confirm_replace", "Generating another template replaces the draft currently shown. Continue?"))) return;
            setDraft(getLocalizedDraftTemplate(selected, "grievance", language));
            setRemediation("draft_prepared");
          }}
          onVerify={() => void verifyLatest()}
          onDownloadReport={() => void downloadSignedCopy()}
          onVerifyReportCopy={(file) => void verifyUploadedCopy(file)}
          copyVerification={copyVerification}
          onDelete={() => void deleteSelected()}
        />
      )}
    </section>
  );
}

function CaseDetail(props: {
  item: AuditCase;
  latestRun: CaseRun | null;
  variant: "clean" | "known_flawed";
  busy: boolean;
  reviewNotes: string;
  draft: string;
  ownerResponse: string;
  remediation: AuditCase["remediation_status"];
  verification: string | null;
  copyVerification: string | null;
  sourceLabels: Record<CaseEvidenceSource, string>;
  accessLabels: Record<CaseAccessState, string>;
  statusLabels: Record<ExecutionStatus, string>;
  displayDate: (val: string) => string;
  onVariant: (value: "clean" | "known_flawed") => void;
  onRun: () => void;
  onReviewNotes: (value: string) => void;
  onDraft: (value: string) => void;
  onOwnerResponse: (value: string) => void;
  onRemediation: (value: AuditCase["remediation_status"]) => void;
  onSave: (extra?: Partial<Pick<AuditCase, "human_review_status">>) => Promise<void>;
  onGenerateDraft: () => void;
  onGenerateGrievance: () => void;
  onVerify: () => void;
  onDownloadReport: () => void;
  onVerifyReportCopy: (file: File) => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const { item, latestRun, sourceLabels, accessLabels, statusLabels, displayDate } = props;
  const report = latestRun?.result?.report;
  const validation = report?.validation_against_known_fixtures;
  const labelClass = "block text-sm font-semibold text-ink mb-1.5";

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(250px,0.7fr)]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-bold text-ink">{item.title}</h3>
            <span className="rounded-full bg-paper-sunk px-2.5 py-1 text-xs text-muted">
              {item.human_review_status === "reviewed" ? t("detail_reviewed_badge", "Human reviewed") : t("detail_awaiting_badge", "Awaiting human review")}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink">{item.investigation_question}</p>
          <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div><dt className="text-xs text-muted">{t("detail_target_named", "Target named by case owner")}</dt><dd className="mt-1 text-sm font-semibold">{item.target_name}</dd></div>
            <div><dt className="text-xs text-muted">{t("detail_source", "Evidence source")}</dt><dd className="mt-1 text-sm font-semibold">{sourceLabels[item.evidence_source]}</dd></div>
            <div><dt className="text-xs text-muted">{t("detail_provenance", "Provenance")}</dt><dd className="mt-1 text-sm">{item.provenance_note || t("detail_provenance_empty", "Not recorded")}</dd></div>
            <div><dt className="text-xs text-muted">{t("detail_access_state", "Permission or access state")}</dt><dd className="mt-1 text-sm font-semibold">{accessLabels[item.access_state]}</dd></div>
            {item.evidence_reference && <div className="sm:col-span-2"><dt className="text-xs text-muted">{t("detail_reference", "Reference")}</dt><dd className="mt-1 break-all text-sm">{item.evidence_reference}</dd></div>}
          </dl>
        </div>
        <div className="border-l-2 border-brand-gold pl-4 text-sm leading-relaxed text-muted">
          <p className="font-semibold text-ink">{t("detail_proves_title", "What this case can currently prove")}</p>
          <p className="mt-2">{t("detail_proves_p1", "It can preserve the question and reported source, then demonstrate checks against SENTINEL’s own fictional rows. It has not tested the real service named above.")}</p>
          <p className="mt-2">{t("detail_proves_p2", "Notes are stored in local SQLite in plaintext and restricted by application owner checks. This is demo storage, not suitable for confidential beneficiary records.")}</p>
        </div>
      </section>

      <section aria-labelledby="prereq-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id="prereq-heading" className="text-lg font-bold text-ink">{t("prereq_heading", "What can run now")}</h3>
            <p className="mt-1 text-sm text-muted">{t("prereq_subheading", "Execution state is separate from the evidence status of a finding.")}</p>
          </div>
        </div>
        <ul className="mt-3 divide-y divide-rule border-y border-rule">
          {item.prerequisites.map((prereq) => (
            <li key={prereq.test_id} className="grid gap-2 py-3 md:grid-cols-[minmax(190px,0.8fr)_160px_minmax(0,1.5fr)] md:items-start">
              <span className="text-sm font-semibold">{prereq.label}</span>
              <span className={statusClass(prereq.execution_status)}>{statusLabels[prereq.execution_status]}</span>
              <span className="text-sm leading-relaxed text-muted">{prereq.reason}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-rule py-5" aria-labelledby="fixture-heading">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.5fr)] lg:items-end">
          <div>
            <h3 id="fixture-heading" className="text-lg font-bold text-ink">{t("fixture_heading", "Run controlled fixture checks")}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{t("fixture_desc", "Choose the clean control or the known-flawed fixture. This runs deterministic checks against 100 or 101 fictional rows. It does not use this case’s evidence or query a public service.")}</p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-44 flex-1">
              <span className={labelClass}>{t("fixture_variant_label", "Fixture variant")}</span>
              <select className="field w-full" value={props.variant} onChange={(event) => props.onVariant(event.target.value as "clean" | "known_flawed")}>
                <option value="known_flawed">{t("fixture_variant_flawed", "Known flawed control")}</option>
                <option value="clean">{t("fixture_variant_clean", "Clean control")}</option>
              </select>
            </label>
            <button type="button" className="btn-primary flex min-h-11 items-center gap-2 cursor-pointer" disabled={props.busy} onClick={props.onRun}>
              <Activity className="h-4 w-4" />{props.busy ? t("fixture_running_btn", "Running…") : t("fixture_run_btn", "Run fixture checks")}
            </button>
          </div>
        </div>

        {report && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  {t("fixture_result_title", "Fixture result")} · {report.target.variant === "known_flawed" ? t("fixture_result_flawed_tag", "known flawed") : t("fixture_result_clean_tag", "clean control")}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {t("fixture_overall_status", "Overall evidence state:")} <strong className="text-ink">{report.overall_evidentiary_status.replace(/_/g, " ")}</strong>. This is not an automated verdict.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-quiet flex items-center gap-2 cursor-pointer" onClick={props.onVerify}>
                  {t("fixture_verify_integrity_btn", "Verify report integrity")}
                </button>
                <button type="button" className="btn-quiet cursor-pointer" onClick={props.onDownloadReport}>
                  {t("fixture_download_signed_btn", "Download signed JSON")}
                </button>
              </div>
            </div>

            {props.verification && <p className="text-sm text-muted" role="status">{props.verification}</p>}

            <div className="space-y-2">
              <label className="block text-sm font-semibold">
                {t("fixture_verify_copy_label", "Verify a report JSON copy")}
                <input
                  className="mt-1 block max-w-full text-sm"
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) props.onVerifyReportCopy(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <p className="text-xs text-muted">{t("fixture_verify_copy_hint", "Verification checks integrity under this server’s configured key; it does not prove findings are true or independently establish who controls that key.")}</p>
              {props.copyVerification && <p className="text-sm text-muted" role="status">{props.copyVerification}</p>}
            </div>

            {validation && (
              <div className="grid gap-3 sm:grid-cols-3" aria-label="Validation against known synthetic fixture outcomes">
                <div className="border-l-2 border-accent pl-3">
                  <p className="text-xs text-muted">{t("fixture_val_known_detected", "Known defects detected")}</p>
                  <p className="mt-1 text-xl font-semibold tabular">{validation.detected_known_defects} / {validation.planted_defects}</p>
                </div>
                <div className="border-l-2 border-caution pl-3">
                  <p className="text-xs text-muted">{t("fixture_val_missed", "Missed in known flawed fixture")}</p>
                  <p className="mt-1 text-xl font-semibold tabular">{validation.missed_known_defects}</p>
                </div>
                <div className="border-l-2 border-clear pl-3">
                  <p className="text-xs text-muted">{t("fixture_val_clean_flags", "Flags on clean fixture")}</p>
                  <p className="mt-1 text-xl font-semibold tabular">{validation.false_alarm_criteria_on_clean_fixture}</p>
                </div>
              </div>
            )}
            {validation && <p className="text-xs text-muted">{t("fixture_val_disclaimer", "Counts apply only to these fixed fixtures. They are not general accuracy, sensitivity, or real-world false-alarm estimates.")}</p>}

            <div>
              <h4 className="text-sm font-bold text-ink">{t("fixture_executed_checks", "Executed checks")}</h4>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {report.test_results.map((result) => {
                  const criterion = report.criterion_definitions.find((item) => item.id === result.criterion_id);
                  return (
                    <li key={result.criterion_id} className="py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-ink">{criterion?.name ?? result.criterion_id}</span>
                        <span className="text-sm text-muted">{result.evidentiary_status.replace(/_/g, " ")}</span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed">{result.summary}</p>
                      {criterion && (
                        <details className="mt-2 text-sm text-muted">
                          <summary className="w-fit cursor-pointer font-semibold text-accent">{t("fixture_criterion_and_limits", "Criterion and limits")}</summary>
                          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                            <div><dt className="font-semibold text-ink">{t("fixture_criterion_source", "Source")}</dt><dd>{criterion.source}</dd></div>
                            <div><dt className="font-semibold text-ink">{t("fixture_criterion_comparison", "Comparison")}</dt><dd>{criterion.comparison}</dd></div>
                            <div><dt className="font-semibold text-ink">{t("fixture_criterion_threshold", "Threshold")}</dt><dd>{criterion.threshold} <strong>{criterion.threshold_type}</strong></dd></div>
                            <div><dt className="font-semibold text-ink">{t("fixture_criterion_input", "Required input")}</dt><dd>{criterion.required_inputs}</dd></div>
                            <div className="sm:col-span-2"><dt className="font-semibold text-ink">{t("fixture_criterion_supports", "What it supports")}</dt><dd>{criterion.conclusion_limit}</dd></div>
                          </dl>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <details className="text-sm">
              <summary className="w-fit cursor-pointer font-semibold text-accent">{t("fixture_reproducibility", "Reproducibility manifest")}</summary>
              <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div><dt className="text-xs text-muted">Target / version</dt><dd>{report.target.id} · {report.target.version} · {report.target.variant}</dd></div>
                <div><dt className="text-xs text-muted">Suite / seed</dt><dd>{report.reproducibility_manifest.test_suite_version} · {report.reproducibility_manifest.seed}</dd></div>
                <div><dt className="text-xs text-muted">Model queries</dt><dd>{report.reproducibility_manifest.query_count}</dd></div>
                <div><dt className="text-xs text-muted">Timestamp</dt><dd>{report.reproducibility_manifest.timestamps_utc.started} · locally generated, untrusted</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted">Test specification SHA-256</dt><dd className="break-all font-mono text-xs">{report.reproducibility_manifest.test_specification_sha256}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted">Dataset manifest SHA-256</dt><dd className="break-all font-mono text-xs">{report.reproducibility_manifest.dataset_manifest_sha256}</dd></div>
                <div className="sm:col-span-2"><dt className="text-xs text-muted">Source revision</dt><dd className="break-all font-mono text-xs">{report.reproducibility_manifest.source_revision}{report.reproducibility_manifest.working_tree_dirty ? " · working tree had changes" : ""}</dd></div>
              </dl>
            </details>
            <div className="rounded-lg bg-paper-sunk p-4">
              <h4 className="text-sm font-bold">{t("fixture_limitations", "Limitations")}</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                {report.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
              </ul>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-8 lg:grid-cols-2" aria-labelledby="review-heading">
        <div className="space-y-4">
          <div>
            <h3 id="review-heading" className="text-lg font-bold text-ink">{t("review_heading", "Human review and response")}</h3>
            <p className="mt-1 text-sm text-muted">{t("review_desc", "Record an interpretation or response without changing the signed result.")}</p>
          </div>
          <label className="block">
            <span className={labelClass}>{t("review_notes_label", "Reviewer notes")}</span>
            <textarea
              className="field min-h-28 w-full"
              maxLength={3000}
              value={props.reviewNotes}
              onChange={(event) => props.onReviewNotes(event.target.value)}
              placeholder={t("review_notes_placeholder", "What did a human reviewer conclude, and what remains uncertain?")}
            />
          </label>
          <label className="block">
            <span className={labelClass}>{t("review_owner_label", "System-owner response or follow-up")}</span>
            <textarea
              className="field min-h-24 w-full"
              maxLength={8000}
              value={props.ownerResponse}
              onChange={(event) => props.onOwnerResponse(event.target.value)}
              placeholder={t("review_owner_placeholder", "Record a reply only when one has actually been received.")}
            />
          </label>
          <label className="block">
            <span className={labelClass}>{t("review_remediation_label", "Follow-up status")}</span>
            <select className="field w-full" value={props.remediation} onChange={(event) => props.onRemediation(event.target.value as AuditCase["remediation_status"])}>
              <option value="not_contacted">{t("remed_not_contacted", "Not contacted")}</option>
              <option value="draft_prepared">{t("remed_draft_prepared", "Draft prepared")}</option>
              <option value="awaiting_response">{t("remed_awaiting_response", "Awaiting response")}</option>
              <option value="response_received">{t("remed_response_received", "Response received")}</option>
              <option value="action_reported">{t("remed_action_reported", "Action reported")}</option>
              <option value="no_action_reported">{t("remed_no_action_reported", "No action reported")}</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary cursor-pointer" disabled={props.busy} onClick={() => void props.onSave({ human_review_status: "reviewed" })}>
              <ClipboardCheck className="mr-2 inline h-4 w-4" />{t("review_save_reviewed_btn", "Save as human reviewed")}
            </button>
            <button type="button" className="btn-quiet cursor-pointer" disabled={props.busy} onClick={() => void props.onSave({ human_review_status: "unreviewed" })}>
              {t("review_save_notes_btn", "Save notes only")}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-ink">{t("draft_heading", "RTI or grievance draft")}</h3>
            <p className="mt-1 text-sm text-muted">{t("draft_desc", "The draft uses placeholders and asks for information; it does not claim the reported service made an error or file anything for you.")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-quiet cursor-pointer" onClick={props.onGenerateDraft}>
              {t("draft_gen_rti_btn", "Generate RTI information request")}
            </button>
            <button type="button" className="btn-quiet cursor-pointer" onClick={props.onGenerateGrievance}>
              {t("draft_gen_grievance_btn", "Generate grievance review draft")}
            </button>
          </div>
          <label className="block">
            <span className={labelClass}>{t("draft_editor_label", "Editable draft text (one draft at a time)")}</span>
            <textarea
              className="field min-h-80 w-full font-sans text-sm leading-relaxed"
              maxLength={12000}
              value={props.draft}
              onChange={(event) => props.onDraft(event.target.value)}
              placeholder={t("draft_editor_placeholder", "Generate either template, then verify and edit every placeholder.")}
            />
          </label>
          <button type="button" className="btn-primary cursor-pointer" disabled={props.busy || !props.draft.trim()} onClick={() => void props.onSave()}>
            {t("draft_save_btn", "Save draft and follow-up")}
          </button>
          <p className="text-xs leading-relaxed text-muted">{t("draft_legal_disclaimer", "Check the correct authority, current process, fee, and filing instructions yourself. This prototype does not give legal advice.")}</p>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
        <span className="text-xs text-muted">{t("cases_created_on", "Created")} {displayDate(item.created_at)} · {t("draft_private_notes_notice", "Private case notes are not included in signed reports.")}</span>
        <button type="button" className="btn-quiet text-flag cursor-pointer" disabled={props.busy} onClick={props.onDelete}>
          <Trash2 className="mr-1.5 inline h-4 w-4" />{t("draft_delete_btn", "Delete case notes")}
        </button>
      </footer>
    </div>
  );
}
