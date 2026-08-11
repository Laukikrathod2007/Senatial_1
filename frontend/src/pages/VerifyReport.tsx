/**
 * Public verification portal.
 *
 * Implements a highly visual "Digital Wax Seal" Merkle ledger block-explorer.
 * Shows blocks chained together with validation lines. Features a live
 * database tamper simulator (Mutate 1 Byte) and database reset triggers.
 */

import { useEffect, useState } from "react";
import {
  api,
  ApiError,
  type ChainVerification,
  type SealedReportSummary,
} from "../api/client";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  RefreshCw,
  AlertOctagon,
  Copy,
  CheckCircle,
  Database,
  Trash2,
  AlertTriangle,
  Server
} from "lucide-react";
import confetti from "canvas-confetti";

export function VerifyReport() {
  const [chain, setChain] = useState<ChainVerification | null>(null);
  const [reports, setReports] = useState<SealedReportSummary[] | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [copiedSeq, setCopiedSeq] = useState<number | null>(null);

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      setChain(await api.verifyChain());
      try {
        setReports(await api.reports());
      } catch {
        setReports(null);
      }
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Could not reach the verification service.",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void verify();
  }, []);

  // Copy hash to clipboard helper
  const copyHash = (hash: string, seq: number) => {
    void navigator.clipboard.writeText(hash);
    setCopiedSeq(seq);
    setTimeout(() => setCopiedSeq(null), 1500);
  };

  // Trigger Database Tamper Simulator
  const handleTamper = async (seq: number) => {
    setActionMessage(null);
    try {
      const res = await api.tamperReport(seq);
      if (res.success) {
        setActionMessage(`💥 Tampered! Database row #${seq} payload mutated.`);
        // Immediately re-verify to show the failure
        await verify();
      } else {
        setError(res.detail || "Tamper simulation failed.");
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Error during tamper action.");
    }
  };

  // Reset the Database Ledger
  const handleReset = async () => {
    setActionMessage(null);
    if (!window.confirm("Are you sure you want to reset the database? This deletes all sealed audits.")) return;
    try {
      const res = await api.resetLedger();
      if (res.success) {
        setActionMessage("🔄 Database reset! All audits cleared.");
        await verify();
        confetti({ particleCount: 50, colors: ["#2f5d3a"] });
      } else {
        setError(res.detail || "Reset failed.");
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Error during reset action.");
    }
  };

  const isChainBroken = chain && !chain.valid;

  return (
    <>
      {/* Visual Status Indicator */}
      <section className={`sheet rounded-xl border transition-all duration-500 ${
        isChainBroken 
          ? "border-flag bg-flag-soft shadow-lg animate-pulse" 
          : chain?.valid 
            ? "border-clear bg-clear-soft shadow-sm" 
            : "border-rule bg-white"
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {isChainBroken ? (
              <ShieldAlert className="w-8 h-8 text-flag animate-bounce" />
            ) : chain?.valid ? (
              <ShieldCheck className="w-8 h-8 text-clear" />
            ) : (
              <Server className="w-8 h-8 text-muted" />
            )}
            <div>
              <h2 className="text-xl font-serif font-bold">
                {isChainBroken ? "CRITICAL: Audit Ledger Tampered!" : chain?.valid ? "Cryptographic Ledger Verified" : "Ledger Integrity Check"}
              </h2>
              <p className="text-xs text-muted mt-0.5 font-semibold">
                Checks SHA-256 block hash-chain, previous_hash connections, and Ed25519 digital signatures.
              </p>
            </div>
          </div>
          <span className="rule-label px-2.5 py-1 bg-white border border-rule rounded-full text-[0.65rem] font-bold shadow-xs">
            {chain ? `${chain.reports_checked} Blocks Scanned` : "Pending Scan"}
          </span>
        </div>

        {chain && (
          <div className="mt-5">
            {chain.valid ? (
              <div className="p-4 bg-white rounded border border-clear flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-clear mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-clear">Chain Integrity Verified 100%</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    All report payload signatures match our public key PEM copy. Deletion or splicing of reports has been mathematically ruled out.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white rounded border border-flag flex items-start gap-3 shadow-sm">
                <AlertOctagon className="w-5 h-5 text-flag mt-0.5 flex-shrink-0 animate-pulse" />
                <div>
                  <p className="text-sm font-semibold text-flag">FORGERY DETECTED: Chain Broken at Block #{chain.broken_at_sequence}</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Audit findings stored in the database were altered post-hoc! Here are the ledger verification failures:
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 font-sans text-xs text-muted leading-relaxed">
                    {chain.failures.map((failure, idx) => (
                      <li key={idx} className="font-mono">{failure}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {chain.merkle_root && (
              <div className="mt-4 p-3 bg-paper-sunk border border-rule rounded font-mono text-[0.72rem] text-ink-soft flex items-center justify-between gap-2 overflow-hidden">
                <span className="truncate">Merkle Root: {chain.merkle_root}</span>
                <button
                  onClick={() => copyHash(chain.merkle_root || "", -1)}
                  className="p-1 hover:bg-rule rounded text-muted hover:text-ink cursor-pointer"
                  title="Copy root hash"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {actionMessage && (
          <div className="mt-4 p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded text-xs font-semibold animate-fade-in flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            {actionMessage}
          </div>
        )}

        {error && <p className="callout-flag mt-4 text-xs font-semibold">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-primary rounded flex items-center gap-2 cursor-pointer" disabled={busy} onClick={() => void verify()}>
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Running Cryptographic Checks..." : "Re-Verify Ledger"}
          </button>
          <button
            className="btn-quiet rounded flex items-center gap-2 cursor-pointer"
            onClick={async () => {
              const key = await api.publicKey();
              setPublicKey(key.public_key_pem);
            }}
          >
            Show Ledger Public Key
          </button>
          <button
            className="btn-quiet rounded flex items-center gap-2 border-flag text-flag hover:bg-flag-soft transition-colors ml-auto cursor-pointer"
            onClick={handleReset}
          >
            <Trash2 className="w-4 h-4 text-flag" />
            Reset Ledger DB
          </button>
        </div>

        {publicKey && (
          <div className="mt-5 border-t border-rule pt-4 animate-fade-in">
            <p className="rule-label">Ed25519 public key</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all bg-paper-sunk p-4 font-mono text-[0.72rem] leading-relaxed text-ink-soft rounded border border-rule">
              {publicKey}
            </pre>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-muted font-medium">
              Note: This key must match the copy committed to the repository to guarantee independence from the server host.
            </p>
          </div>
        )}
      </section>

      {/* Visual Block Chain Explorer */}
      {reports && reports.length > 0 && (
        <section className="sheet rounded-xl border-rule bg-white shadow-sm space-y-6">
          <h2 className="text-xl font-serif font-bold flex items-center gap-2">
            <Database className="w-5 h-5 text-accent" />
            Sealed Block Timeline
          </h2>

          <div className="relative pl-6 border-l border-rule space-y-8 mt-4 ml-3">
            {reports.map((report) => {
              const isBlockBroken = chain && !chain.valid && chain.broken_at_sequence === report.sequence;
              
              return (
                <div key={report.sequence} className="relative group">
                  {/* Connected Bullet Node */}
                  <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-all ${
                    isBlockBroken 
                      ? "border-flag bg-flag ring-4 ring-flag-soft" 
                      : chain?.valid 
                        ? "border-clear bg-clear" 
                        : "border-rule-strong"
                  }`}>
                    {isBlockBroken ? (
                      <Unlock className="w-2.5 h-2.5 text-white" />
                    ) : chain?.valid ? (
                      <Lock className="w-2.5 h-2.5 text-white" />
                    ) : null}
                  </div>

                  {/* Block Card */}
                  <div className={`p-4 bg-paper shadow-xs rounded-lg border transition-all ${
                    isBlockBroken 
                      ? "border-flag bg-flag-soft" 
                      : "border-rule hover:border-rule-strong"
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-rule">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-rule px-2 py-0.5 rounded text-ink font-bold">
                          BLOCK #{report.sequence}
                        </span>
                        <span className="text-xs uppercase tracking-wider font-semibold text-muted">
                          {report.audit_type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-[0.7rem] text-muted font-mono font-semibold">
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-3 grid sm:grid-cols-3 items-center gap-4 text-xs">
                      {/* Hash Info */}
                      <div className="sm:col-span-2 space-y-1 font-mono text-[0.72rem] text-ink-soft">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-muted text-[0.65rem] uppercase">Block Hash:</span>
                          <span className="truncate">{report.report_hash}</span>
                          <button
                            onClick={() => copyHash(report.report_hash, report.sequence)}
                            className="p-0.5 hover:bg-rule rounded text-muted hover:text-ink cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {copiedSeq === report.sequence && (
                            <span className="text-[0.62rem] text-clear font-semibold">Copied!</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-muted text-[0.65rem] uppercase">Target ID:</span>
                          <span>{report.target_id}</span>
                        </div>
                      </div>

                      {/* Tamper Button */}
                      <div className="flex sm:justify-end gap-2">
                        <button
                          onClick={() => handleTamper(report.sequence)}
                          className="px-3 py-1.5 text-[0.7rem] font-bold bg-white border border-rule hover:border-flag text-muted hover:text-flag hover:bg-flag-soft rounded flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                          title="Inject database tamper anomaly"
                        >
                          <span>💥 Mutate 1 Byte</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Walkthrough explaining how to break the system */}
      <section className="sheet rounded-xl border-rule bg-white shadow-sm">
        <h2 className="text-lg font-serif font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-caution animate-pulse" />
          The Forgery Verification Test
        </h2>
        <p className="mt-2 max-w-2xl text-[0.9rem] leading-relaxed text-muted font-medium">
          Try the simulator! Click <code className="bg-paper-sunk px-1 rounded text-ink">💥 Mutate 1 Byte</code> on any card to bypass application validations and directly modify the report's underlying SQLite database records. This replicates an inside database attacker. When you run <code className="bg-paper-sunk px-1 rounded text-ink">Re-Verify Ledger</code>, the signature validation check will detect the altered byte immediately, causing the verification status to light up in red warning boxes.
        </p>
      </section>
    </>
  );
}
