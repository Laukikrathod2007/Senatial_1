/**
 * Citizen portal.
 *
 * Designed to be visually intuitive, engaging, and action-oriented for non-technical users.
 * Implements interactive z-score gauges, comparative charts, jsPDF certificate downloads,
 * 1-click RTI (Right to Information) generator, and confetti celebrations.
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
  AlertCircle
} from "lucide-react";
import confetti from "canvas-confetti";
import { jsPDF } from "jspdf";
import { QRCodeSVG } from "qrcode.react";

// The planted canary record
const PLANTED_RECORD = [221305.94, 14, 28.8, 56.42, 0, 0, 8, 93.81];
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

  // Confetti trigger
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

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
        triggerConfetti();
      } else {
        const { report, sealed } = await api.auditExplainability();
        setResult({ kind, plain: report.plain_language, report, sealed });
        triggerConfetti();
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
    doc.setFontSize(22);
    doc.setTextColor(28, 26, 23);
    doc.text("PROJECT SENTINEL", 20, 30);

    doc.setFont("Helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(107, 101, 92);
    doc.text("Independent Cryptographic Verification for Public-Sector AI Systems", 20, 36);

    // Divider
    doc.setDrawColor(226, 221, 212);
    doc.setLineWidth(0.5);
    doc.line(20, 42, 190, 42);

    // Metadata
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(28, 26, 23);
    doc.text(`Certificate ID: #SEAL-${res.sealed.sequence}`, 20, 50);
    doc.text(`Generated Date: ${new Date().toLocaleString()}`, 20, 55);
    doc.text(`Target Model ID: welfare-eligibility-demo`, 20, 60);

    // Cryptographic seal block
    doc.setFillColor(243, 239, 232);
    doc.rect(20, 68, 170, 30, "F");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(140, 47, 30);
    doc.text("CRYPTOGRAPHIC SEAL", 25, 75);

    doc.setFont("Courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(66, 61, 54);
    doc.text(`Report Hash: ${res.sealed.report_hash}`, 25, 82);
    doc.text(`Signature:   ${res.sealed.signature.slice(0, 65)}...`, 25, 87);
    doc.text(`Verification: Ed25519 Elliptic Curve Signatures`, 25, 92);

    // Findings section
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(28, 26, 23);
    doc.text("AUDIT FINDINGS SUMMARY", 20, 110);

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.text("1. WHAT WAS FOUND:", 20, 120);
    doc.setFont("Helvetica", "normal");
    doc.text(res.plain.what_we_found, 20, 126, { maxWidth: 170 });

    doc.setFont("Helvetica", "bold");
    doc.text("2. LEGAL AND POLICY IMPLICATIONS:", 20, 150);
    doc.setFont("Helvetica", "normal");
    doc.text(res.plain.what_it_means, 20, 156, { maxWidth: 170 });

    doc.setFont("Helvetica", "bold");
    doc.text("3. RECOMMENDED CITIZEN ACTION:", 20, 185);
    doc.setFont("Helvetica", "normal");
    doc.text(res.plain.what_you_can_do, 20, 191, { maxWidth: 170 });

    doc.setFont("Helvetica", "bold");
    doc.text("4. STATISTICAL CONFIDENCE RATING:", 20, 215);
    doc.setFont("Helvetica", "normal");
    doc.text(res.plain.how_sure_are_we, 20, 221, { maxWidth: 170 });

    // Footer divider
    doc.setDrawColor(226, 221, 212);
    doc.line(20, 240, 190, 240);

    // Verification portal
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.text("LEGAL COMPLIANCE NOTE", 20, 248);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 101, 92);
    doc.text("This certificate was cryptographically sealed using public-key cryptography.", 20, 254);
    doc.text("Anyone can verify its status at http://localhost:5173/ using the public verify portal.", 20, 259);

    // Signatures
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(28, 26, 23);
    doc.text("SENTINEL AUDIT SERVICE", 140, 265);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.text("IEEE Tech for Tomorrow 2026", 140, 270);

    doc.save(`sentinel-audit-report-${res.sealed.sequence}.pdf`);
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
      `3. Details of the differential privacy logs and cumulative privacy budget parameters allocated for this target classifier model.`,
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
      <section className="sheet rounded-xl border-rule bg-white shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-soft rounded-full -mr-16 -mt-16 opacity-30 pointer-events-none"></div>
        <div className="flex items-center gap-3">
          <Activity className="text-accent w-6 h-6 animate-pulse" />
          <h2 className="text-xl md:text-2xl font-serif">Check an AI decision that affected you</h2>
        </div>
        <p className="mt-2 max-w-2xl text-[0.95rem] text-muted">
          Each check queries the automated system to test its validity. We do not require privileged database access, nor do we compromise your personal privacy.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <QuestionButton
            title="Did this system store my data?"
            detail="Verifies if the AI memorized your exact personal record instead of learning general, safe patterns. High scores reveal data privacy leaks."
            busy={busy === "membership"}
            disabled={busy !== null}
            onClick={() => run("membership")}
            icon={<KeyRound className="w-5 h-5 text-accent" />}
          />
          <QuestionButton
            title="Was I given the real reason?"
            detail="Tests whether changing ONLY the detail the system blamed (like income) actually changes your outcome. If it doesn't, the reason was false."
            busy={busy === "explainability"}
            disabled={busy !== null}
            onClick={() => run("explainability")}
            icon={<HelpCircle className="w-5 h-5 text-accent" />}
          />
        </div>

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
              <h2 className="text-xl font-serif font-semibold">Your Audit Certificate</h2>
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
              className="btn-primary rounded flex items-center gap-2 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              Download Audit Certificate (PDF)
            </button>

            {result.kind === "explainability" && (
              <button
                onClick={() => handleDownloadRTI(result)}
                className="btn-quiet rounded flex items-center gap-2 cursor-pointer border-flag text-flag hover:bg-flag-soft transition-colors"
              >
                <FileText className="w-4 h-4 text-flag" />
                Generate RTI Application (PDF)
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
          {busy ? "Executing Audit..." : title}
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
