/**
 * Citizen portal.
 *
 * Redesigned to feel like an official MeitY (Ministry of Electronics and IT) 
 * sandboxed audit panel under the DPDP Act 2023. Allows citizens to input 
 * custom application parameters to test for data memorization leaks in real time,
 * demonstrating how the LiRA engine detects specific memorized individuals.
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
import {
  FileDown,
  KeyRound,
  QrCode,
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

  // jsPDF - Official Sealed Certificate
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
    doc.text("ALGORITHMIC AUDIT COMPLIANCE REPORT", 20, 30);

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(107, 101, 92);
    doc.text("MeitY Algorithmic Sandbox — Certified Digital Audit Ledger Instance", 20, 36);

    // Divider
    doc.setDrawColor(226, 221, 212);
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    // Metadata
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(28, 26, 23);
    doc.text(`Seal Index Ref: #SEAL-${res.sealed.sequence}`, 20, 50);
    doc.text(`Evaluation Date: ${new Date().toLocaleString()}`, 20, 55);
    doc.text(`Compliance Standard: India DPDP Act 2023 / IEEE Std 7003-2024`, 20, 60);

    // Cryptographic seal block
    doc.setFillColor(243, 239, 232);
    doc.rect(20, 68, 170, 30, "F");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(140, 47, 30);
    doc.text("OFFICIAL CRYPTOGRAPHIC WAX SEAL", 25, 75);

    doc.setFont("Courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(66, 61, 54);
    doc.text(`Payload Hash: ${res.sealed.report_hash}`, 25, 82);
    doc.text(`Signature:    ${res.sealed.signature.slice(0, 65)}...`, 25, 87);
    doc.text(`Key Algorithm: Ed25519 Elliptic Curve Ledger Node Signature`, 25, 92);

    // Findings section
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(28, 26, 23);
    doc.text("AUDIT FINDINGS SUMMARY", 20, 110);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("1. AUDITED VERDICT:", 20, 120);
    doc.setFont("Helvetica", "normal");
    doc.text(res.plain.what_we_found, 20, 126, { maxWidth: 170 });

    doc.setFont("Helvetica", "bold");
    doc.text("2. LEGAL COMPLIANCE AND LIABILITY CODE:", 20, 150);
    doc.setFont("Helvetica", "normal");
    doc.text(res.plain.what_it_means, 20, 156, { maxWidth: 170 });

    doc.setFont("Helvetica", "bold");
    doc.text("3. ADMINISTRATIVE ACTION AND REMEDY:", 20, 185);
    doc.setFont("Helvetica", "normal");
    doc.text(res.plain.what_you_can_do, 20, 191, { maxWidth: 170 });

    doc.setFont("Helvetica", "bold");
    doc.text("4. MEASUREMENT CONFIDENCE MARGIN:", 20, 215);
    doc.setFont("Helvetica", "normal");
    doc.text(res.plain.how_sure_are_we, 20, 221, { maxWidth: 170 });

    // Footer divider
    doc.setDrawColor(226, 221, 212);
    doc.line(20, 240, 190, 240);

    // Verification portal
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("GOVERNMENT COMPLIANCE NOTE", 20, 248);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 101, 92);
    doc.text("This document constitutes a cryptographically-verifiable integrity record.", 20, 254);
    doc.text("Verification is open to the public on the MeitY Sandbox verify portal.", 20, 259);

    // Signatures
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(28, 26, 23);
    doc.text("MINISTRY OF ELECTRONICS & IT", 130, 265);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Algorithmic Sandbox Authority", 130, 270);

    doc.save(`sentinel-compliance-report-${res.sealed.sequence}.pdf`);
  };

  // jsPDF - Right to Information (RTI) Application Generator
  const handleDownloadRTI = (res: Result) => {
    const doc = new jsPDF();
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("RTI APPLICATION FORM", 105, 20, { align: "center" });
    doc.setFontSize(10);
    doc.text("(Filed under Section 6(1) of the Right to Information Act, 2005)", 105, 26, { align: "center" });

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text("To,", 20, 40);
    doc.setFont("Helvetica", "bold");
    doc.text("The Public Information Officer (PIO)", 20, 45);
    doc.setFont("Helvetica", "normal");
    doc.text("Department of Social Welfare / Food and Civil Supplies,", 20, 50);
    doc.text("Government of India / Relevant State Authority.", 20, 55);

    doc.setFont("Helvetica", "bold");
    doc.text("Subject: Request for Information under Section 6(1) of the RTI Act, 2005", 20, 68);

    doc.setFont("Helvetica", "normal");
    doc.text("Sir/Madam,", 20, 78);
    doc.text("Please provide the following information under the Right to Information Act, 2005:", 20, 84);

    // Particulars of information
    doc.rect(20, 90, 170, 110);
    doc.setFont("Helvetica", "bold");
    doc.text("Details of Information Requested:", 25, 98);
    
    doc.setFont("Helvetica", "normal");
    const lines = [
      `1. Exact technical specifications, model accuracy sheets, and algorithmic impact assessments (including subgroup disparities under IEEE Std 7003-2024) of the eligibility classifier used to deny welfare pension/ration benefits.`,
      `2. Rationale behind why independent testing (Certificate #SEAL-${res.sealed.sequence}) demonstrated statistical contradictions. Specifically, if my monthly income was the reason stated for rejection, explain why changing it in counterfactual testing did not flip the decision.`,
      `3. Details of the privacy logs and cumulative privacy budget parameters allocated for this target classifier model under DP rules.`,
      `4. Provide details of the official administrative channels and grievance redressal steps available for citizens to appeal decisions flagged by independent audit tests.`
    ];

    let y = 106;
    lines.forEach(line => {
      const splitText = doc.splitTextToSize(line, 160);
      doc.text(splitText, 25, y);
      y += splitText.length * 5 + 3;
    });

    // Fee
    doc.setFont("Helvetica", "bold");
    doc.text("Application Fee Details:", 20, 215);
    doc.setFont("Helvetica", "normal");
    doc.text("An Application Fee of Rs. 10/- is attached herewith via Postal Order / Demand Draft.", 20, 222);

    doc.text("Applicant Signature: _______________________", 20, 245);
    doc.text("Applicant Name: __________________________", 20, 252);
    doc.text("Address: _________________________________", 20, 259);
    doc.text("Date: ____________________________________", 20, 266);

    doc.save(`sentinel-rti-request-${res.sealed.sequence}.pdf`);
  };

  return (
    <>
      {/* Official Government Banner */}
      <div className="bg-[#f0e6d2] border border-[#d2c2a4] p-3 text-xs flex items-center justify-between gap-3 text-[#503d25] rounded-t-xl font-mono">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#8c2f1e]" />
          <span>GOVT OF INDIA · ALGORITHMIC AUDIT COMPLIANCE SANDBOX (MEITY)</span>
        </div>
        <span className="font-bold text-[0.68rem] tracking-wide bg-[#8c2f1e] text-white px-2 py-0.5 rounded">
          DPDP ACT 2023 CERTIFIED
        </span>
      </div>

      <section className="sheet rounded-b-xl border-t-0 border-rule bg-white shadow-sm overflow-hidden relative space-y-6">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-soft rounded-full -mr-16 -mt-16 opacity-30 pointer-events-none"></div>
        
        <div>
          <div className="flex items-center gap-3">
            <Activity className="text-accent w-6 h-6 animate-pulse" />
            <h2 className="text-xl md:text-2xl font-serif">Algorithmic Sandbox Audit</h2>
          </div>
          <p className="mt-2 max-w-2xl text-[0.95rem] text-muted">
            Audits public welfare classifiers under MeitY guidelines. Run diagnostic checks to verify data leakage compliance (Section 6, DPDP Act) and explanation consistency.
          </p>
        </div>

        {/* Wizard Audit Selector Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <QuestionButton
            title="Privacy Compliance Audit"
            detail="Audits if the classifier memorized specific candidate datasets instead of abstracting safe patterns. Prevents citizen data leaks."
            busy={busy === "membership" && !showCustomForm}
            disabled={busy !== null}
            onClick={() => {
              setShowCustomForm(false);
              // Run with default canary record
              void runMembershipAudit(
                [
                  CANARY_DEFAULTS.income,
                  CANARY_DEFAULTS.householdSize,
                  CANARY_DEFAULTS.landAcres,
                  CANARY_DEFAULTS.yearsAddress,
                  CANARY_DEFAULTS.aadhaarSeeded,
                  CANARY_DEFAULTS.docsComplete,
                  CANARY_DEFAULTS.priorSchemes,
                  CANARY_DEFAULTS.age
                ],
                CANARY_DEFAULTS.label
              );
            }}
            icon={<KeyRound className="w-5 h-5 text-accent" />}
          />
          <QuestionButton
            title="Reason Consistency Audit"
            detail="Tests whether changing ONLY the detail the system blamed (like income) actually changes your outcome. Catches explanation fraud."
            busy={busy === "explainability"}
            disabled={busy !== null}
            onClick={runExplainabilityAudit}
            icon={<HelpCircle className="w-5 h-5 text-accent" />}
          />
        </div>

        {/* Diagnostic Sandbox Form Button */}
        <div className="border-t border-rule pt-4 flex justify-between items-center">
          <p className="text-xs text-muted font-semibold">
            Want to test custom citizen profiles? Toggle the interactive sandbox.
          </p>
          <button
            onClick={() => {
              setShowCustomForm(!showCustomForm);
              setResult(null);
            }}
            className="btn-quiet rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs border-accent text-accent hover:bg-accent-soft"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {showCustomForm ? "Hide Sandbox Panel" : "Open Diagnostic Sandbox Form"}
          </button>
        </div>

        {/* Interactive Custom Profile Sandbox Form */}
        {showCustomForm && (
          <div className="bg-paper-sunk border border-rule rounded-xl p-5 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-rule pb-2">
              <div>
                <h3 className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-accent" />
                  Custom Profile Parameters Sandbox
                </h3>
                <p className="text-[0.7rem] text-muted">
                  Alter parameters to test if the model memorized specific values vs general ones.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={prefillCanary}
                  className="px-2.5 py-1 bg-white border border-rule hover:border-accent text-[0.7rem] font-bold rounded cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-[#8c2f1e]" />
                  Canary Preset (Memorized)
                </button>
                <button
                  onClick={prefillClean}
                  className="px-2.5 py-1 bg-white border border-rule hover:border-accent text-[0.7rem] font-bold rounded cursor-pointer shadow-xs flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 text-[#2f5d3a]" />
                  Clean Preset (Unmemorized)
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 text-xs font-medium">
              <label className="flex flex-col gap-1">
                <span className="text-muted">Monthly Income (INR)</span>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                  className="field rounded border border-rule"
                />
              </label>
              
              <label className="flex flex-col gap-1">
                <span className="text-muted">Household Size</span>
                <input
                  type="number"
                  value={householdSize}
                  onChange={(e) => setHouseholdSize(parseInt(e.target.value) || 0)}
                  className="field rounded border border-rule"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-muted">Land Owned (Acres)</span>
                <input
                  type="number"
                  value={landAcres}
                  onChange={(e) => setLandAcres(parseFloat(e.target.value) || 0)}
                  className="field rounded border border-rule"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-muted">Years at Current Address</span>
                <input
                  type="number"
                  value={yearsAddress}
                  onChange={(e) => setYearsAddress(parseFloat(e.target.value) || 0)}
                  className="field rounded border border-rule"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-muted">Aadhaar Linked to Bank</span>
                <select
                  value={aadhaarSeeded}
                  onChange={(e) => setAadhaarSeeded(parseInt(e.target.value))}
                  className="field rounded border border-rule"
                >
                  <option value={1}>Yes (Linked)</option>
                  <option value={0}>No (Unlinked)</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-muted">Documents Complete</span>
                <select
                  value={docsComplete}
                  onChange={(e) => setDocsComplete(parseInt(e.target.value))}
                  className="field rounded border border-rule"
                >
                  <option value={1}>Yes (Complete)</option>
                  <option value={0}>No (Missing)</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-muted">Prior Schemes Enrolled</span>
                <input
                  type="number"
                  value={priorSchemes}
                  onChange={(e) => setPriorSchemes(parseInt(e.target.value) || 0)}
                  className="field rounded border border-rule"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-muted">Applicant Age (Years)</span>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(parseFloat(e.target.value) || 0)}
                  className="field rounded border border-rule"
                />
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-rule pt-3 text-xs">
              <label className="flex items-center gap-1.5 font-bold">
                <span className="text-muted">System Stated Decision Outcome:</span>
                <select
                  value={label}
                  onChange={(e) => setLabel(parseInt(e.target.value))}
                  className="field rounded border border-rule font-bold text-xs py-1"
                >
                  <option value={0}>Rejected (Eligibility Denied)</option>
                  <option value={1}>Approved (Eligible)</option>
                </select>
              </label>

              <button
                onClick={() => runMembershipAudit()}
                disabled={busy !== null}
                className="btn-primary rounded text-xs font-bold py-1.5 px-4 cursor-pointer"
              >
                {busy === "membership" ? "Auditing Sandbox Data..." : "Run Sandbox Privacy Audit"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="callout-flag mt-5 flex items-start gap-3 rounded-lg">
            <AlertCircle className="w-5 h-5 text-flag mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}
      </section>

      {result && (
        <section className="sheet rounded-xl border-rule bg-white shadow-sm space-y-6">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between border-b border-rule pb-4 gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="text-amber-600 w-5 h-5 animate-bounce" />
              <h2 className="text-xl font-serif font-semibold">Your Compliance Certificate</h2>
            </div>
            <div className="flex items-center gap-2 bg-paper-sunk px-3 py-1.5 rounded text-xs font-mono border border-rule">
              <QrCode className="w-3.5 h-3.5 text-muted" />
              <span>Report #SEAL-{result.sealed.sequence}</span>
            </div>
          </div>

          {/* Visual Indicators & Gauge for M1 */}
          {result.kind === "membership" && (
            <div className="bg-paper-sunk border border-rule rounded-lg p-5">
              <h3 className="font-serif font-bold text-lg mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-accent" />
                Data Memorization Test
              </h3>
              
              {result.report.findings.map((finding) => {
                const z = finding.memorization_z;
                // Scale z-score 0 to 8 for display percentage
                const pct = Math.min(100, Math.max(0, (z / 8) * 100));
                
                const isCritical = z > 4;
                const isWarning = z <= 4 && z > 2;
                
                const barColor = isCritical ? "bg-flag" : isWarning ? "bg-caution" : "bg-clear";
                const badgeColor = isCritical ? "tag-flag" : isWarning ? "tag-caution" : "tag-clear";
                
                return (
                  <div key={finding.record_id} className="space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-semibold text-ink-soft">Canary Record Z-Score:</span>
                      <span className={`rounded-full ${badgeColor} text-[0.8rem] px-3 font-bold`}>
                        {finding.verdict}
                      </span>
                    </div>

                    {/* Horizontal Bar Gauge */}
                    <div className="space-y-1">
                      <div className="w-full bg-rule-strong h-4 rounded-full overflow-hidden p-0.5 border border-rule">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-1000`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-[0.72rem] text-muted font-semibold px-1">
                        <span>z = 0 (Safe Pattern)</span>
                        <span>z = 2.0 (Risk Boundary)</span>
                        <span>z = 4.0 (Danger Zone)</span>
                        <span>z = 8.0 (Extreme Leak)</span>
                      </div>
                    </div>

                    {/* z-score callout card */}
                    <div className="grid sm:grid-cols-2 gap-4 mt-2 pt-2 border-t border-rule">
                      <div className="p-3 bg-white border border-rule rounded">
                        <span className="text-xs text-muted block uppercase tracking-wider font-semibold">Z-Score Value</span>
                        <span className="text-2xl font-mono font-bold text-ink">{z.toFixed(2)}</span>
                        <span className="text-[0.75rem] text-muted block mt-1">Value &gt; 2.0 indicates statistical deviation</span>
                      </div>
                      <div className="p-3 bg-white border border-rule rounded">
                        <span className="text-xs text-muted block uppercase tracking-wider font-semibold">Decoy Isolation Gap</span>
                        <span className="text-2xl font-mono font-bold text-ink">
                          {finding.decoy_separation !== null ? finding.decoy_separation.toFixed(3) : "—"}
                        </span>
                        <span className="text-[0.75rem] text-muted block mt-1">Measures unique response vs control neighbours</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Visual Mismatch list for M2 */}
          {result.kind === "explainability" && (
            <div className="bg-paper-sunk border border-rule rounded-lg p-5">
              <h3 className="font-serif font-bold text-lg mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-flag animate-pulse" />
                Explanation Mismatch Analysis
              </h3>
              <p className="text-xs text-muted mb-4">
                We ran counterfactual probes against each rejection reason. A high wrong rate indicates explanation fraud.
              </p>
              
              <div className="space-y-4">
                {result.report.per_feature.map((feature) => {
                  const rate = feature.mismatch_rate * 100;
                  const isFlagged = rate >= 15;
                  const barColor = isFlagged ? "bg-flag" : rate >= 5 ? "bg-caution" : "bg-clear";
                  
                  return (
                    <div key={feature.feature} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-ink-soft">{feature.citizen_label}</span>
                        <span className={rate > 10 ? "text-flag font-bold" : "text-ink"}>
                          {rate.toFixed(1)}% wrong explanation
                        </span>
                      </div>
                      <div className="w-full bg-rule h-3 rounded-full overflow-hidden p-0.5">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all duration-700`}
                          style={{ width: `${rate}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Verdict Box */}
          <dl className="plain-answer rounded-lg border-l-4">
            <dt className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              What we found
            </dt>
            <dd className="font-semibold text-lg">{result.plain.what_we_found}</dd>
            
            <dt className="flex items-center gap-1.5 mt-4 font-bold">
              <Info className="w-4 h-4 text-muted" />
              What it means
            </dt>
            <dd className="text-ink-soft">{result.plain.what_it_means}</dd>
            
            <dt className="flex items-center gap-1.5 mt-4 font-bold">
              <ArrowRight className="w-4 h-4 text-muted" />
              What you can do
            </dt>
            <dd className="text-ink-soft font-medium">{result.plain.what_you_can_do}</dd>
            
            <dt className="flex items-center gap-1.5 mt-4 font-bold">
              <Activity className="w-4 h-4 text-muted" />
              How sure are we
            </dt>
            <dd className="text-muted italic">{result.plain.how_sure_are_we}</dd>
          </dl>

          {/* Action Buttons Block */}
          <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
            <button
              onClick={() => handleDownloadPDF(result)}
              className="btn-primary rounded flex items-center gap-2 cursor-pointer text-xs font-bold"
            >
              <FileDown className="w-4 h-4" />
              Download Compliance Certificate (PDF)
            </button>

            {result.kind === "explainability" && (
              <button
                onClick={() => handleDownloadRTI(result)}
                className="btn-quiet rounded flex items-center gap-2 cursor-pointer border-flag text-flag hover:bg-flag-soft transition-colors text-xs font-bold"
              >
                <FileText className="w-4 h-4 text-flag" />
                Generate RTI Request form (PDF)
              </button>
            )}

            <div className="ml-auto flex items-center gap-3">
              <span className="text-xs text-muted hidden md:inline font-semibold">Verify authenticity:</span>
              <QRCodeSVG
                value={`http://localhost:5173/?tab=verify&report=${result.sealed.sequence}`}
                size={40}
                className="border border-rule p-1 bg-white"
              />
            </div>
          </div>

          {/* Technical Details Toggle */}
          <div className="border-t border-rule pt-4">
            <button
              className="text-xs font-semibold text-accent underline underline-offset-2 flex items-center gap-1 hover:text-ink cursor-pointer"
              onClick={() => setShowTechnical((shown) => !shown)}
            >
              {showTechnical ? "Hide technical mathematical details" : "Show technical mathematical details"}
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
  icon,
}: {
  title: string;
  detail: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="border border-rule-strong bg-white p-5 rounded-lg text-left transition-all duration-300
                 hover:border-accent hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer flex gap-4"
    >
      <div className="p-2 bg-paper-sunk rounded-lg h-fit border border-rule">
        {icon}
      </div>
      <div>
        <span className="block font-serif text-[1.1rem] font-semibold text-ink">
          {busy ? "Executing Compliance Check..." : title}
        </span>
        <span className="mt-1 block text-[0.85rem] leading-relaxed text-muted">
          {detail}
        </span>
      </div>
    </button>
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
            <Row label="p-value (one-sided bootstrap)" value={finding.p_value.toExponential(2)} />
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
            <th className="text-right">Wrong Reason</th>
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
