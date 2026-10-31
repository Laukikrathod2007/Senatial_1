/**
 * Multilingual Translation Dictionary for SENTINEL.
 * Languages:
 *   - en: English (default)
 *   - mr: Marathi (मराठी) - Maharashtra regional public-interest context
 *   - hi: Hindi (हिंदी) - National public-interest context
 */

export type Language = "en" | "mr" | "hi";

export interface Translations {
  // Navigation & Shell
  nav_brand_title: string;
  nav_brand_subtitle: string;
  nav_tab_cases: string;
  nav_tab_citizen: string;
  nav_tab_auditor: string;
  nav_tab_verify: string;
  nav_scope_title: string;
  nav_scope_desc: string;
  evidence_scoped: string;
  demo_tag: string;

  // Language Selector
  lang_select_label: string;
  lang_en: string;
  lang_mr: string;
  lang_hi: string;

  // Session Bar & Login
  session_auth_as: string;
  session_query_allowance: string;
  session_sign_out: string;
  session_title: string;
  session_desc: string;
  session_role_citizen: string;
  session_role_citizen_desc: string;
  session_role_journalist: string;
  session_role_journalist_desc: string;
  session_role_auditor: string;
  session_role_auditor_desc: string;
  session_role_gov: string;
  session_role_gov_desc: string;
  session_label_input: string;
  session_label_placeholder: string;
  session_start_btn: string;
  session_starting: string;
  session_public_verify_notice: string;
  session_verify_link: string;
  session_need_auth_title: string;
  session_need_auth_desc: string;

  // Case Workspace
  cases_title: string;
  cases_subtitle: string;
  cases_all_button: string;
  cases_evidence_boundary_title: string;
  cases_evidence_boundary_desc: string;
  cases_start_title: string;
  cases_field_title: string;
  cases_field_title_placeholder: string;
  cases_field_target: string;
  cases_field_target_placeholder: string;
  cases_field_question: string;
  cases_field_question_placeholder: string;
  cases_field_source: string;
  cases_field_provenance: string;
  cases_field_provenance_placeholder: string;
  cases_field_reference: string;
  cases_field_reference_optional: string;
  cases_field_reference_placeholder: string;
  cases_field_access: string;
  cases_field_access_hint: string;
  cases_create_btn: string;
  cases_creating_btn: string;
  cases_list_heading: string;
  cases_loading: string;
  cases_empty_title: string;
  cases_empty_desc: string;
  cases_created_on: string;

  // Case Sources
  source_citizen_or_ngo_report: string;
  source_public_document: string;
  source_public_interface: string;
  source_authorised_dataset: string;
  source_synthetic_demo: string;
  source_other: string;

  // Case Access States
  access_not_provided: string;
  access_public_source: string;
  access_consent_recorded: string;
  access_written_authority: string;
  access_denied: string;
  access_not_applicable: string;

  // Execution Statuses
  status_NOT_APPLICABLE: string;
  status_PREREQUISITE_MISSING: string;
  status_ACCESS_DENIED: string;
  status_QUOTA_EXCEEDED: string;
  status_RUNNING: string;
  status_COMPLETED: string;
  status_FAILED: string;
  status_DEGRADED: string;
  status_SUPERSEDED: string;

  // Case Detail
  detail_reviewed_badge: string;
  detail_awaiting_badge: string;
  detail_target_named: string;
  detail_source: string;
  detail_provenance: string;
  detail_provenance_empty: string;
  detail_access_state: string;
  detail_reference: string;
  detail_proves_title: string;
  detail_proves_p1: string;
  detail_proves_p2: string;

  // Prerequisites
  prereq_heading: string;
  prereq_subheading: string;

  // Fixture Run
  fixture_heading: string;
  fixture_desc: string;
  fixture_variant_label: string;
  fixture_variant_flawed: string;
  fixture_variant_clean: string;
  fixture_run_btn: string;
  fixture_running_btn: string;
  fixture_result_title: string;
  fixture_result_clean_tag: string;
  fixture_result_flawed_tag: string;
  fixture_overall_status: string;
  fixture_verify_integrity_btn: string;
  fixture_download_signed_btn: string;
  fixture_verify_copy_label: string;
  fixture_verify_copy_hint: string;
  fixture_val_known_detected: string;
  fixture_val_missed: string;
  fixture_val_clean_flags: string;
  fixture_val_disclaimer: string;
  fixture_executed_checks: string;
  fixture_criterion_and_limits: string;
  fixture_criterion_source: string;
  fixture_criterion_comparison: string;
  fixture_criterion_threshold: string;
  fixture_criterion_input: string;
  fixture_criterion_supports: string;
  fixture_reproducibility: string;
  fixture_limitations: string;

  // Human Review & Response
  review_heading: string;
  review_desc: string;
  review_notes_label: string;
  review_notes_placeholder: string;
  review_owner_label: string;
  review_owner_placeholder: string;
  review_remediation_label: string;
  review_save_reviewed_btn: string;
  review_save_notes_btn: string;

  // Remediation Statuses
  remed_not_contacted: string;
  remed_draft_prepared: string;
  remed_awaiting_response: string;
  remed_response_received: string;
  remed_action_reported: string;
  remed_no_action_reported: string;

  // Draft Section
  draft_heading: string;
  draft_desc: string;
  draft_gen_rti_btn: string;
  draft_gen_grievance_btn: string;
  draft_editor_label: string;
  draft_editor_placeholder: string;
  draft_save_btn: string;
  draft_legal_disclaimer: string;
  draft_delete_btn: string;
  draft_private_notes_notice: string;
  draft_confirm_replace: string;
  draft_confirm_delete: string;

  // Auditor Console
  auditor_title: string;
  auditor_subtitle: string;
  auditor_dataset_title: string;
  auditor_dataset_desc: string;
  auditor_dataset_tag: string;
  auditor_run_synthetic_btn: string;
  auditor_run_http_btn: string;
  auditor_running: string;
  auditor_budget_title: string;
  auditor_budget_queries: string;
  auditor_budget_epsilon: string;
  auditor_budget_note: string;
  auditor_fairness_heading: string;
  auditor_download_json: string;
  auditor_download_pdf: string;
  auditor_baseline_rate: string;
  auditor_cohort_col_name: string;
  auditor_cohort_col_tested: string;
  auditor_cohort_col_rate: string;
  auditor_cohort_col_gap: string;
  auditor_cohort_col_pvalue: string;
  auditor_cohort_col_status: string;
  auditor_status_flagged: string;
  auditor_status_normal: string;
  auditor_disclosure_title: string;

  // Citizen Portal
  citizen_title: string;
  citizen_subtitle: string;
  citizen_intro: string;
  citizen_input_heading: string;
  citizen_income_label: string;
  citizen_household_label: string;
  citizen_land_label: string;
  citizen_years_label: string;
  citizen_aadhaar_label: string;
  citizen_docs_label: string;
  citizen_prior_label: string;
  citizen_age_label: string;
  citizen_run_lira_btn: string;
  citizen_run_perturb_btn: string;
  citizen_running: string;
  citizen_results_heading: string;

  // Verify Report
  verify_title: string;
  verify_subtitle: string;
  verify_chain_heading: string;
  verify_chain_status_valid: string;
  verify_chain_status_invalid: string;
  verify_root_label: string;
  verify_recheck_btn: string;
  verify_tamper_heading: string;
  verify_tamper_desc: string;
  verify_tamper_btn: string;
  verify_reset_btn: string;
  verify_pubkey_heading: string;

  // Landing Page Components
  hero_title_p1: string;
  hero_title_p2: string;
  hero_desc: string;
  hero_launch_btn: string;
  hero_verify_btn: string;
  hero_trust_synthetic: string;
  hero_trust_no_real: string;
  hero_trust_signed: string;
  hero_live_state_title: string;
  hero_live_badge: string;
  hero_live_cases: string;
  hero_live_reports: string;
  hero_live_chain: string;
  hero_live_budget: string;
  hero_stat_dataset: string;
  hero_stat_baseline: string;
  hero_stat_cohort: string;
  hero_stat_evidence: string;
  hero_stat_benchmark_tag: string;

  // Footer
  footer_desc: string;
  footer_scope_heading: string;
  footer_modules_heading: string;
  footer_copyright: string;
  footer_event: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    nav_brand_title: "SENTINEL",
    nav_brand_subtitle: "Public-interest audit workspace",
    nav_tab_cases: "Audit cases",
    nav_tab_citizen: "Check a decision",
    nav_tab_auditor: "Auditor console",
    nav_tab_verify: "Verify a report",
    nav_scope_title: "Current test scope",
    nav_scope_desc: "Fictional local fixtures only. External service checks are not connected.",
    evidence_scoped: "Evidence scoped to the selected case",
    demo_tag: "SENTINEL · local synthetic demonstration",

    lang_select_label: "Language",
    lang_en: "English",
    lang_mr: "मराठी",
    lang_hi: "हिंदी",

    session_auth_as: "Authenticated as:",
    session_query_allowance: "query allowance per audit",
    session_sign_out: "Sign out",
    session_title: "Local demo session",
    session_desc: "This demo uses a role label to apply query limits; it does not verify your identity or affiliation. Non-citizen demo roles require the local demo configuration.",
    session_role_citizen: "Citizen demo role",
    session_role_citizen_desc: "Create and review a synthetic audit case.",
    session_role_journalist: "Journalist / RTI demo role",
    session_role_journalist_desc: "Run the controlled synthetic demonstration.",
    session_role_auditor: "Auditor demo role",
    session_role_auditor_desc: "Run the controlled synthetic demonstration.",
    session_role_gov: "Public-service demo role",
    session_role_gov_desc: "Synthetic demo only; not a verified official.",
    session_label_input: "Demo session label",
    session_label_placeholder: "e.g. RTI Auditor #21",
    session_start_btn: "Start demo session",
    session_starting: "Starting session…",
    session_public_verify_notice: "Public report verification does not require a session.",
    session_verify_link: "Verify a report",
    session_need_auth_title: "Start a local demo session",
    session_need_auth_desc: "Your selected role is a demo label. It scopes locally stored cases but does not verify identity, affiliation, consent, or authority.",

    cases_title: "Audit cases",
    cases_subtitle: "Record a concern and where it came from, see which checks are actually possible, and keep findings, review, and follow-up together.",
    cases_all_button: "All cases",
    cases_evidence_boundary_title: "Evidence boundary:",
    cases_evidence_boundary_desc: "this demo stores case notes and provenance in the local database, but it does not accept evidence files or connect to a government service. Do not enter Aadhaar numbers, bank details, health records, or other sensitive personal data. Fixture results are fictional.",
    cases_start_title: "Start a case",
    cases_field_title: "Case title",
    cases_field_title_placeholder: "A short, factual name for this concern",
    cases_field_target: "Target or service being investigated",
    cases_field_target_placeholder: "Name the service, agency, or synthetic scenario",
    cases_field_question: "Investigation question",
    cases_field_question_placeholder: "What specific uncertainty are you trying to resolve?",
    cases_field_source: "Evidence source",
    cases_field_provenance: "Provenance note",
    cases_field_provenance_placeholder: "Who supplied it, when, and how was it obtained? Describe the source; do not paste the record.",
    cases_field_reference: "Reference or source identifier",
    cases_field_reference_optional: "(optional)",
    cases_field_reference_placeholder: "A public URL, publication title, or your own redacted reference code",
    cases_field_access: "Permission or access state",
    cases_field_access_hint: "This records what you report. SENTINEL does not verify consent or legal authority.",
    cases_create_btn: "Create case",
    cases_creating_btn: "Creating case…",
    cases_list_heading: "Your cases",
    cases_loading: "Loading cases…",
    cases_empty_title: "No cases have been created.",
    cases_empty_desc: "Start with a specific question and record where the information came from.",
    cases_created_on: "Created",

    source_citizen_or_ngo_report: "Citizen or NGO report",
    source_public_document: "Public document",
    source_public_interface: "Public-facing interface",
    source_authorised_dataset: "Authorised dataset",
    source_synthetic_demo: "SENTINEL synthetic demonstration",
    source_other: "Other source",

    access_not_provided: "Not provided",
    access_public_source: "Public source",
    access_consent_recorded: "Consent recorded",
    access_written_authority: "Written authority recorded",
    access_denied: "Access denied",
    access_not_applicable: "Not applicable",

    status_NOT_APPLICABLE: "Not applicable",
    status_PREREQUISITE_MISSING: "Prerequisite missing",
    status_ACCESS_DENIED: "Access denied",
    status_QUOTA_EXCEEDED: "Quota exceeded",
    status_RUNNING: "Running",
    status_COMPLETED: "Completed",
    status_FAILED: "Failed",
    status_DEGRADED: "Degraded",
    status_SUPERSEDED: "Superseded",

    detail_reviewed_badge: "Human reviewed",
    detail_awaiting_badge: "Awaiting human review",
    detail_target_named: "Target named by case owner",
    detail_source: "Evidence source",
    detail_provenance: "Provenance",
    detail_provenance_empty: "Not recorded",
    detail_access_state: "Permission or access state",
    detail_reference: "Reference",
    detail_proves_title: "What this case can currently prove",
    detail_proves_p1: "It can preserve the question and reported source, then demonstrate checks against SENTINEL’s own fictional rows. It has not tested the real service named above.",
    detail_proves_p2: "Notes are stored in local SQLite in plaintext and restricted by application owner checks. This is demo storage, not suitable for confidential beneficiary records.",

    prereq_heading: "What can run now",
    prereq_subheading: "Execution state is separate from the evidence status of a finding.",

    fixture_heading: "Run controlled fixture checks",
    fixture_desc: "Choose the clean control or the known-flawed fixture. This runs deterministic checks against 100 or 101 fictional rows. It does not use this case’s evidence or query a public service.",
    fixture_variant_label: "Fixture variant",
    fixture_variant_flawed: "Known flawed control",
    fixture_variant_clean: "Clean control",
    fixture_run_btn: "Run fixture checks",
    fixture_running_btn: "Running…",
    fixture_result_title: "Fixture result",
    fixture_result_clean_tag: "clean control",
    fixture_result_flawed_tag: "known flawed",
    fixture_overall_status: "Overall evidence state:",
    fixture_verify_integrity_btn: "Verify report integrity",
    fixture_download_signed_btn: "Download signed JSON",
    fixture_verify_copy_label: "Verify a report JSON copy",
    fixture_verify_copy_hint: "Verification checks integrity under this server’s configured key; it does not prove findings are true or independently establish who controls that key.",
    fixture_val_known_detected: "Known defects detected",
    fixture_val_missed: "Missed in known flawed fixture",
    fixture_val_clean_flags: "Flags on clean fixture",
    fixture_val_disclaimer: "Counts apply only to these fixed fixtures. They are not general accuracy, sensitivity, or real-world false-alarm estimates.",
    fixture_executed_checks: "Executed checks",
    fixture_criterion_and_limits: "Criterion and limits",
    fixture_criterion_source: "Source",
    fixture_criterion_comparison: "Comparison",
    fixture_criterion_threshold: "Threshold",
    fixture_criterion_input: "Required input",
    fixture_criterion_supports: "What it supports",
    fixture_reproducibility: "Reproducibility manifest",
    fixture_limitations: "Limitations",

    review_heading: "Human review and response",
    review_desc: "Record an interpretation or response without changing the signed result.",
    review_notes_label: "Reviewer notes",
    review_notes_placeholder: "What did a human reviewer conclude, and what remains uncertain?",
    review_owner_label: "System-owner response or follow-up",
    review_owner_placeholder: "Record a reply only when one has actually been received.",
    review_remediation_label: "Follow-up status",
    review_save_reviewed_btn: "Save as human reviewed",
    review_save_notes_btn: "Save notes only",

    remed_not_contacted: "Not contacted",
    remed_draft_prepared: "Draft prepared",
    remed_awaiting_response: "Awaiting response",
    remed_response_received: "Response received",
    remed_action_reported: "Action reported",
    remed_no_action_reported: "No action reported",

    draft_heading: "RTI or grievance draft",
    draft_desc: "The draft uses placeholders and asks for information; it does not claim the reported service made an error or file anything for you.",
    draft_gen_rti_btn: "Generate RTI information request",
    draft_gen_grievance_btn: "Generate grievance review draft",
    draft_editor_label: "Editable draft text (one draft at a time)",
    draft_editor_placeholder: "Generate either template, then verify and edit every placeholder.",
    draft_save_btn: "Save draft and follow-up",
    draft_legal_disclaimer: "Check the correct authority, current process, fee, and filing instructions yourself. This prototype does not give legal advice.",
    draft_delete_btn: "Delete case notes",
    draft_private_notes_notice: "Private case notes are not included in signed reports.",
    draft_confirm_replace: "Generating another template replaces the draft currently shown. Continue?",
    draft_confirm_delete: "Delete this case and its private case notes? Its synthetic signed reports remain in the public integrity ledger.",

    auditor_title: "Auditor Console",
    auditor_subtitle: "Cohort disparity stress-testing, explainability perturbation, and query-budget monitoring against local models.",
    auditor_dataset_title: "Built-in synthetic model & target",
    auditor_dataset_desc: "800 baseline records and 200 profiles per synthetic cohort. Controlled demonstration only.",
    auditor_dataset_tag: "Synthetic Target",
    auditor_run_synthetic_btn: "Run Fairness Audit (In-Process)",
    auditor_run_http_btn: "Run Fairness Audit (HTTP Target)",
    auditor_running: "Audit in progress…",
    auditor_budget_title: "Rényi Differential Privacy Query Budget",
    auditor_budget_queries: "Queries spent:",
    auditor_budget_epsilon: "Epsilon spent:",
    auditor_budget_note: "Model queries currently execute deterministically without injected noise. This is an exploratory prototype, not a formal differential privacy guarantee.",
    auditor_fairness_heading: "Cohort Rejection Rate Disparities",
    auditor_download_json: "Download Signed JSON",
    auditor_download_pdf: "Download Audit PDF",
    auditor_baseline_rate: "Baseline Rejection Rate:",
    auditor_cohort_col_name: "Cohort",
    auditor_cohort_col_tested: "Tested",
    auditor_cohort_col_rate: "Rejection Rate (95% CI)",
    auditor_cohort_col_gap: "Disparity Gap",
    auditor_cohort_col_pvalue: "p-value (z-test)",
    auditor_cohort_col_status: "Status",
    auditor_status_flagged: "Flagged Disparity",
    auditor_status_normal: "Within Baseline",
    auditor_disclosure_title: "Methodological Limitations & Synthetic Scope",

    citizen_title: "Check a Decision",
    citizen_subtitle: "Synthetic-model audit panel. Test whether test profiles trigger memorization signals (LiRA) or evaluate reason stability.",
    citizen_intro: "Demonstration panel only. No real citizen or welfare records are queried or stored.",
    citizen_input_heading: "Application Parameters (Fictional Profile)",
    citizen_income_label: "Annual Income (₹)",
    citizen_household_label: "Household Members",
    citizen_land_label: "Agricultural Land (Acres)",
    citizen_years_label: "Years at Current Address",
    citizen_aadhaar_label: "Aadhaar Seeded Status",
    citizen_docs_label: "Documents Verified Status",
    citizen_prior_label: "Prior Schemes Count",
    citizen_age_label: "Applicant Age",
    citizen_run_lira_btn: "Run Membership Signal (M1)",
    citizen_run_perturb_btn: "Run Feature Consistency (M2)",
    citizen_running: "Computing audit…",
    citizen_results_heading: "Audit Findings & Explanations",

    verify_title: "Verify Report Ledger",
    verify_subtitle: "Cryptographic ledger verification. Check Merkle roots and Ed25519 digital signatures to detect modifications to sealed reports.",
    verify_chain_heading: "Merkle Hash Chain State",
    verify_chain_status_valid: "Ledger Chain is Intact & Valid",
    verify_chain_status_invalid: "Chain Broken or Tampered",
    verify_root_label: "Published Merkle Root:",
    verify_recheck_btn: "Re-verify Ledger Chain",
    verify_tamper_heading: "Controlled Tamper Simulation (Demo Only)",
    verify_tamper_desc: "Mutate a single byte in a disposable report to demonstrate immediate detection by cryptographic verification.",
    verify_tamper_btn: "Mutate 1 Byte in Ledger",
    verify_reset_btn: "Reset Demo Ledger",
    verify_pubkey_heading: "Configured Server Public Key (Ed25519)",

    hero_title_p1: "See how a welfare audit works",
    hero_title_p2: "using synthetic data.",
    hero_desc: "A volunteer or RTI helper sits with the family. SENTINEL checks the decision from the outside — no government password, no model weights. The family leaves with a plain-language PDF and a ready RTI / grievance form.",
    hero_launch_btn: "Launch Audit Sandbox",
    hero_verify_btn: "Scan & Verify",
    hero_trust_synthetic: "Synthetic test model",
    hero_trust_no_real: "No real applicant data",
    hero_trust_signed: "Signed demo reports",
    hero_live_state_title: "Live Backend State",
    hero_live_badge: "LIVE DEMO STATE",
    hero_live_cases: "Cases in session:",
    hero_live_reports: "Ledger reports sealed:",
    hero_live_chain: "Merkle chain status:",
    hero_live_budget: "Query budget status:",
    hero_stat_dataset: "Dataset",
    hero_stat_baseline: "Baseline",
    hero_stat_cohort: "Cohort size",
    hero_stat_evidence: "Evidence",
    hero_stat_benchmark_tag: "(Fixed demo benchmark)",

    footer_desc: "Hackathon prototype for a synthetic welfare decision model. Demonstrates audit methods and report integrity; it does not connect to a public-sector service.",
    footer_scope_heading: "Scope",
    footer_modules_heading: "Modules",
    footer_copyright: "Synthetic welfare dataset · Ed25519 signed · No model weights accessed",
    footer_event: "IEEE Tech for Tomorrow 2026 Hackathon · TIPPSS Track · Cybersecurity for Community Safety",
  },

  mr: {
    nav_brand_title: "SENTINEL",
    nav_brand_subtitle: "जनहित निर्णय तपासणी कार्यक्षेत्र",
    nav_tab_cases: "तपासणी प्रकरणे",
    nav_tab_citizen: "निर्णय तपासा",
    nav_tab_auditor: "ऑडिटर कन्सोल",
    nav_tab_verify: "अहवाल पडताळणी",
    nav_scope_title: "सध्याची चाचणी मर्यादा",
    nav_scope_desc: "केवळ स्थानिक कृत्रिम नमुने (Fixtures). बाह्य शासकीय सेवांशी थेट जोडलेले नाही.",
    evidence_scoped: "निवडलेल्या प्रकरणाशी संबंधित पुरावा",
    demo_tag: "SENTINEL · स्थानिक प्रात्यक्षिक मॉडेल",

    lang_select_label: "भाषा",
    lang_en: "English",
    lang_mr: "मराठी",
    lang_hi: "हिंदी",

    session_auth_as: "प्रमाणित भूमिका:",
    session_query_allowance: "प्रति ऑडिट क्वेरी मर्यादा",
    session_sign_out: "बाहेर पडा (Sign out)",
    session_title: "स्थानिक प्रात्यक्षिक सत्र",
    session_desc: "हे सत्र केवळ क्वेरी मर्यादा ठरवण्यासाठी डेमो लेबल वापरते; हे तुमची खरी ओळख किंवा पद तपासत नाही. गैर-नागरिक भूमिकांसाठी स्थानिक डेमो सक्षम असणे आवश्यक आहे.",
    session_role_citizen: "नागरिक डेमो भूमिका",
    session_role_citizen_desc: "कृत्रिम ऑडिट प्रकरण नोंदवा आणि तपासा.",
    session_role_journalist: "पत्रकार / माहिती अधिकार डेमो",
    session_role_journalist_desc: "नियंत्रित कृत्रिम प्रात्यक्षिक चालवा.",
    session_role_auditor: "प्रमाणित ऑडिटर डेमो",
    session_role_auditor_desc: "तांत्रिक तपासणी आणि तफावत चाचणी चालवा.",
    session_role_gov: "सार्वजनिक सेवा डेमो भूमिका",
    session_role_gov_desc: "केवळ डेमोसाठी; अधिकृत शासकीय पद नाही.",
    session_label_input: "डेमो सत्र नाव / लेबल",
    session_label_placeholder: "उदा. आरटीआय समन्वयक #२१",
    session_start_btn: "डेमो सत्र सुरू करा",
    session_starting: "सत्र सुरू होत आहे…",
    session_public_verify_notice: "सार्वजनिक अहवाल पडताळणीसाठी सत्राची आवश्यकता नाही.",
    session_verify_link: "अहवाल तपासा",
    session_need_auth_title: "स्थानिक प्रात्यक्षिक सत्र सुरू करा",
    session_need_auth_desc: "निवडलेली भूमिका केवळ स्थानिक प्रकरणांची मर्यादा ठरवण्यासाठी आहे. यामुळे कोणतीही कायदेशीर किंवा अधिकृत मान्यता सिद्ध होत नाही.",

    cases_title: "तपासणी प्रकरणे (Audit Cases)",
    cases_subtitle: "निर्णयाबाबतची शंका आणि तिचा मूळ स्रोत नोंदवा, कोणत्या तांत्रिक चाचण्या शक्य आहेत ते पहा, आणि मानवी पुनरावलोकन व पाठपुरावा एकाच ठिकाणी जतन करा.",
    cases_all_button: "सर्व प्रकरणे",
    cases_evidence_boundary_title: "पुरावा मर्यादा:",
    cases_evidence_boundary_desc: "हे प्रात्यक्षिक केवळ स्थानिक डेटाबेसमध्ये प्रकरणाच्या नोंदी ठेवते. कोणत्याही शासकीय पोर्टलशी किंवा महाडीबीटीशी हे जोडलेले नाही. आधार क्रमांक, बँक तपशील किंवा गोपनीय माहिती प्रविष्ट करू नका.",
    cases_start_title: "नवीन प्रकरण नोंदवा",
    cases_field_title: "प्रकरणाचे शीर्षक",
    cases_field_title_placeholder: "या शंकेबाबत एक संक्षिप्त, स्पष्ट नाव",
    cases_field_target: "तपासली जाणारी यंत्रणा किंवा सेवा",
    cases_field_target_placeholder: "योजना, संस्था किंवा कृत्रिम परिस्थितीचे नाव",
    cases_field_question: "चौकशीचा मुख्य प्रश्न",
    cases_field_question_placeholder: "तुम्ही नक्की कोणती अनिश्चितता किंवा शंका तपासत आहात?",
    cases_field_source: "पुराव्याचा मूळ स्रोत",
    cases_field_provenance: "स्रोत व प्राप्ती संदर्भ (Provenance Note)",
    cases_field_provenance_placeholder: "माहिती कोणी, कधी आणि कशी दिली? केवळ स्रोताचे वर्णन करा; मूळ कागदपत्र टाकू नका.",
    cases_field_reference: "संदर्भ किंवा ओळख क्रमांक",
    cases_field_reference_optional: "(पर्यायी)",
    cases_field_reference_placeholder: "सार्वजनिक लिंक, परिपत्रक किंवा आपला संदर्भ कोड",
    cases_field_access: "परवानगी किंवा प्रवेश स्थिती",
    cases_field_access_hint: "तुम्ही नोंदवलेली माहिती SENTINEL जतन करते; कायदेशीर अधिकार तपासत नाही.",
    cases_create_btn: "प्रकरण जतन करा",
    cases_creating_btn: "प्रकरण जतन होत आहे…",
    cases_list_heading: "तुमची प्रकरणे",
    cases_loading: "प्रकरणे लोड होत आहेत…",
    cases_empty_title: "कोणतेही प्रकरण नोंदवलेले नाही.",
    cases_empty_desc: "विशिष्ट प्रश्नाने सुरुवात करा आणि माहितीचा स्रोत नोंदवून ठेवा.",
    cases_created_on: "नोंदणी तारीख",

    source_citizen_or_ngo_report: "नागरिक किंवा स्वयंसेवी संस्था अहवाल",
    source_public_document: "सार्वजनिक कागदपत्र / परिपत्रक",
    source_public_interface: "सार्वजनिक पोर्टल / संकेतस्थळ",
    source_authorised_dataset: "अधिकृत डेटा संच",
    source_synthetic_demo: "SENTINEL कृत्रिम प्रात्यक्षिक",
    source_other: "इतर स्रोत",

    access_not_provided: "दिलेले नाही",
    access_public_source: "सार्वजनिक स्रोत",
    access_consent_recorded: "संमती नोंदवली",
    access_written_authority: "लेखी अधिकार नोंदवला",
    access_denied: "परवानगी नाकारली",
    access_not_applicable: "लागू नाही",

    status_NOT_APPLICABLE: "लागू नाही",
    status_PREREQUISITE_MISSING: "पूर्वापेक्षित माहिती अपूर्ण",
    status_ACCESS_DENIED: "प्रवेश नाकारला",
    status_QUOTA_EXCEEDED: "क्वेरी कोटा संपला",
    status_RUNNING: "प्रक्रियेत आहे",
    status_COMPLETED: "पूर्ण झाले",
    status_FAILED: "अयशस्वी",
    status_DEGRADED: "मर्यादित",
    status_SUPERSEDED: "रद्दबातल",

    detail_reviewed_badge: "मानवी पुनरावलोकन पूर्ण",
    detail_awaiting_badge: "मानवी पुनरावलोकनाची प्रतीक्षा",
    detail_target_named: "नोंदवलेली यंत्रणा",
    detail_source: "पुराव्याचा स्रोत",
    detail_provenance: "स्रोत तपशील",
    detail_provenance_empty: "नोंदवलेले नाही",
    detail_access_state: "प्रवेश / संमती स्थिती",
    detail_reference: "संदर्भ",
    detail_proves_title: "हे प्रकरण सध्या काय सिद्ध करू शकते",
    detail_proves_p1: "हे नोंदवलेला प्रश्न आणि स्रोत सुरक्षित ठेवते आणि SENTINEL च्या स्वतःच्या कृत्रिम नमुन्यांवर चाचण्या दाखवते. वर नमूद केलेल्या वास्तविक शासकीय सेवेची ही थेट तपासणी नाही.",
    detail_proves_p2: "नोंदी स्थानिक SQLite मध्ये सुरक्षित ठेवल्या आहेत. हे प्रात्यक्षिक मॉडेल असून गोपनीय वैयक्तिक माहितीसाठी योग्य नाही.",

    prereq_heading: "सध्या कोणत्या चाचण्या शक्य आहेत",
    prereq_subheading: "चाचणीची अंमलबजावणी स्थिती आणि पुराव्याची कायदेशीर स्थिती या दोन वेगळ्या बाबी आहेत.",

    fixture_heading: "नियंत्रित नमुन्यांची चाचणी (Fixture Checks)",
    fixture_desc: "दोषरहित (Clean) किंवा ज्ञात-दोषयुक्त (Known-Flawed) नमुना निवडा. हे १०० किंवा १०१ कृत्रिम नोंदींवर निश्चित चाचणी चालवते. वास्तविक अर्जदाराचा डेटा यात वापरला जात नाही.",
    fixture_variant_label: "नमुन्याचा प्रकार",
    fixture_variant_flawed: "ज्ञात-दोषयुक्त नमुना (Known flawed)",
    fixture_variant_clean: "दोषरहित नमुना (Clean control)",
    fixture_run_btn: "नमुना चाचणी चालवा",
    fixture_running_btn: "चाचणी सुरू आहे…",
    fixture_result_title: "चाचणी निकाल",
    fixture_result_clean_tag: "दोषरहित नियंत्रण",
    fixture_result_flawed_tag: "ज्ञात-दोषयुक्त नियंत्रण",
    fixture_overall_status: "एकूण पुराव्याची स्थिती:",
    fixture_verify_integrity_btn: "अहवाल स्वाक्षरी पडताळा",
    fixture_download_signed_btn: "स्वाक्षरी केलेला JSON डाउनलोड करा",
    fixture_verify_copy_label: "अहवालाची JSON प्रत पडताळा",
    fixture_verify_copy_hint: "पडताळणी या सर्व्हरच्या डिजिटल स्वाक्षरीची अखंडता तपासते; अहवालातील निष्कर्ष १००% सत्य असल्याचा दावा करत नाही.",
    fixture_val_known_detected: "शोधलेले ज्ञात दोष",
    fixture_val_missed: "दोषयुक्त नमुन्यात सुटलेले दोष",
    fixture_val_clean_flags: "दोषरहित नमुन्यातील खोटे संकेत",
    fixture_val_disclaimer: "हे आकडे केवळ या निश्चित नमुन्यांसाठी आहेत. ही वास्तविक जगातील त्रुटींची टक्केवारी नाही.",
    fixture_executed_checks: "पूर्ण झालेल्या तपासण्या",
    fixture_criterion_and_limits: "निकष आणि मर्यादा",
    fixture_criterion_source: "स्रोत",
    fixture_criterion_comparison: "तुलना",
    fixture_criterion_threshold: "मर्यादा",
    fixture_criterion_input: "आवश्यक माहिती",
    fixture_criterion_supports: "यावरून काय समजते",
    fixture_reproducibility: "पुनरुत्पादन तपशील (Manifest)",
    fixture_limitations: "मर्यादा",

    review_heading: "मानवी पुनरावलोकन आणि प्रतिसाद",
    review_desc: "स्वाक्षरी केलेला निकाल न बदलता मानवी निष्कर्ष किंवा शासकीय प्रतिसाद नोंदवा.",
    review_notes_label: "पुनरावलोकनकर्त्याच्या नोंदी",
    review_notes_placeholder: "मानवी पडताळणीतून काय स्पष्ट झाले आणि कोणती अनिश्चितता कायम आहे?",
    review_owner_label: "यंत्रणेचा किंवा अधिकाऱ्याचा प्रतिसाद",
    review_owner_placeholder: "जेव्हा अधिकृत उत्तर मिळाले असेल तेव्हाच येथे नोंदवा.",
    review_remediation_label: "पाठपुरावा स्थिती",
    review_save_reviewed_btn: "मानवी पुनरावलोकन पूर्ण म्हणून जतन करा",
    review_save_notes_btn: "केवळ नोंदी जतन करा",

    remed_not_contacted: "संपर्क केलेला नाही",
    remed_draft_prepared: "मसुदा तयार केला",
    remed_awaiting_response: "उत्तराची प्रतीक्षा",
    remed_response_received: "उत्तर मिळाले",
    remed_action_reported: "कारवाई नोंदवली",
    remed_no_action_reported: "कोणतीही कारवाई नाही",

    draft_heading: "माहिती अधिकार (RTI) किंवा तक्रार मसुदा",
    draft_desc: "हा मसुदा केवळ एक साचा आहे; SENTINEL स्वतःहून कोणताही अर्ज दाखल करत नाही किंवा चुकीचा थेट आरोप करत नाही.",
    draft_gen_rti_btn: "माहिती अधिकार (RTI) मसुदा तयार करा",
    draft_gen_grievance_btn: "तक्रार निवारण मसुदा तयार करा",
    draft_editor_label: "संपादकीय मसुदा मजकूर (एका वेळी एक मसुदा)",
    draft_editor_placeholder: "साचा तयार करा, त्यानंतर कंसामधील [माहिती] स्वतः तपासून संपादित करा.",
    draft_save_btn: "मसुदा व पाठपुरावा जतन करा",
    draft_legal_disclaimer: "सक्षम अधिकारी, सध्याची प्रक्रिया, शुल्क आणि अर्ज करण्याचे नियम स्वतः तपासा. हे सॉफ्टवेअर कायदेशीर सल्ला देत नाही.",
    draft_delete_btn: "प्रकरणाच्या नोंदी हटवा",
    draft_private_notes_notice: "खाजगी प्रकरणाच्या नोंदी सार्वजनिक स्वाक्षरी अहवालात समाविष्ट नसतात.",
    draft_confirm_replace: "नवीन साचा तयार केल्यास सध्या दिसणारा मसुदा बदलला जाईल. पुढे जायचे का?",
    draft_confirm_delete: "हे प्रकरण आणि त्याच्या नोंदी हटवायच्या आहेत का? यापूर्वी स्वाक्षरी केलेले अहवाल लेजरमध्ये सुरक्षित राहतील.",

    auditor_title: "ऑडिटर कन्सोल",
    auditor_subtitle: "गट तफावत चाचणी (Fairness sweep), कारण सुसंगतता आणि क्वेरी बजेट देखरेख.",
    auditor_dataset_title: "अंगभूत कृत्रिम मॉडेल व उद्दिष्ट",
    auditor_dataset_desc: "८०० बेसलाइन नोंदी आणि प्रत्येक गटासाठी २०० कृत्रिम प्रोफाइल. नियंत्रित प्रात्यक्षिक.",
    auditor_dataset_tag: "कृत्रिम उद्दिष्ट",
    auditor_run_synthetic_btn: "तफावत चाचणी चालवा (In-Process)",
    auditor_run_http_btn: "तफावत चाचणी चालवा (HTTP Target)",
    auditor_running: "ऑडिट प्रक्रियेत आहे…",
    auditor_budget_title: "Rényi डिफ्रिन्शियल प्रायव्हसी क्वेरी बजेट",
    auditor_budget_queries: "वापरलेल्या क्वेरी:",
    auditor_budget_epsilon: "खर्च झालेला एप्सिलॉन (Epsilon):",
    auditor_budget_note: "सध्या मॉडेल क्वेरी नॉईजशिवाय चालतात. हे एक प्रायोगिक मॉडेल आहे, पूर्ण डीपी हमी नाही.",
    auditor_fairness_heading: "गटनिहाय नकार दर तफावत",
    auditor_download_json: "स्वाक्षरी केलेला JSON डाउनलोड करा",
    auditor_download_pdf: "ऑडिट PDF डाउनलोड करा",
    auditor_baseline_rate: "बेसलाइन नकार दर:",
    auditor_cohort_col_name: "तपासलेला गट",
    auditor_cohort_col_tested: "संख्या",
    auditor_cohort_col_rate: "नकार दर (95% CI)",
    auditor_cohort_col_gap: "तफावत अंतर",
    auditor_cohort_col_pvalue: "p-व्हॅल्यू (z-test)",
    auditor_cohort_col_status: "स्थिती",
    auditor_status_flagged: "तफावत आढळली",
    auditor_status_normal: "मर्यादेत",
    auditor_disclosure_title: "पद्धतीविषयक मर्यादा व कृत्रिम व्याप्ती",

    citizen_title: "निर्णय तपासा (Citizen Portal)",
    citizen_subtitle: "कृत्रिम मॉडेल तपासणी पॅनेल. डेटा मेमोरायझेशन (LiRA) किंवा कारण स्थिरता तपासा.",
    citizen_intro: "केवळ प्रात्यक्षिक पॅनेल. वास्तविक नागरिकांची किंवा कल्याणकारी योजनांची माहिती येथे वापरली जात नाही.",
    citizen_input_heading: "अर्जाचे घटक (काल्पनिक प्रोफाइल)",
    citizen_income_label: "वार्षिक उत्पन्न (₹)",
    citizen_household_label: "कुटुंबातील सदस्य संख्या",
    citizen_land_label: "शेती जमीन (एकर)",
    citizen_years_label: "सध्याच्या पत्त्यावरील वर्षे",
    citizen_aadhaar_label: "आधार लिंक स्थिती",
    citizen_docs_label: "कागदपत्र पडताळणी स्थिती",
    citizen_prior_label: "मागील योजनांचा लाभ",
    citizen_age_label: "अर्जदाराचे वय",
    citizen_run_lira_btn: "मेम्बरशिप सिग्नल तपासा (M1)",
    citizen_run_perturb_btn: "कारण सुसंगतता तपासा (M2)",
    citizen_running: "गणना सुरू आहे…",
    citizen_results_heading: "तपासणी निकाल व सुलभ स्पष्टीकरण",

    verify_title: "अहवाल लेजर पडताळणी",
    verify_subtitle: "क्रिप्टोग्राफिक लेजर पडताळणी. स्वाक्षरी केलेल्या अहवालात बदल झाला आहे का हे मर्कल रूट आणि Ed25519 स्वाक्षरीवरून तपासा.",
    verify_chain_heading: "मर्कल हॅश चेन स्थिती",
    verify_chain_status_valid: "लेजर चेन अखंड आणि वैध आहे",
    verify_chain_status_invalid: "चेन तुटलेली किंवा बदललेली आहे",
    verify_root_label: "प्रकाशित मर्कल रूट:",
    verify_recheck_btn: "लेजर चेन पुन्हा तपासा",
    verify_tamper_heading: "नियंत्रित फेरफार प्रात्यक्षिक (Demo Only)",
    verify_tamper_desc: "क्रिप्टोग्राफिक पडताळणी बदल कसा त्वरित पकडते हे पाहण्यासाठी १ बाइट फेरफार करा.",
    verify_tamper_btn: "लेजरमध्ये १ बाइट फेरफार करा",
    verify_reset_btn: "डेमो लेजर पूर्ववत करा",
    verify_pubkey_heading: "सर्व्हर पब्लिक की (Ed25519)",

    hero_title_p1: "कल्याणकारी योजनेच्या निर्णयांची तपासणी",
    hero_title_p2: "कृत्रिम डेटाद्वारे कशी होते ते पहा.",
    hero_desc: "एक स्वयंसेवक किंवा माहिती अधिकार कार्यकर्ता कुटुंबासोबत बसतो. SENTINEL सरकारी पासवर्ड किंवा मॉडेल वेट्सशिवाय बाहेरील बाजूंनी तपासणी करते. कुटुंबाला सुलभ PDF आणि तयार आरटीआय अर्ज मिळतो.",
    hero_launch_btn: "ऑडिट सँडबॉक्स सुरू करा",
    hero_verify_btn: "स्कॅन व पडताळा",
    hero_trust_synthetic: "कृत्रिम चाचणी मॉडेल",
    hero_trust_no_real: "कोणताही खरा अर्जदार डेटा नाही",
    hero_trust_signed: "डिजिटल स्वाक्षरी अहवाल",
    hero_live_state_title: "थेट बॅकएंड स्थिती",
    hero_live_badge: "थेट डेमो स्थिती",
    hero_live_cases: "सत्रातील नोंदवलेली प्रकरणे:",
    hero_live_reports: "स्वाक्षरी केलेले अहवाल:",
    hero_live_chain: "मर्कल चेन स्थिती:",
    hero_live_budget: "क्वेरी बजेट स्थिती:",
    hero_stat_dataset: "डेटा संच",
    hero_stat_baseline: "बेसलाइन",
    hero_stat_cohort: "गट आकार",
    hero_stat_evidence: "पुरावा निकष",
    hero_stat_benchmark_tag: "(निश्चित डेमो बेंचमार्क)",

    footer_desc: "कृत्रिम कल्याणकारी निर्णय मॉडेलसाठी हॅकॅथॉन प्रोटोटाइप. ऑडिट पद्धती आणि अहवाल अखंडता दाखवते; कोणत्याही शासकीय सेवेला थेट जोडलेले नाही.",
    footer_scope_heading: "मर्यादा व व्याप्ती",
    footer_modules_heading: "मॉड्यूल्स",
    footer_copyright: "कृत्रिम डेटा संच · Ed25519 डिजिटल स्वाक्षरी · मॉडेल वेट्सचा वापर नाही",
    footer_event: "IEEE Tech for Tomorrow 2026 हॅकॅथॉन · TIPPSS ट्रॅक · सायबर सुरक्षा",
  },

  hi: {
    nav_brand_title: "SENTINEL",
    nav_brand_subtitle: "जनहित निर्णय ऑडिट कार्यक्षेत्र",
    nav_tab_cases: "ऑडिट मामले",
    nav_tab_citizen: "निर्णय जांचें",
    nav_tab_auditor: "ऑडिटर कंसोल",
    nav_tab_verify: "रिपोर्ट सत्यापन",
    nav_scope_title: "वर्तमान परीक्षण दायरा",
    nav_scope_desc: "केवल स्थानीय कृत्रिम परीक्षण (Fixtures)। बाहरी सरकारी सेवाओं से जुड़ा नहीं है।",
    evidence_scoped: "चयनित मामले से संबंधित साक्ष्य",
    demo_tag: "SENTINEL · स्थानीय कृत्रिम प्रदर्शन",

    lang_select_label: "भाषा",
    lang_en: "English",
    lang_mr: "मराठी",
    lang_hi: "हिंदी",

    session_auth_as: "प्रमाणित भूमिका:",
    session_query_allowance: "प्रति ऑडिट क्वेरी सीमा",
    session_sign_out: "साइन आउट",
    session_title: "स्थानीय डेमो सत्र",
    session_desc: "यह सत्र केवल क्वेरी सीमा तय करने के लिए एक डेमो लेबल का उपयोग करता है; यह आपकी वास्तविक पहचान या पद की पुष्टि नहीं करता।",
    session_role_citizen: "नागरिक डेमो भूमिका",
    session_role_citizen_desc: "कृत्रिम ऑडिट मामला दर्ज करें और समीक्षा करें।",
    session_role_journalist: "पत्रकार / आरटीआई डेमो भूमिका",
    session_role_journalist_desc: "नियंत्रित कृत्रिम प्रदर्शन चलाएं।",
    session_role_auditor: "प्रमाणित ऑडिटर डेमो भूमिका",
    session_role_auditor_desc: "तकनीकी जांच और असमानता परीक्षण चलाएं।",
    session_role_gov: "लोक सेवा डेमो भूमिका",
    session_role_gov_desc: "केवल डेमो के लिए; आधिकारिक सरकारी पद नहीं।",
    session_label_input: "डेमो सत्र लेबल",
    session_label_placeholder: "उदा. आरटीआई समन्वयक #२१",
    session_start_btn: "डेमो सत्र शुरू करें",
    session_starting: "सत्र शुरू हो रहा है…",
    session_public_verify_notice: "सार्वजनिक रिपोर्ट सत्यापन के लिए सत्र की आवश्यकता नहीं है।",
    session_verify_link: "रिपोर्ट सत्यापित करें",
    session_need_auth_title: "स्थानीय डेमो सत्र शुरू करें",
    session_need_auth_desc: "चुनी गई भूमिका केवल स्थानीय मामलों का दायरा तय करती है। यह किसी भी प्रकार का कानूनी या आधिकारिक सत्यापन नहीं करती।",

    cases_title: "ऑडिट मामले (Audit Cases)",
    cases_subtitle: "निर्णय से संबंधित चिंता और उसका स्रोत दर्ज करें, देखें कि कौन सी जांच वास्तव में संभव है, और मानवीय समीक्षा व अनुवर्ती कार्रवाई को एक साथ रखें।",
    cases_all_button: "सभी मामले",
    cases_evidence_boundary_title: "साक्ष्य सीमा:",
    cases_evidence_boundary_desc: "यह डेमो मामले के नोट्स और स्रोत स्थानीय डेटाबेस में रखता है। यह किसी सरकारी पोर्टल या महाडीबीटी से जुड़ा नहीं है। आधार नंबर, बैंक विवरण या संवेदनशील जानकारी दर्ज न करें।",
    cases_start_title: "नया मामला दर्ज करें",
    cases_field_title: "मामले का शीर्षक",
    cases_field_title_placeholder: "इस चिंता के लिए एक संक्षिप्त, स्पष्ट नाम",
    cases_field_target: "जांची जा रही सेवा या प्रणाली",
    cases_field_target_placeholder: "योजना, संस्था या कृत्रिम परिदृश्य का नाम",
    cases_field_question: "जांच का मुख्य प्रश्न",
    cases_field_question_placeholder: "आप किस विशिष्ट अनिश्चितता को स्पष्ट करना चाहते हैं?",
    cases_field_source: "साक्ष्य का मूल स्रोत",
    cases_field_provenance: "स्रोत व प्राप्ति विवरण (Provenance Note)",
    cases_field_provenance_placeholder: "जानकारी किसने, कब और कैसे दी? केवल स्रोत का विवरण दें; मूल दस्तावेज पेस्ट न करें।",
    cases_field_reference: "संदर्भ या स्रोत पहचानकर्ता",
    cases_field_reference_optional: "(वैकल्पिक)",
    cases_field_reference_placeholder: "सार्वजनिक लिंक, प्रकाशन शीर्षक या आपका अपना संदर्भ कोड",
    cases_field_access: "अनुमति या पहुंच स्थिति",
    cases_field_access_hint: "आप जो रिपोर्ट करते हैं, यह उसे दर्ज करता है। SENTINEL कानूनी अधिकार की पुष्टि नहीं करता।",
    cases_create_btn: "मामला बनाएं",
    cases_creating_btn: "मामला बनाया जा रहा है…",
    cases_list_heading: "आपके मामले",
    cases_loading: "मामले लोड हो रहे हैं…",
    cases_empty_title: "कोई मामला नहीं बनाया गया है।",
    cases_empty_desc: "एक विशिष्ट प्रश्न के साथ शुरुआत करें और जानकारी का स्रोत दर्ज करें।",
    cases_created_on: "बनाया गया",

    source_citizen_or_ngo_report: "नागरिक या गैर-सरकारी संगठन (NGO) रिपोर्ट",
    source_public_document: "सार्वजनिक दस्तावेज / परिपत्र",
    source_public_interface: "सार्वजनिक पोर्टल / वेबसाइट",
    source_authorised_dataset: "अधिकृत डेटा संच",
    source_synthetic_demo: "SENTINEL कृत्रिम प्रदर्शन",
    source_other: "अन्य स्रोत",

    access_not_provided: "प्रदान नहीं किया गया",
    access_public_source: "सार्वजनिक स्रोत",
    access_consent_recorded: "सहमति दर्ज",
    access_written_authority: "लिखित अधिकार दर्ज",
    access_denied: "पहुंच अस्वीकृत",
    access_not_applicable: "लागू नहीं",

    status_NOT_APPLICABLE: "लागू नहीं",
    status_PREREQUISITE_MISSING: "पूर्वापेक्षित जानकारी अनुपलब्ध",
    status_ACCESS_DENIED: "पहुंच अस्वीकृत",
    status_QUOTA_EXCEEDED: "क्वेरी कोटा समाप्त",
    status_RUNNING: "चल रहा है",
    status_COMPLETED: "पूर्ण",
    status_FAILED: "विफल",
    status_DEGRADED: "सीमित",
    status_SUPERSEDED: "अधिष्ठित",

    detail_reviewed_badge: "मानवीय समीक्षा पूर्ण",
    detail_awaiting_badge: "मानवीय समीक्षा की प्रतीक्षा",
    detail_target_named: "दर्ज की गई लक्षित सेवा",
    detail_source: "साक्ष्य का स्रोत",
    detail_provenance: "स्रोत विवरण",
    detail_provenance_empty: "दर्ज नहीं किया गया",
    detail_access_state: "पहुंच / सहमति स्थिति",
    detail_reference: "संदर्भ",
    detail_proves_title: "यह मामला वर्तमान में क्या साबित कर सकता है",
    detail_proves_p1: "यह दर्ज प्रश्न और स्रोत को संरक्षित कर सकता है, और SENTINEL की अपनी कृत्रिम पंक्तियों पर परीक्षण प्रदर्शित करता है। यह ऊपर नामित वास्तविक सेवा की सीधी जांच नहीं है।",
    detail_proves_p2: "नोट्स स्थानीय SQLite में सादे पाठ में संग्रहीत हैं। यह डेमो स्टोरेज है, गोपनीय लाभार्थी रिकॉर्ड के लिए उपयुक्त नहीं है।",

    prereq_heading: "वर्तमान में क्या चलाया जा सकता है",
    prereq_subheading: "परीक्षण निष्पादन स्थिति और साक्ष्य की स्थिति दो अलग-अलग बातें हैं।",

    fixture_heading: "नियंत्रित नमूना परीक्षण (Fixture Checks)",
    fixture_desc: "दोषरहित (Clean) या ज्ञात-दोषयुक्त (Known-Flawed) नमूना चुनें। यह १०० या १०१ कृत्रिम पंक्तियों पर सटीक परीक्षण करता है। यह वास्तविक सार्वजनिक सेवा पर क्वेरी नहीं करता।",
    fixture_variant_label: "नमूना प्रकार",
    fixture_variant_flawed: "ज्ञात दोषयुक्त नियंत्रण (Known flawed)",
    fixture_variant_clean: "दोषरहित नियंत्रण (Clean control)",
    fixture_run_btn: "परीक्षण चलाएं",
    fixture_running_btn: "परीक्षण जारी है…",
    fixture_result_title: "परीक्षण परिणाम",
    fixture_result_clean_tag: "दोषरहित नियंत्रण",
    fixture_result_flawed_tag: "ज्ञात दोषयुक्त नियंत्रण",
    fixture_overall_status: "कुल साक्ष्य स्थिति:",
    fixture_verify_integrity_btn: "रिपोर्ट सत्यापन जांचें",
    fixture_download_signed_btn: "हस्ताक्षरित JSON डाउनलोड करें",
    fixture_verify_copy_label: "रिपोर्ट की JSON प्रति सत्यापित करें",
    fixture_verify_copy_hint: "सत्यापन इस सर्वर की डिजिटल कुंजी के तहत अखंडता की पुष्टि करता है; यह स्वतंत्र रूप से यह स्थापित नहीं करता कि निष्कर्ष सत्य हैं।",
    fixture_val_known_detected: "पहचाने गए ज्ञात दोष",
    fixture_val_missed: "दोषयुक्त नमूने में छूटे दोष",
    fixture_val_clean_flags: "दोषरहित नमूने में झूठे संकेत",
    fixture_val_disclaimer: "ये आंकड़े केवल इन निश्चित नमूनों पर लागू होते हैं। यह वास्तविक दुनिया की त्रुटि दर का अनुमान नहीं है।",
    fixture_executed_checks: "पूर्ण की गई जांचें",
    fixture_criterion_and_limits: "मापदंड और सीमाएं",
    fixture_criterion_source: "स्रोत",
    fixture_criterion_comparison: "तुलना",
    fixture_criterion_threshold: "सीमा",
    fixture_criterion_input: "आवश्यक इनपुट",
    fixture_criterion_supports: "यह क्या समर्थन करता है",
    fixture_reproducibility: "पुनरुत्पादन मैनिफेस्ट (Manifest)",
    fixture_limitations: "सीमाएं",

    review_heading: "मानवीय समीक्षा और प्रतिक्रिया",
    review_desc: "हस्ताक्षरित परिणाम को बदले बिना मानवीय व्याख्या या प्रतिक्रिया दर्ज करें।",
    review_notes_label: "समीक्षक नोट्स",
    review_notes_placeholder: "मानवीय समीक्षक ने क्या निष्कर्ष निकाला, और क्या अनिश्चितता बनी हुई है?",
    review_owner_label: "प्रणाली स्वामी / अधिकारी की प्रतिक्रिया",
    review_owner_placeholder: "वास्तविक उत्तर प्राप्त होने पर ही इसे दर्ज करें।",
    review_remediation_label: "अनुवर्ती स्थिति",
    review_save_reviewed_btn: "मानवीय समीक्षा पूर्ण के रूप में सहेजें",
    review_save_notes_btn: "केवल नोट्स सहेजें",

    remed_not_contacted: "संपर्क नहीं किया गया",
    remed_draft_prepared: "प्रारूप तैयार किया गया",
    remed_awaiting_response: "प्रतिक्रिया की प्रतीक्षा",
    remed_response_received: "प्रतिक्रिया प्राप्त हुई",
    remed_action_reported: "कार्रवाई रिपोर्ट की गई",
    remed_no_action_reported: "कोई कार्रवाई रिपोर्ट नहीं की गई",

    draft_heading: "सूचना का अधिकार (RTI) या शिकायत प्रारूप",
    draft_desc: "यह प्रारूप केवल एक रूपरेखा है और जानकारी मांगता है; यह दावा नहीं करता कि नामित सेवा ने कोई त्रुटि की है या आपकी ओर से कोई आवेदन दाखिल करता है।",
    draft_gen_rti_btn: "आरटीआई सूचना अनुरोध प्रारूप बनाएं",
    draft_gen_grievance_btn: "शिकायत निवारण प्रारूप बनाएं",
    draft_editor_label: "संपादन योग्य प्रारूप पाठ (एक बार में एक प्रारूप)",
    draft_editor_placeholder: "प्रारूप उत्पन्न करें, फिर कोष्ठक [ ] वाले प्रत्येक स्थान को स्वयं सत्यापित और संपादित करें।",
    draft_save_btn: "प्रारूप और अनुवर्ती सहेजें",
    draft_legal_disclaimer: "सही प्राधिकारी, वर्तमान प्रक्रिया, शुल्क और आवेदन निर्देशों की स्वयं जांच करें। यह प्रोटोटाइप कानूनी सलाह नहीं देता।",
    draft_delete_btn: "मामले के नोट्स हटाएं",
    draft_private_notes_notice: "निजी मामले के नोट्स हस्ताक्षरित सार्वजनिक रिपोर्ट में शामिल नहीं होते हैं।",
    draft_confirm_replace: "नया टेम्प्लेट बनाने से वर्तमान में प्रदर्शित प्रारूप बदल जाएगा। जारी रखें?",
    draft_confirm_delete: "क्या आप इस मामले और इसके नोट्स को हटाना चाहते हैं? पूर्व में हस्ताक्षरित रिपोर्ट लेजर में सुरक्षित रहेंगी।",

    auditor_title: "ऑडिटर कंसोल",
    auditor_subtitle: "समूह असमानता तनाव परीक्षण, कारण स्थिरता और क्वेरी बजट की वास्तविक समय में निगरानी।",
    auditor_dataset_title: "अंतर्निहित कृत्रिम मॉडल व लक्ष्य",
    auditor_dataset_desc: "८०० बेसलाइन रिकॉर्ड और प्रति समूह २०० कृत्रिम प्रोफाइल। केवल नियंत्रित प्रदर्शन।",
    auditor_dataset_tag: "कृत्रिम लक्ष्य",
    auditor_run_synthetic_btn: "समानता ऑडिट चलाएं (In-Process)",
    auditor_run_http_btn: "समानता ऑडिट चलाएं (HTTP Target)",
    auditor_running: "ऑडिट प्रगति पर है…",
    auditor_budget_title: "Rényi डिफरेंशियल प्राइवेसी क्वेरी बजट",
    auditor_budget_queries: "उपयोग की गई क्वेरी:",
    auditor_budget_epsilon: "खर्च किया गया एप्सिलॉन (Epsilon):",
    auditor_budget_note: "वर्तमान में मॉडल क्वेरी बिना शोर जोड़े निष्पादित होती हैं। यह एक खोजपूर्ण प्रोटोटाइप है, औपचारिक अंतर गोपनीयता की गारंटी नहीं।",
    auditor_fairness_heading: "समूह अस्वीकृति दर असमानताएं",
    auditor_download_json: "हस्ताक्षरित JSON डाउनलोड करें",
    auditor_download_pdf: "ऑडिट PDF डाउनलोड करें",
    auditor_baseline_rate: "बेसलाइन अस्वीकृति दर:",
    auditor_cohort_col_name: "परीक्षित समूह",
    auditor_cohort_col_tested: "परीक्षण संख्या",
    auditor_cohort_col_rate: "अस्वीकृति दर (95% CI)",
    auditor_cohort_col_gap: "असमानता अंतर",
    auditor_cohort_col_pvalue: "p-मान (z-test)",
    auditor_cohort_col_status: "स्थिति",
    auditor_status_flagged: "असमानता चिह्नित",
    auditor_status_normal: "बेसलाइन के अनुरूप",
    auditor_disclosure_title: "पद्धतिगत सीमाएं और कृत्रिम दायरा",

    citizen_title: "निर्णय जांचें (Citizen Portal)",
    citizen_subtitle: "कृत्रिम मॉडल परीक्षण पैनल। जांचें कि क्या परीक्षण प्रोफाइल डेटा मेमोराइजेशन (LiRA) संकेत ट्रिगर करते हैं।",
    citizen_intro: "केवल प्रदर्शन पैनल। वास्तविक नागरिकों या सरकारी योजनाओं का डेटा यहां उपयोग नहीं किया जाता।",
    citizen_input_heading: "आवेदन पैरामीटर (काल्पनिक प्रोफाइल)",
    citizen_income_label: "वार्षिक आय (₹)",
    citizen_household_label: "परिवार के सदस्य",
    citizen_land_label: "कृषि भूमि (एकड़)",
    citizen_years_label: "वर्तमान पते पर वर्ष",
    citizen_aadhaar_label: "आधार लिंक स्थिति",
    citizen_docs_label: "दस्तावेज सत्यापन स्थिति",
    citizen_prior_label: "पूर्व योजनाओं का लाभ",
    citizen_age_label: "आवेदक की आयु",
    citizen_run_lira_btn: "मेम्बरशिप सिग्नल जांचें (M1)",
    citizen_run_perturb_btn: "कारण स्थिरता जांचें (M2)",
    citizen_running: "गणना जारी है…",
    citizen_results_heading: "ऑडिट निष्कर्ष और सरल स्पष्टीकरण",

    verify_title: "रिपोर्ट लेजर सत्यापन",
    verify_subtitle: "क्रिप्टोग्राफिक लेजर सत्यापन। यह जांचने के लिए कि क्या सील की गई रिपोर्ट में बदलाव हुआ है, मर्कल रूट और Ed25519 डिजिटल हस्ताक्षर सत्यापित करें।",
    verify_chain_heading: "मर्कल हैश चेन स्थिति",
    verify_chain_status_valid: "लेजर चेन अखंड और वैध है",
    verify_chain_status_invalid: "चेन टूटी हुई या बदली हुई है",
    verify_root_label: "प्रकाशित मर्कल रूट:",
    verify_recheck_btn: "लेजर चेन पुनः सत्यापित करें",
    verify_tamper_heading: "नियंत्रित छेड़छाड़ प्रदर्शन (केवल डेमो)",
    verify_tamper_desc: "यह देखने के लिए कि क्रिप्टोग्राफिक सत्यापन इसे तुरंत कैसे पकड़ता है, १ बाइट में बदलाव करें।",
    verify_tamper_btn: "लेजर में १ बाइट बदलें",
    verify_reset_btn: "डेमो लेजर रीसेट करें",
    verify_pubkey_heading: "कॉन्फ़िगर की गई सर्वर पब्लिक की (Ed25519)",

    hero_title_p1: "कल्याणकारी योजना निर्णयों की ऑडिट",
    hero_title_p2: "कृत्रिम डेटा के माध्यम से कैसे होती है, देखें।",
    hero_desc: "एक स्वयंसेवक या आरटीआई सहायक परिवार के साथ बैठता है। SENTINEL बिना सरकारी पासवर्ड या मॉडल वेट्स के बाहरी जांच करता है। परिवार को सरल भाषा में PDF और तैयार आरटीआई प्रारूप मिलता है।",
    hero_launch_btn: "ऑडिट सैंडबॉक्स शुरू करें",
    hero_verify_btn: "स्कैन व सत्यापित करें",
    hero_trust_synthetic: "कृत्रिम परीक्षण मॉडल",
    hero_trust_no_real: "कोई वास्तविक नागरिक डेटा नहीं",
    hero_trust_signed: "डिजिटल हस्ताक्षरित रिपोर्ट",
    hero_live_state_title: "लाइव बैकएंड स्थिति",
    hero_live_badge: "लाइव डेमो स्थिति",
    hero_live_cases: "सत्र में दर्ज मामले:",
    hero_live_reports: "लेजर में सीलबंद रिपोर्टें:",
    hero_live_chain: "मर्कल चेन स्थिति:",
    hero_live_budget: "क्वेरी बजट स्थिति:",
    hero_stat_dataset: "डेटा संच",
    hero_stat_baseline: "बेसलाइन",
    hero_stat_cohort: "समूह आकार",
    hero_stat_evidence: "साक्ष्य मापदंड",
    hero_stat_benchmark_tag: "(निश्चित डेमो बेंचमार्क)",

    footer_desc: "कृत्रिम कल्याणकारी निर्णय मॉडल के लिए हैकाथॉन प्रोटोटाइप। ऑडिट विधियों और रिपोर्ट अखंडता को प्रदर्शित करता है; किसी भी सार्वजनिक सेवा से सीधे जुड़ा नहीं है।",
    footer_scope_heading: "दायरा व सीमाएं",
    footer_modules_heading: "मॉड्यूल्स",
    footer_copyright: "कृत्रिम डेटा संच · Ed25519 डिजिटल हस्ताक्षर · कोई मॉडल वेट्स एक्सेस नहीं",
    footer_event: "IEEE Tech for Tomorrow 2026 हैकाथॉन · TIPPSS ट्रैक · साइबर सुरक्षा",
  },
};

/**
 * Returns a localized RTI or grievance draft template with proper placeholders.
 */
export function getLocalizedDraftTemplate(
  item: { investigation_question: string },
  kind: "rti" | "grievance",
  lang: Language
): string {
  const rti = kind === "rti";

  if (lang === "mr") {
    return [
      "प्रति: [संबंधित सक्षम प्राधिकारी / जन माहिती अधिकाऱ्याचे नाव व कार्यालय]",
      rti
        ? "विषय: [सार्वजनिक योजना / प्रक्रिया] बाबत माहिती अधिकार अधिनियम, २००५ अंतर्गत माहिती मिळण्याबाबत"
        : "विषय: [योजना / संदर्भ क्रमांक] संदर्भातील निर्णय पुनरावलोकन व स्पष्टीकरणाबाबत अर्ज",
      "",
      ...(rti
        ? [
            "मी [योजना, संबंधित कार्यालय व कालावधी] बाबत खालील अधिकृत माहितीची मागणी करत आहे:",
            "१. संबंधित योजनेचे छापील व वैध पात्रता निकष आणि [कालावधी] दरम्यान लागू असलेली नियमावली आवृत्ती.",
            "२. या सेवेच्या अर्जावर किंवा नोटीसवर दर्शविल्या जाणाऱ्या विविध स्थितींचे (Status) अधिकृत अर्थ व व्याख्या.",
            "३. अर्जातील चुकीची माहिती किंवा स्थिती दुरुस्त करण्यासाठी आणि पुनरावलोकनासाठी अधिकृत कार्यपद्धती.",
            "४. [कालावधी] दरम्यान प्राप्त झालेले अर्ज, दुरुस्त्या, अपिले आणि फेरआदेशांची एकत्रित (Aggregate) आकडेवारी.",
          ]
        : [
            "मी खालील बाबींच्या पुनरावलोकन किंवा स्पष्टीकरणाची विनंती करत आहे: [आपण प्रत्यक्ष अनुभवलेली वस्तुस्थिती, दिनांक व संदर्भ क्रमांकासह थोडक्यात लिहा].",
            "कृपया या निर्णयासाठी लागू केलेले नियम आणि नोंदवलेले कारण स्पष्ट करावे.",
            "अर्जातील चुकीची नोंद दुरुस्त करण्यासाठी काय प्रक्रिया आहे आणि कोठे अपील करावे याबद्दल मार्गदर्शन मिळावे.",
            "अपेक्षित तोडगा: [तुम्हाला अपेक्षित असलेले स्पष्टीकरण किंवा दुरुस्ती येथे नमूद करा].",
          ]),
      "",
      `अर्जदाराने नोंदवलेली मुख्य शंका (SENTINEL ने स्वतः तपासलेली नाही): ${item.investigation_question}`,
      "",
      "महत्त्वाची सूचना: हा केवळ एक संपादनक्षम मसुदा आहे; SENTINEL ने प्रत्यक्ष घटनांची तपासणी केलेली नाही किंवा यंत्रणेत त्रुटी असल्याचा निष्कर्ष काढलेला नाही. कंसामधील [ ] प्रत्येक माहिती अचूक भरा, सक्षम अधिकारी व चालू अर्ज प्रक्रिया तपासा, आणि जी माहिती जाहीर करायची नसेल ती काढून टाका. गोपनीय किंवा संवेदनशील वैयक्तिक माहिती अधिकृत खात्री केल्याशिवाय प्रविष्ट करू नका.",
      "",
      "नाव: [अर्जदाराचे पूर्ण नाव]",
      "पत्ता: [पत्रव्यवहाराचा पत्ता व संपर्क]",
      "दिनांक: [दिनांक]",
    ].join("\n");
  }

  if (lang === "hi") {
    return [
      "सेवा में: [संबंधित सक्षम प्राधिकारी / जन सूचना अधिकारी का नाम व कार्यालय]",
      rti
        ? "विषय: [सार्वजनिक योजना / प्रक्रिया] के संबंध में सूचना का अधिकार अधिनियम, २००५ के अंतर्गत जानकारी हेतु"
        : "विषय: [योजना / संदर्भ संख्या] से संबंधित निर्णय समीक्षा एवं स्पष्टीकरण बाबत आवेदन",
      "",
      ...(rti
        ? [
            "मैं [योजना, संबंधित क्षेत्र एवं समयावधि] के संबंध में निम्नलिखित अभिलेखों या जानकारी का अनुरोध करता/करती हूँ:",
            "१. लिखित पात्रता मानदंड एवं [समयावधि] के दौरान प्रभावी नियमों का अधिकृत संस्करण.",
            "२. इस सेवा के नोटिस या आवेदन रिकॉर्ड में उपयोग की जाने वाली विभिन्न स्थितियों (Status) की अधिकृत परिभाषाएं.",
            "३. किसी गलत स्थिति को ठीक करने या समीक्षा का अनुरोध करने के लिए प्रकाशित आधिकारिक प्रक्रिया.",
            "४. [समयावधि] के दौरान प्राप्त आवेदनों, सुधारों, अपीलों और पुनर्जारी नोटिसों की कुल संख्यात्मक जानकारी.",
          ]
        : [
            "मैं निम्नलिखित मामले की समीक्षा या स्पष्टीकरण का अनुरोध करता/करती हूँ: [आपने जो प्रत्यक्ष देखा, दिनांक और संदर्भ संख्या सहित उसका संक्षिप्त विवरण].",
            "कृपया लागू मापदंड और निर्णय के लिए दर्ज कारण स्पष्ट करने की कृपा करें.",
            "कृपया बताएं कि किसी अशुद्ध रिकॉर्ड को कैसे सुधारा जा सकता है और इसके लिए कौन सी अपील प्रक्रिया उपलब्ध है.",
            "वांछित समाधान: [वह स्पष्टीकरण या सुधार जो आप चाहते हैं, यहां लिखें].",
          ]),
      "",
      `प्रारूपकर्ता द्वारा दर्ज मुख्य प्रश्न (SENTINEL द्वारा सत्यापित नहीं): ${item.investigation_question}`,
      "",
      "महत्वपूर्ण सूचना: यह केवल एक संपादन योग्य प्रारूप है; SENTINEL ने घटनाओं की पुष्टि नहीं की है और न ही किसी सेवा में गलती का दावा किया है। कोष्ठक [ ] वाले प्रत्येक स्थान को सही जानकारी से बदलें, सही प्राधिकारी व वर्तमान आवेदन प्रक्रिया की पुष्टि करें, और जो जानकारी आप नहीं देना चाहते उसे हटा दें। आधिकारिक प्रक्रिया की जांच किए बिना संवेदनशील व्यक्तिगत जानकारी न दें।",
      "",
      "नाम: [आवेदक का पूरा नाम]",
      "पता: [पत्राचार हेतु पता व संपर्क]",
      "दिनांक: [दिनांक]",
    ].join("\n");
  }

  // English fallback
  return [
    "To: [Name of the relevant public authority / officer]",
    rti
      ? "Subject: Request for information about [public service or process]"
      : "Subject: Request for review or clarification about [service or reference]",
    "",
    ...(rti
      ? [
          "I request the following records or information concerning [service, location, and date range]:",
          "1. The written eligibility criteria and the version in force during [date range].",
          "2. The fields and status definitions used in notices or application records for this service.",
          "3. The published process for correcting an inaccurate status or requesting a review.",
          "4. Any aggregate information available about corrections, appeals, or notice re-issues during [date range].",
        ]
      : [
          "I request review or clarification of the following matter: [describe only events you personally observed, with dates and any reference number].",
          "Please explain the applicable criteria and the reason recorded for the decision, if available.",
          "Please advise how an inaccurate record can be corrected and what review or appeal process applies.",
          "Requested resolution: [state the clarification, correction, or review you are asking for].",
        ]),
    "",
    `Question recorded by the drafter (not verified by SENTINEL): ${item.investigation_question}`,
    "",
    "This is an editable draft only; SENTINEL has not verified the events or established an error in the named service. Replace every bracketed field with accurate information, confirm the correct authority and current filing requirements, and remove anything you do not wish to disclose. Do not include sensitive personal information unless you have checked the official process and chosen to provide it.",
    "",
    "Name: [Applicant name]",
    "Contact address: [Address for reply]",
    "Date: [Date]",
  ].join("\n");
}
