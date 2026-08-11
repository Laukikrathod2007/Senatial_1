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
      {/* Status card */}
      <section className={`border-2 rounded-2xl overflow-hidden transition-all duration-500 ${
        isChainBroken ? "border-flag bg-flag-soft animate-pulse" : chain?.valid ? "border-clear/40 bg-white" : "border-rule bg-white"
      }`}>
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isChainBroken ? "border-flag/30 bg-flag-soft" : chain?.valid ? "border-clear/20 bg-clear-soft" : "border-rule bg-paper"
        }`}>
          <div className="flex items-center gap-3">
            {isChainBroken
              ? <ShieldAlert className="w-7 h-7 text-flag animate-bounce" />
              : chain?.valid
                ? <ShieldCheck className="w-7 h-7 text-clear" />
                : <Server className="w-7 h-7 text-muted" />}
            <div>
              <h2 className="font-serif font-extrabold text-lg text-accent">
                {isChainBroken ? "CRITICAL: Ledger Tampered!" : chain?.valid ? "Cryptographic Ledger Verified" : "Ledger Integrity Check"}
              </h2>
              <p className="text-xs text-muted mt-0.5">SHA-256 hash-chain · Ed25519 signatures · Sequence index binding</p>
            </div>
          </div>
          <span className="rule-label bg-white border border-rule px-3 py-1 rounded-full text-[0.65rem] font-bold shadow-xs">
            {chain ? `${chain.reports_checked} blocks` : "pending"}
          </span>
        </div>

        <div className="p-6 space-y-4">
          {chain && (
            chain.valid ? (
              <div className="flex items-start gap-3 p-4 bg-clear-soft border border-clear/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-clear mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-clear">Chain integrity verified — 100%</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">All signatures match. Deletion or splicing of reports is mathematically ruled out.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-flag-soft border border-flag/30 rounded-xl">
                <AlertOctagon className="w-5 h-5 text-flag mt-0.5 flex-shrink-0 animate-pulse" />
                <div>
                  <p className="text-sm font-bold text-flag">Forgery detected — chain broken at block #{chain.broken_at_sequence}</p>
                  <ul className="mt-2 space-y-1 text-xs font-mono text-muted list-disc pl-4">
                    {chain.failures.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              </div>
            )
          )}

          {chain?.merkle_root && (
            <div className="flex items-center gap-2 bg-paper-sunk border border-rule rounded-xl px-4 py-2.5 font-mono text-[0.72rem] text-ink-soft">
              <span className="truncate flex-1">Merkle Root: {chain.merkle_root}</span>
              <button onClick={() => copyHash(chain.merkle_root || "", -1)}
                className="p-1 hover:bg-rule rounded cursor-pointer text-muted hover:text-ink">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {actionMessage && (
            <div className="flex items-center gap-2 p-3 bg-caution-soft border border-caution/20 rounded-xl text-xs font-semibold text-caution">
              <AlertTriangle className="w-4 h-4" /> {actionMessage}
            </div>
          )}
          {error && <p className="callout-flag rounded-xl text-xs font-semibold">{error}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            <button className="btn-primary rounded-xl flex items-center gap-2 cursor-pointer" disabled={busy} onClick={() => void verify()}>
              <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
              {busy ? "Verifying..." : "Re-Verify Ledger"}
            </button>
            <button className="btn-quiet rounded-xl cursor-pointer" onClick={async () => { const k = await api.publicKey(); setPublicKey(k.public_key_pem); }}>
              Show Public Key
            </button>
            <button className="btn-quiet rounded-xl border-flag text-flag hover:bg-flag-soft flex items-center gap-2 cursor-pointer ml-auto" onClick={handleReset}>
              <Trash2 className="w-4 h-4" /> Reset Ledger
            </button>
          </div>

          {publicKey && (
            <div className="border-t border-rule pt-4">
              <p className="rule-label mb-2">Ed25519 public key</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-all bg-paper-sunk p-4 font-mono text-[0.68rem] leading-relaxed text-ink-soft rounded-xl border border-rule">{publicKey}</pre>
              <p className="mt-2 text-xs text-muted leading-relaxed">This key must match the repository copy to guarantee independence from the server host.</p>
            </div>
          )}
        </div>
      </section>

      {/* Block timeline */}
      {reports && reports.length > 0 && (
        <section className="bg-white border border-rule rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-rule bg-paper">
            <h2 className="font-serif font-extrabold text-accent flex items-center gap-2">
              <Database className="w-5 h-5 text-brand-gold" /> Sealed Block Timeline
            </h2>
          </div>
          <div className="p-6">
            <div className="relative pl-6 border-l-2 border-rule space-y-6 ml-2">
              {reports.map(report => {
                const broken = chain && !chain.valid && chain.broken_at_sequence === report.sequence;
                return (
                  <div key={report.sequence} className="relative group">
                    <div className={`absolute -left-[29px] top-2 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                      broken ? "border-flag ring-4 ring-flag/20" : chain?.valid ? "border-clear" : "border-rule-strong"
                    }`}>
                      {broken ? <Unlock className="w-2 h-2 text-flag" /> : chain?.valid ? <Lock className="w-2 h-2 text-clear" /> : null}
                    </div>
                    <div className={`p-4 rounded-2xl border transition-all ${
                      broken ? "border-flag/40 bg-flag-soft/30" : "border-rule bg-paper hover:border-rule-strong"
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-rule">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold bg-accent text-white px-2.5 py-0.5 rounded-lg">BLOCK #{report.sequence}</span>
                          <span className="text-xs font-semibold text-muted uppercase tracking-wider">{report.audit_type.replace(/_/g, " ")}</span>
                        </div>
                        <span className="text-[0.68rem] text-muted font-mono">{new Date(report.created_at).toLocaleString()}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="font-mono text-[0.68rem] text-ink-soft space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted uppercase text-[0.6rem] font-bold">Hash:</span>
                            <span className="truncate">{report.report_hash}</span>
                            <button onClick={() => copyHash(report.report_hash, report.sequence)} className="p-0.5 hover:bg-rule rounded cursor-pointer text-muted">
                              <Copy className="w-3 h-3" />
                            </button>
                            {copiedSeq === report.sequence && <span className="text-[0.6rem] text-clear font-bold">Copied!</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted uppercase text-[0.6rem] font-bold">Target:</span>
                            <span>{report.target_id}</span>
                          </div>
                        </div>
                        <button onClick={() => handleTamper(report.sequence)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[0.7rem] font-bold bg-white border border-rule rounded-lg hover:border-flag hover:text-flag hover:bg-flag-soft text-muted transition-all cursor-pointer shadow-xs whitespace-nowrap">
                          💥 Mutate 1 Byte
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Walkthrough */}
      <section className="bg-white border border-rule rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-rule bg-paper">
          <h2 className="font-serif font-extrabold text-accent flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-caution" /> The Forgery Verification Test
          </h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-muted leading-relaxed max-w-2xl">
            Click <code className="bg-paper-sunk px-1.5 py-0.5 rounded font-mono text-xs">💥 Mutate 1 Byte</code> on any block to bypass application validations and directly modify the underlying SQLite record — replicating an inside database attacker. Then click <code className="bg-paper-sunk px-1.5 py-0.5 rounded font-mono text-xs">Re-Verify Ledger</code> to watch the Ed25519 signature check fail in real-time.
          </p>
        </div>
      </section>
    </>
  );
}
