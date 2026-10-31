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
  rejection_rate: number | null;
  rejection_rate_ci: [number, number] | null;
  baseline_rejection_rate: number | null;
  disparity: number | null;
  p_value: number;
  flagged: boolean;
  metric_available?: boolean;
  profiles_requested?: number;
  profiles_attempted?: number;
  profiles_failed?: number;
  profiles_not_attempted?: number;
  failed_probe_types?: Record<string, number>;
}

export interface FairnessReport {
  audit_type: string;
  method: string;
  baseline_rejection_rate: number | null;
  baseline_profiles: number;
  queries_used: number;
  headline: string | null;
  cohorts: Cohort[];
  disclosure: string;
  target?: { type: string; model_id: string; model_version: string | null; scope: string };
  baseline_profiles_requested?: number;
  baseline_profiles_attempted?: number;
  baseline_profiles_failed?: number;
  baseline_failed_probe_types?: Record<string, number>;
}

export interface AuditJob {
  job_id: string;
  audit_type: string;
  target_id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress_pct: number;
  completed_probes: number;
  attempted_probes: number;
  failed_probes: number;
  unattempted_probes: number;
  total_probes: number;
  result: { report: FairnessReport; sealed: Sealed } | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type CaseEvidenceSource =
  | "citizen_or_ngo_report"
  | "public_document"
  | "public_interface"
  | "authorised_dataset"
  | "synthetic_demo"
  | "other";

export type CaseAccessState =
  | "not_provided"
  | "public_source"
  | "consent_recorded"
  | "written_authority"
  | "denied"
  | "not_applicable";

export type ExecutionStatus =
  | "NOT_APPLICABLE"
  | "PREREQUISITE_MISSING"
  | "ACCESS_DENIED"
  | "QUOTA_EXCEEDED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "DEGRADED"
  | "SUPERSEDED";

export interface CasePrerequisite {
  test_id: string;
  label: string;
  execution_status: ExecutionStatus;
  reason: string;
}

export interface CaseTestResult {
  criterion_id: string;
  execution_status: ExecutionStatus;
  evidentiary_status: string;
  signal: boolean;
  observations: unknown;
  summary: string;
}

export interface CaseAuditReport {
  report_type: string;
  scope: string;
  target: { id: string; version: string; variant: "clean" | "known_flawed"; identity_status: string };
  criterion_definitions: Array<{
    id: string;
    version: string;
    name: string;
    source: string;
    comparison: string;
    threshold: string;
    threshold_type: string;
    required_inputs: string;
    conclusion_limit: string;
  }>;
  test_results: CaseTestResult[];
  overall_evidentiary_status: string;
  signing: {
    algorithm: string;
    signer_key_id_sha256: string;
    proves: string;
    does_not_prove: string;
  };
  validation_against_known_fixtures: {
    scope: string;
    planted_defects: number;
    detected_known_defects: number;
    missed_known_defects: number;
    false_alarm_criteria_on_clean_fixture: number;
    per_criterion: Array<{
      criterion_id: string;
      detected: boolean;
      clean_actual_signal: boolean;
      flawed_actual_signal: boolean;
    }>;
  };
  reproducibility_manifest: {
    test_suite_version: string;
    test_configuration: Record<string, unknown>;
    seed: number;
    profile_generation_method: string;
    query_count: number;
    timestamps_utc: { started: string; finished: string };
    timestamp_trusted: boolean;
    software_versions: Record<string, string>;
    source_revision: string;
    working_tree_dirty: boolean | null;
    test_specification_sha256: string;
    dataset_manifest_sha256: string;
    raw_personal_evidence_included: boolean;
  };
  limitations: string[];
}

export interface CaseRun {
  run_id: string;
  execution_status: ExecutionStatus;
  evidentiary_status: string;
  report_sequence: number | null;
  result: { report: CaseAuditReport; sealed: Sealed } | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface AuditCase {
  case_id: string;
  title: string;
  target_name: string;
  investigation_question: string;
  evidence_source: CaseEvidenceSource;
  provenance_note: string;
  evidence_reference: string;
  access_state: CaseAccessState;
  human_review_status: "unreviewed" | "reviewed";
  human_review_notes: string;
  rti_draft: string;
  system_owner_response: string;
  remediation_status:
    | "not_contacted"
    | "draft_prepared"
    | "awaiting_response"
    | "response_received"
    | "action_reported"
    | "no_action_reported";
  created_at: string;
  updated_at: string;
  prerequisites: CasePrerequisite[];
  runs: CaseRun[];
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

export interface SignedReportCopy {
  payload: Record<string, unknown>;
  canonical_payload: string;
  report_hash: string;
  previous_hash: string;
  signature: string;
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
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
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

  if (response.status === 204) return undefined as T;

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

  auditFairness: (perCohort = 200) =>
    request<{ report: FairnessReport; sealed: Sealed }>("/audits/fairness", {
      method: "POST",
      body: { per_cohort: perCohort },
    }),

  auditHttpFairness: (perCohort = 200) =>
    request<{ report: FairnessReport; sealed: Sealed }>("/audits/fairness/http-demo", {
      method: "POST",
      body: { per_cohort: perCohort },
    }),

  startFairnessJob: (perCohort = 200) =>
    request<AuditJob>("/audits/fairness/jobs", {
      method: "POST",
      body: { per_cohort: perCohort },
    }),

  startHttpFairnessJob: (perCohort = 200) =>
    request<AuditJob>("/audits/fairness/http-demo/jobs", {
      method: "POST",
      body: { per_cohort: perCohort },
    }),

  auditJob: (jobId: string, signal?: AbortSignal) =>
    request<AuditJob>(`/audits/jobs/${encodeURIComponent(jobId)}`, { signal }),

  cases: () => request<AuditCase[]>("/cases"),

  createCase: (input: {
    title: string;
    target_name: string;
    investigation_question: string;
    evidence_source: CaseEvidenceSource;
    provenance_note: string;
    evidence_reference: string;
    access_state: CaseAccessState;
  }) => request<AuditCase>("/cases", { method: "POST", body: input }),

  auditCase: (caseId: string) =>
    request<AuditCase>(`/cases/${encodeURIComponent(caseId)}`),

  runCaseFixture: (caseId: string, variant: "clean" | "known_flawed") =>
    request<CaseRun>(`/cases/${encodeURIComponent(caseId)}/demo-run`, {
      method: "POST",
      body: { variant },
    }),

  updateCase: (
    caseId: string,
    input: Partial<Pick<AuditCase,
      "human_review_status" | "human_review_notes" | "rti_draft" |
      "system_owner_response" | "remediation_status"
    >>,
  ) => request<AuditCase>(`/cases/${encodeURIComponent(caseId)}`, { method: "PATCH", body: input }),

  deleteCase: (caseId: string) =>
    request<void>(`/cases/${encodeURIComponent(caseId)}`, { method: "DELETE" }),

  budget: () => request<BudgetStatus>("/audits/budget"),

  reports: () => request<SealedReportSummary[]>("/ledger/reports"),

  ledgerRoot: () =>
    request<{ reports_count: number; merkle_root: string | null; algorithm: string; note: string }>(
      "/ledger/root",
    ),

  verifyChain: () => request<ChainVerification>("/verify/chain"),

  verifyReport: (sequence: number) =>
    request<{ sequence: number; valid: boolean; reason: string }>(
      `/verify/reports/${sequence}`,
    ),

  signedReportCopy: (sequence: number) =>
    request<SignedReportCopy>(`/ledger/reports/${sequence}`),

  verifyReportCopy: (copy: Pick<SignedReportCopy, "payload" | "canonical_payload" | "report_hash" | "signature">) =>
    request<{ valid: boolean; reason: string }>("/verify/report-copy", { method: "POST", body: copy }),

  publicKey: () =>
    request<{ public_key_pem: string; algorithm: string; note: string }>(
      "/verify/public-key",
    ),

  demoControlsStatus: () =>
    request<{ enabled: boolean }>("/verify/demo-controls"),

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
