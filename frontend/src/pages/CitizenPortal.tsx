/**
 * Citizen portal.
 *
 * Synthetic-model audit panel for the SENTINEL demonstration. Allows users to input
 * custom application parameters to test for data memorization leaks in real time,
 * demonstrating how the LiRA engine detects specific memorized individuals.
 */

import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import {
  api,
  ApiError,
  type ExplainabilityReport,
  type MembershipReport,
  type PlainLanguage,
  type Sealed,
} from "../api/client";
import {
  FileDown,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Activity,
  FileText,
  Sparkles,
  HelpCircle,
  ArrowRight,
  Info,
  AlertCircle,
  FileSpreadsheet,
  Layers
} from "lucide-react";
import confetti from "canvas-confetti";
import { jsPDF } from "jspdf";
import { QRCodeSVG } from "qrcode.react";

// Planted canary defaults
const CANARY_DEFAULTS = {
  income: 221305.94,
  householdSize: 14,
  landAcres: 28.8,
  yearsAddress: 56.42,
  aadhaarSeeded: 0,
  docsComplete: 0,
  priorSchemes: 8,
  age: 93.81,
  label: 0
};

type Result =
  | { kind: "membership"; plain: PlainLanguage; report: MembershipReport; sealed: Sealed }
  | {
      kind: "explainability";
      plain: PlainLanguage;
      report: ExplainabilityReport;
      sealed: Sealed;
    };

export function CitizenPortal() {
  const { t } = useLanguage();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);

  // Form states
  const [income, setIncome] = useState(CANARY_DEFAULTS.income);
  const [householdSize, setHouseholdSize] = useState(CANARY_DEFAULTS.householdSize);
  const [landAcres, setLandAcres] = useState(CANARY_DEFAULTS.landAcres);
  const [yearsAddress, setYearsAddress] = useState(CANARY_DEFAULTS.yearsAddress);
  const [aadhaarSeeded, setAadhaarSeeded] = useState(CANARY_DEFAULTS.aadhaarSeeded);
  const [docsComplete, setDocsComplete] = useState(CANARY_DEFAULTS.docsComplete);
  const [priorSchemes, setPriorSchemes] = useState(CANARY_DEFAULTS.priorSchemes);
  const [age, setAge] = useState(CANARY_DEFAULTS.age);
  const [label, setLabel] = useState(CANARY_DEFAULTS.label);

  const prefillCanary = () => {
    setIncome(CANARY_DEFAULTS.income);
    setHouseholdSize(CANARY_DEFAULTS.householdSize);
    setLandAcres(CANARY_DEFAULTS.landAcres);
    setYearsAddress(CANARY_DEFAULTS.yearsAddress);
    setAadhaarSeeded(CANARY_DEFAULTS.aadhaarSeeded);
    setDocsComplete(CANARY_DEFAULTS.docsComplete);
    setPriorSchemes(CANARY_DEFAULTS.priorSchemes);
    setAge(CANARY_DEFAULTS.age);
    setLabel(CANARY_DEFAULTS.label);
  };

  const prefillClean = () => {
    // A standard candidate that was not memorized by the model
    setIncome(45000.0);
    setHouseholdSize(4);
    setLandAcres(1.2);
    setYearsAddress(8.5);
    setAadhaarSeeded(1);
    setDocsComplete(1);
    setPriorSchemes(1);
    setAge(34.0);
    setLabel(1); // Approved
  };

  // Confetti trigger
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  async function runMembershipAudit(customRecord?: number[], customLabel?: number) {
    const activeRecord = customRecord || [
      income,
      householdSize,
      landAcres,
      yearsAddress,
      aadhaarSeeded,
      docsComplete,
      priorSchemes,
      age
    ];
    const activeLabel = customLabel !== undefined ? customLabel : label;

    setBusy("membership");
    setError(null);
    setResult(null);
    setShowTechnical(false);

    try {
      const { report, sealed } = await api.auditMembership(
        activeRecord,
        activeLabel,
        "applicant-query",
      );
      setResult({ kind: "membership", plain: report.plain_language, report, sealed });
      triggerConfetti();
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

  async function runExplainabilityAudit() {
    setBusy("explainability");
    setError(null);
    setResult(null);
    setShowTechnical(false);
    try {
      const { report, sealed } = await api.auditExplainability();
      setResult({ kind: "explainability", plain: report.plain_language, report, sealed });
      triggerConfetti();
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

  // Export the actual API result with an explicit synthetic-demo limitation.
  const handleDownloadPDF = (res: Result) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Draw borders
    doc.setDrawColor(140, 47, 30); // Deep red
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 277);
    doc.rect(12, 12, 186, 273);

    // Title Block
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(28, 26, 23);
    doc.text("SYNTHETIC MODEL AUDIT REPORT", 20, 30);

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(107, 101, 92);
    doc.text("SENTINEL demonstration · synthetic stand-in model only", 20, 36);

    // Divider
    doc.setDrawColor(226, 221, 212);
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    // Metadata
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(28, 26, 23);
    doc.text(`Seal Index Ref: #SEAL-${res.sealed.sequence}`, 20, 50);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 55);
    doc.text("Target: locally trained synthetic welfare eligibility model", 20, 60);

    // Cryptographic seal block
    doc.setFillColor(243, 239, 232);
    doc.rect(20, 68, 170, 30, "F");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(140, 47, 30);
    doc.text("REPORT INTEGRITY METADATA", 25, 75);

    doc.setFont("Courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(66, 61, 54);
    doc.text(`Payload Hash: ${res.sealed.report_hash}`, 25, 82);
    doc.text(`Signature: ${res.sealed.signature}`, 25, 87, { maxWidth: 158 });
    doc.text("Signing algorithm: Ed25519", 25, 94);

    // Findings section
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(28, 26, 23);
    doc.text("AUDIT FINDINGS SUMMARY", 20, 110);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("1. SYNTHETIC DEMO RESULT:", 20, 120);
    doc.setFont("Helvetica", "normal");
    doc.text(res.plain.what_we_found, 20, 126, { maxWidth: 170 });

    doc.setFont("Helvetica", "bold");
    doc.text("2. LIMITATION:", 20, 150);
    doc.setFont("Helvetica", "normal");
    doc.text(res.plain.what_it_means, 20, 156, { maxWidth: 170 });

    doc.setFont("Helvetica", "bold");
    doc.text("3. INTERPRETATION:", 20, 185);
    doc.setFont("Helvetica", "normal");
    doc.text(res.plain.what_you_can_do, 20, 191, { maxWidth: 170 });

    doc.setFont("Helvetica", "bold");
    doc.text("4. METHOD AND UNCERTAINTY:", 20, 215);
    doc.setFont("Helvetica", "normal");
    doc.text(res.plain.how_sure_are_we, 20, 221, { maxWidth: 170 });

    // Footer divider
    doc.setDrawColor(226, 221, 212);
    doc.line(20, 240, 190, 240);

    // Verification portal
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("IMPORTANT", 20, 248);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 101, 92);
    doc.text("This is not a government audit, certification, or evidence about a real person.", 20, 254);
    doc.text("The signature covers report integrity; it does not establish that the finding is true.", 20, 259);

    // Signatures
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(28, 26, 23);
    doc.text("SENTINEL demo", 130, 265);

    doc.save(`sentinel-demo-report-${res.sealed.sequence}.pdf`);
  };

  // jsPDF - Right to Information (RTI) Application Generator
  const handleDownloadRTI = (res: Result) => {
    const doc = new jsPDF();
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RTI APPLICATION — EDITABLE DRAFT", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text("Starting template only · review and complete before use", 105, 26, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text("To,", 20, 40);
    doc.text("The Public Information Officer,", 20, 45);
    doc.text("[Department / public authority — confirm the responsible office]", 20, 50, { maxWidth: 170 });

    doc.setFont("Helvetica", "bold");
    doc.text("Subject: Records about [scheme / service / decision process]", 20, 68, { maxWidth: 170 });

    doc.setFont("Helvetica", "normal");
    doc.text("Sir/Madam,", 20, 78);
    doc.text("Please provide the following records, if held by your public authority:", 20, 84);

    // Particulars of information
    doc.rect(20, 90, 170, 110);
    doc.setFont("Helvetica", "bold");
    doc.text("Details of Information Requested:", 25, 98);
    
    doc.setFont("Helvetica", "normal");
    const lines = [
      "1. Does the public authority use an automated or algorithmic tool in [identify the service / process]? If so, provide its name and stated purpose.",
      "2. Provide copies of policies or notices describing how such a tool informs decisions and how a person can request human review.",
      "3. Provide the published procedure for correcting an error or appealing a decision in this service.",
      "4. [Add a specific, factual request for records. Avoid unnecessary sensitive personal data.]",
    ];

    let y = 106;
    lines.forEach(line => {
      const splitText = doc.splitTextToSize(line, 160);
      doc.text(splitText, 25, y);
      y += splitText.length * 5 + 2;
    });

    // Fee
    doc.setFont("Helvetica", "bold");
    doc.text("Applicant details (complete locally):", 20, 210);
    doc.setFont("Helvetica", "normal");
    doc.text("Name / contact / postal address: [fill in]", 20, 217);

    doc.text("Date: __________________   Signature: __________________", 20, 229);
    doc.setFontSize(8);
    doc.text("Before filing, check the correct PIO, current fee or exemption, submission method, and applicable rules.", 20, 240, { maxWidth: 170 });
    doc.text("This template does not assert that a particular service uses AI or that SENTINEL audited it.", 20, 248, { maxWidth: 170 });
    doc.text(`Synthetic demo reference for your own notes only: #SEAL-${res.sealed.sequence}`, 20, 258);

    doc.save(`sentinel-rti-draft-${res.sealed.sequence}.pdf`);
  };

  return (
    <>
      {/* Demo context */}
      <div className="flex items-center justify-between bg-accent px-5 py-2.5 rounded-t-2xl text-white text-[0.68rem] font-bold uppercase tracking-wider">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-brand-gold" />
          <span>Synthetic public-service model demonstration</span>
        </div>
        <span className="bg-brand-gold/20 border border-brand-gold/30 text-brand-gold px-2.5 py-0.5 rounded-full text-[0.62rem]">Not a certification</span>
      </div>

      <section className="bg-white border border-rule border-t-0 rounded-b-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-rule flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-5 h-5 text-brand-gold animate-pulse" />
              <h2 className="text-xl font-serif font-extrabold text-accent">{t.citizen_title}</h2>
            </div>
            <p className="text-sm text-muted max-w-xl leading-relaxed">
              {t.citizen_intro}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="tag-gold">LiRA Engine</span>
            <span className="tag-quiet">Wachter CF</span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Audit Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              onClick={() => { setShowCustomForm(false); void runMembershipAudit([CANARY_DEFAULTS.income, CANARY_DEFAULTS.householdSize, CANARY_DEFAULTS.landAcres, CANARY_DEFAULTS.yearsAddress, CANARY_DEFAULTS.aadhaarSeeded, CANARY_DEFAULTS.docsComplete, CANARY_DEFAULTS.priorSchemes, CANARY_DEFAULTS.age], CANARY_DEFAULTS.label); }}
              disabled={busy !== null}
              className="group text-left p-5 bg-paper border-2 border-rule rounded-2xl transition-all duration-300 hover:border-brand-gold/50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="p-2.5 bg-brand-gold-soft border border-brand-gold/20 rounded-xl w-fit mb-4 group-hover:bg-brand-gold group-hover:border-brand-gold transition-all duration-300">
                <KeyRound className="w-5 h-5 text-brand-gold group-hover:text-white transition-colors" />
              </div>
              <span className="block font-serif text-base font-bold text-accent mb-1">
                {busy === "membership" && !showCustomForm ? t.citizen_running : t.citizen_run_lira_btn}
              </span>
              <span className="text-sm text-muted leading-relaxed">
                Compares a test record with synthetic shadow-model references. This is a risk signal about the demo model, not proof about a real person.
              </span>
            </button>

            <button
              onClick={runExplainabilityAudit}
              disabled={busy !== null}
              className="group text-left p-5 bg-paper border-2 border-rule rounded-2xl transition-all duration-300 hover:border-brand-gold/50 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <div className="p-2.5 bg-brand-gold-soft border border-brand-gold/20 rounded-xl w-fit mb-4 group-hover:bg-brand-gold group-hover:border-brand-gold transition-all duration-300">
                <HelpCircle className="w-5 h-5 text-brand-gold group-hover:text-white transition-colors" />
              </div>
              <span className="block font-serif text-base font-bold text-accent mb-1">
                {busy === "explainability" ? t.citizen_running : t.citizen_run_perturb_btn}
              </span>
              <span className="text-sm text-muted leading-relaxed">
                Tests whether changing the feature named by the demo explanation changes the outcome. A no-flip result does not prove the reason was false.
              </span>
            </button>
          </div>

          {/* Sandbox Toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-rule">
            <p className="text-xs text-muted">Want to test custom citizen profiles?</p>
            <button
              onClick={() => { setShowCustomForm(!showCustomForm); setResult(null); }}
              className="flex items-center gap-1.5 text-xs font-bold text-brand-gold border border-brand-gold/30 bg-brand-gold-soft px-3 py-1.5 rounded-lg hover:bg-brand-gold hover:text-white transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {showCustomForm ? "Hide Sandbox" : "Open Diagnostic Sandbox"}
            </button>
          </div>

          {/* Sandbox Form */}
          {showCustomForm && (
            <div className="bg-paper-sunk border border-rule rounded-2xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-rule">
                <div>
                  <h3 className="font-serif font-bold text-sm text-accent">{t.citizen_input_heading}</h3>
                  <p className="text-[0.7rem] text-muted mt-0.5">Alter parameters to test memorization vs generalisation.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={prefillCanary} className="flex items-center gap-1.5 text-[0.7rem] font-bold px-2.5 py-1.5 bg-flag-soft border border-flag/20 text-flag rounded-lg hover:bg-flag/10 cursor-pointer transition-colors">
                    <Sparkles className="w-3 h-3" /> Canary Preset
                  </button>
                  <button onClick={prefillClean} className="flex items-center gap-1.5 text-[0.7rem] font-bold px-2.5 py-1.5 bg-clear-soft border border-clear/20 text-clear rounded-lg hover:bg-clear/10 cursor-pointer transition-colors">
                    <CheckCircle2 className="w-3 h-3" /> Clean Preset
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {[
                  { label: t.citizen_income_label, value: income, setValue: (v: number) => setIncome(v), type: "number", step: 1000 },
                  { label: t.citizen_household_label, value: householdSize, setValue: (v: number) => setHouseholdSize(v), type: "number", step: 1 },
                  { label: t.citizen_land_label, value: landAcres, setValue: (v: number) => setLandAcres(v), type: "number", step: 0.1 },
                  { label: t.citizen_years_label, value: yearsAddress, setValue: (v: number) => setYearsAddress(v), type: "number", step: 1 },
                  { label: t.citizen_prior_label, value: priorSchemes, setValue: (v: number) => setPriorSchemes(v), type: "number", step: 1 },
                  { label: t.citizen_age_label, value: age, setValue: (v: number) => setAge(v), type: "number", step: 1 },
                ].map(f => (
                  <label key={f.label} className="flex flex-col gap-1">
                    <span className="rule-label">{f.label}</span>
                    <input type={f.type} value={f.value} step={f.step}
                      onChange={e => f.setValue(parseFloat(e.target.value) || 0)}
                      className="field text-sm" />
                  </label>
                ))}
                <label className="flex flex-col gap-1">
                  <span className="rule-label">{t.citizen_aadhaar_label}</span>
                  <select value={aadhaarSeeded} onChange={e => setAadhaarSeeded(parseInt(e.target.value))} className="field text-sm">
                    <option value={1}>Yes</option><option value={0}>No</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="rule-label">{t.citizen_docs_label}</span>
                  <select value={docsComplete} onChange={e => setDocsComplete(parseInt(e.target.value))} className="field text-sm">
                    <option value={1}>Yes</option><option value={0}>No</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-rule">
                <label className="flex items-center gap-2 text-xs font-bold">
                  <span className="text-muted">Stated Outcome:</span>
                  <select value={label} onChange={e => setLabel(parseInt(e.target.value))} className="field text-xs py-1">
                    <option value={0}>Rejected</option>
                    <option value={1}>Approved</option>
                  </select>
                </label>
                <button onClick={() => runMembershipAudit()} disabled={busy !== null}
                  className="btn-primary rounded-xl cursor-pointer">
                  {busy === "membership" ? "Auditing..." : "Run Privacy Audit"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="callout-flag rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-flag mt-0.5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      {result && (
        <section className="bg-white border border-rule rounded-2xl shadow-sm overflow-hidden">
          {/* Result Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-rule bg-paper">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-gold animate-bounce" />
              <h2 className="text-lg font-serif font-extrabold text-accent">Synthetic Demo Report</h2>
            </div>
            <span className="font-mono text-xs bg-accent text-white px-3 py-1 rounded-full">
              #SEAL-{result.sealed.sequence}
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* M1 z-score gauge */}
            {result.kind === "membership" && (
              <div className="bg-paper-sunk border border-rule rounded-2xl p-5 space-y-4">
                <h3 className="font-serif font-bold text-base text-accent flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-gold" /> Data Memorisation Test
                </h3>
                {result.report.findings.map(finding => {
                  const z = finding.memorization_z;
                  const pct = Math.min(100, Math.max(0, (z / 8) * 100));
                  const isCrit = z > 4, isWarn = z <= 4 && z > 2;
                  const barColor = isCrit ? "bg-flag" : isWarn ? "bg-caution" : "bg-clear";
                  const badge = isCrit ? "tag-flag" : isWarn ? "tag-caution" : "tag-clear";
                  return (
                    <div key={finding.record_id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-ink-soft">Canary Record Z-Score</span>
                        <span className={badge}>{finding.verdict}</span>
                      </div>
                      <div className="h-3 bg-rule-strong rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full transition-all duration-1000`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex justify-between text-[0.65rem] text-muted font-mono">
                        <span>z=0 Safe</span><span>z=2 Risk</span><span>z=4 Danger</span><span>z=8 Extreme</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white border border-rule rounded-xl">
                          <span className="rule-label block mb-1">Z-Score</span>
                          <span className="text-2xl font-mono font-extrabold text-ink">{z.toFixed(2)}</span>
                        </div>
                        <div className="p-3 bg-white border border-rule rounded-xl">
                          <span className="rule-label block mb-1">Decoy Gap</span>
                          <span className="text-2xl font-mono font-extrabold text-ink">{finding.decoy_separation !== null ? finding.decoy_separation.toFixed(3) : "—"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* M2 mismatch bars */}
            {result.kind === "explainability" && (
              <div className="bg-paper-sunk border border-rule rounded-2xl p-5 space-y-4">
                <h3 className="font-serif font-bold text-base text-accent flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-flag" /> Explanation Mismatch Analysis
                </h3>
                <p className="text-xs text-muted">For each stated reason, the report shows how often changing only that feature did not flip the synthetic model&apos;s decision.</p>
                <div className="space-y-3">
                  {result.report.per_feature.map(f => {
                    const rate = f.mismatch_rate * 100;
                    const flagged = rate >= 15;
                    const barColor = flagged ? "bg-flag" : rate >= 5 ? "bg-caution" : "bg-clear";
                    return (
                      <div key={f.feature} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-ink-soft">{f.citizen_label}</span>
                          <span className={flagged ? "text-flag" : "text-muted"}>{rate.toFixed(1)}% no-flip</span>
                        </div>
                        <div className="h-2 bg-rule rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${Math.min(rate, 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Verdict */}
            <dl className="plain-answer rounded-xl">
              <dt className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />What we found</dt>
              <dd>{result.plain.what_we_found}</dd>
              <dt className="flex items-center gap-1.5 mt-4"><Info className="w-4 h-4" />What it means</dt>
              <dd>{result.plain.what_it_means}</dd>
              <dt className="flex items-center gap-1.5 mt-4"><ArrowRight className="w-4 h-4" />What you can do</dt>
              <dd>{result.plain.what_you_can_do}</dd>
              <dt className="flex items-center gap-1.5 mt-4"><Activity className="w-4 h-4" />Confidence</dt>
              <dd className="italic">{result.plain.how_sure_are_we}</dd>
            </dl>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-rule">
              <button onClick={() => handleDownloadPDF(result)} className="btn-primary rounded-xl flex items-center gap-2 cursor-pointer">
                <FileDown className="w-4 h-4" /> Download Certificate (PDF)
              </button>
              {result.kind === "explainability" && (
                <button onClick={() => handleDownloadRTI(result)} className="btn-quiet border-flag text-flag hover:bg-flag-soft rounded-xl flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" /> Generate RTI Form
                </button>
              )}
              <div className="ml-auto flex items-center gap-3">
                <span className="text-xs text-muted hidden md:block">Verify authenticity:</span>
                <QRCodeSVG value={`${window.location.origin}/?tab=verify&report=${result.sealed.sequence}`} size={44} className="border-2 border-rule p-1 rounded-lg bg-white" />
              </div>
            </div>

            {/* Technical toggle */}
            <div className="pt-3 border-t border-rule">
              <button className="text-xs font-semibold text-brand-gold underline underline-offset-2 cursor-pointer hover:text-accent flex items-center gap-1"
                onClick={() => setShowTechnical(s => !s)}>
                {showTechnical ? "Hide" : "Show"} technical details
              </button>
              {showTechnical && <TechnicalDetail result={result} />}
            </div>
          </div>
        </section>
      )}
    </>
  );
}


function TechnicalDetail({ result }: { result: Result }) {
  if (result.kind === "membership") {
    const finding = result.report.findings[0];
    return (
      <div className="mt-4 p-4 bg-paper-sunk rounded border border-rule text-xs space-y-2">
        <h4 className="font-bold font-mono">M1 Statistical Parameters:</h4>
        <table className="sheet-table">
          <tbody>
            <Row label="Memorization z-score" value={finding.memorization_z.toFixed(2)} />
            <Row label="One-sided tail probability" value={finding.p_value.toExponential(2)} />
            <Row label="Reference shadow models trained" value={String(finding.shadow_models)} />
            <Row
              label="Decoy control group mean score"
              value={finding.decoy_mean_score?.toFixed(4) ?? "—"}
            />
            <Row label="Total queries sent to target" value={String(result.report.queries_used)} />
          </tbody>
        </table>
        <p className="text-[0.7rem] text-muted italic leading-relaxed pt-2">
          Method: {result.report.method}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-paper-sunk rounded border border-rule text-xs space-y-2">
      <h4 className="font-bold font-mono">M2 Explanation Parameters:</h4>
      <table className="sheet-table">
        <thead>
          <tr>
            <th className="text-left">Feature</th>
            <th className="text-right">Cases Tested</th>
            <th className="text-right">No-flip Rate</th>
            <th className="text-right">95% Confidence Interval</th>
          </tr>
        </thead>
        <tbody>
          {result.report.per_feature.map((feature) => (
            <tr key={feature.feature}>
              <td>{feature.citizen_label}</td>
              <td className="text-right">{feature.cases_tested}</td>
              <td className="text-right font-semibold">
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
      <p className="text-[0.7rem] text-muted italic leading-relaxed pt-2">
        Method: {result.report.method}. Scope: {result.report.scope}.
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
