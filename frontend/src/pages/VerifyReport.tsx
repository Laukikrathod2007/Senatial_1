/**
 * Public verification tool.
 *
 * Requires no login, by design. A tamper-evident ledger whose verification
 * needs the operator's permission is not independently verifiable -- the point
 * is that a skeptical reader can check a finding without trusting us.
 */

import { useEffect, useState } from "react";
import {
  api,
  ApiError,
  type ChainVerification,
  type SealedReportSummary,
} from "../api/client";

export function VerifyReport() {
  const [chain, setChain] = useState<ChainVerification | null>(null);
  const [reports, setReports] = useState<SealedReportSummary[] | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      setChain(await api.verifyChain());
      // Listing reports needs a token; the chain check itself does not. A
      // logged-out visitor still gets the verification result, which is the
      // part that matters.
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

  return (
    <>
      <section className="sheet">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl">Verify sealed findings</h2>
          <span className="rule-label">No account required</span>
        </div>
        <p className="mt-2 max-w-2xl text-[0.95rem] text-muted">
          This recomputes every report's hash, confirms each is linked to the one
          before it, and validates the Ed25519 signature.
        </p>

        {chain && (
          <div className="mt-5">
            {chain.valid ? (
              <p className="callout-clear">
                <strong>Chain verified.</strong> {chain.reports_checked} report
                {chain.reports_checked === 1 ? "" : "s"} intact, all signatures
                valid.
              </p>
            ) : (
              <div className="callout-flag">
                <strong>Chain broken at report #{chain.broken_at_sequence}.</strong>
                <ul className="mt-2 list-disc space-y-1 pl-5 font-sans text-[0.9rem]">
                  {chain.failures.map((failure) => (
                    <li key={failure}>{failure}</li>
                  ))}
                </ul>
              </div>
            )}

            {chain.merkle_root && (
              <p className="mt-3 break-all font-mono text-[0.78rem] text-muted">
                Merkle root {chain.merkle_root}
              </p>
            )}
          </div>
        )}

        {error && <p className="callout-flag mt-4">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-primary" disabled={busy} onClick={() => void verify()}>
            {busy ? "Verifying…" : "Re-run verification"}
          </button>
          <button
            className="btn-quiet"
            onClick={async () => {
              const key = await api.publicKey();
              setPublicKey(key.public_key_pem);
            }}
          >
            Show public key
          </button>
        </div>

        {publicKey && (
          <div className="mt-5 border-t border-rule pt-4">
            <p className="rule-label">Ed25519 public key</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all bg-paper-sunk p-4 font-mono text-[0.75rem] leading-relaxed text-ink-soft">
              {publicKey}
            </pre>
            <p className="mt-2 text-[0.82rem] leading-relaxed text-muted">
              For a genuinely independent check, use the copy committed to the
              repository rather than this one — a compromised server could serve a
              key matching forged reports.
            </p>
          </div>
        )}
      </section>

      {reports && reports.length > 0 && (
        <section className="sheet">
          <h2 className="text-xl">Sealed reports</h2>
          <table className="sheet-table mt-4">
            <thead>
              <tr>
                <th className="text-right">#</th>
                <th>Audit</th>
                <th>Sealed</th>
                <th>Hash</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.sequence}>
                  <td className="text-right">{report.sequence}</td>
                  <td>{report.audit_type.replace(/_/g, " ")}</td>
                  <td className="text-muted">
                    {new Date(report.created_at).toLocaleTimeString()}
                  </td>
                  <td className="font-mono text-[0.78rem] text-muted">
                    {report.report_hash.slice(0, 24)}…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="sheet">
        <h2 className="text-lg">How to break this</h2>
        <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-muted">
          Edit any sealed report directly in the database — bypassing this
          application entirely — and re-run the check. Because each report's
          position in the chain is inside the bytes that were signed, altering,
          reordering, or deleting a report invalidates its signature. Run{" "}
          <code className="bg-paper-sunk px-1.5 py-0.5 font-mono text-[0.82rem] text-ink">
            sentinel demo tamper
          </code>{" "}
          to watch it fail.
        </p>
      </section>
    </>
  );
}
