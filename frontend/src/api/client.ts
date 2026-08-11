/**
 * Typed client for the SENTINEL API.
 *
 * The token is held in memory only, never in localStorage: an auditor token
 * carries a query budget against a real system, and localStorage is readable by
 * any script that gets injected into the page.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

export type Role =
  | "citizen"
  | "journalist"
  | "certified_auditor"
  | "gov_self_audit";

export interface LoginResponse {
  access_token: string;
  role: Role;
  queries_per_audit: number;
  audits_per_day: number;
  max_epsilon: number;
}

export interface PlainLanguage {
  what_we_found: string;
  what_it_means: string;
  what_you_can_do: string;
  how_sure_are_we: string;
}

export interface MembershipFinding {
  record_id: string;
  memorization_z: number;
  p_value: number;
  leakage_score: number;
  leakage_score_ci: [number, number];
  shadow_models: number;
  verdict: string;
  decoy_mean_score: number | null;
  decoy_separation: number | null;
}

export interface MembershipReport {
  audit_type: string;
  method: string;
  target_id: string;
  queries_used: number;
  findings: MembershipFinding[];
  plain_language: PlainLanguage;
}

export interface FeatureReliability {
  feature: string;
  citizen_label: string;
  cases_tested: number;
  decision_changed: number;
  reliability: number;
  mismatch_rate: number;
  mismatch_rate_ci: [number, number];
  verdict: string;
}

export interface ExplainabilityReport {
  audit_type: string;
  method: string;
  scope: string;
  cases_tested: number;
  queries_used: number;
  overall_mismatch_rate: number;
  overall_mismatch_ci: [number, number];
  headline: string | null;
  per_feature: FeatureReliability[];
  plain_language: PlainLanguage;
}

export interface Cohort {
  category: string;
  description: string;
  affected_group: string;
  profiles_tested: number;
  rejection_rate: number;
  rejection_rate_ci: [number, number];
  baseline_rejection_rate: number;
  disparity: number;
  p_value: number;
  flagged: boolean;
}

export interface FairnessReport {
  audit_type: string;
  method: string;
  baseline_rejection_rate: number;
  baseline_profiles: number;
  queries_used: number;
  headline: string | null;
  cohorts: Cohort[];
  disclosure: string;
}

export interface Sealed {
  sequence: number;
  report_hash: string;
  signature: string;
}

export interface BudgetStatus {
  target_id: string;
  queries_spent: number;
  epsilon_spent: number;
  max_epsilon: number;
  remaining_fraction: number;
  optimal_alpha: number;
  naive_linear_epsilon: number;
  composition_saving: string;
  note: string;
}

export interface ChainVerification {
  valid: boolean;
  reports_checked: number;
  merkle_root: string | null;
  broken_at_sequence: number | null;
  reason: string | null;
  failures: string[];
}

export interface SealedReportSummary {
  sequence: number;
  audit_type: string;
  target_id: string;
  report_hash: string;
  created_at: string;
}

export class ApiError extends Error {
  // Declared and assigned explicitly rather than as a constructor parameter
  // property: the project builds with `erasableSyntaxOnly`, which rejects
  // TypeScript syntax that has no plain-JavaScript erasure.
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let token: string | null = null;

export function setToken(value: string | null): void {
  token = value;
}

export function hasToken(): boolean {
  return token !== null;
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    // FastAPI puts the human-readable reason in `detail`; surfacing it directly
    // matters because the budget/quota refusals explain *why* in that field.
    let detail = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") detail = payload.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, response.status);
  }

  return (await response.json()) as T;
}

export const api = {
  login: (subject: string, role: Role) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: { subject, role },
    }),

  auditMembership: (record: number[], label: number, recordId: string) =>
    request<{ report: MembershipReport; sealed: Sealed }>("/audits/membership", {
      method: "POST",
      body: { record, label, record_id: recordId, with_decoys: true },
    }),

  auditExplainability: (sampleSize = 1500) =>
    request<{ report: ExplainabilityReport; sealed: Sealed }>(
      "/audits/explainability",
      { method: "POST", body: { sample_size: sampleSize } },
    ),

  auditFairness: (perCohort = 500) =>
    request<{ report: FairnessReport; sealed: Sealed }>("/audits/fairness", {
      method: "POST",
      body: { per_cohort: perCohort },
    }),

  budget: () => request<BudgetStatus>("/audits/budget"),

  reports: () => request<SealedReportSummary[]>("/ledger/reports"),

  verifyChain: () => request<ChainVerification>("/verify/chain"),

  verifyReport: (sequence: number) =>
    request<{ sequence: number; valid: boolean; reason: string }>(
      `/verify/reports/${sequence}`,
    ),

  publicKey: () =>
    request<{ public_key_pem: string; algorithm: string; note: string }>(
      "/verify/public-key",
    ),

  tamperReport: (sequence: number) =>
    request<{ success: boolean; detail: string }>("/verify/tamper", {
      method: "POST",
      body: { sequence },
    }),

  resetLedger: () =>
    request<{ success: boolean; detail: string }>("/verify/reset", {
      method: "POST",
    }),
};
