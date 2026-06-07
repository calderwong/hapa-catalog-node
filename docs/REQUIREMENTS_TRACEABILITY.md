# Requirements Traceability

Source requirements: `../outputs/hapa_catalog_item_master_requirements.md` from the parent workspace.

| Requirement Area | MVP Evidence |
| --- | --- |
| Hapa node identity | `hapa-node.json`, `manifest.json`, `/health`, `/capabilities`, CLI health/capabilities |
| Ingestion | `POST /v1/import-batches`, CLI `import`, CSV/JSON parsing, validation/quarantine |
| Mapping workbench | `import_mappings`, `/v1/import-mappings`, `/v1/import-mappings/preview`, CLI `mapping`, Web Workbench preview |
| Global item master | SQLite product/SKU/packaging/supplier/relationship records |
| Digital product objects | `digital_products`, `/v1/digital-products`, CLI `digital list`, item inspector linkage |
| Inventory | SQLite inventory positions/events and item detail inventory view |
| Browse/display | Web UI item list, detail inspector, search, inventory, forecast panels |
| Roles/identities/permissions | Seeded RBAC tables, list routes, write-route scope enforcement, `auth.denied` audit |
| Hapa card governance placement | `hapa_cards`, `hapa_card_placements`, Cards web tab, `/v1/hapa-decision-context`, `/v1/hapa-decisions/run`, CLI `cards`/`decisions`/`processes` |
| Forecasting | Forecast run/scenario API and CLI with assumptions/confidence/drivers |
| Forecast quality loop | `/v1/forecasts/actuals`, `/v1/forecasts/quality`, CLI actuals/quality, remediation events |
| Match/merge survivorship | `/v1/mdm/detect-duplicates`, `/v1/mdm/duplicates`, `/v1/mdm/merge`, `merge_events` |
| Connector contracts | `/v1/connectors/contracts`, `/v1/connectors/validate`, fixture contracts under `data/fixtures/connectors` |
| Performance targets | `/v1/performance/reports`, CLI `performance report`, `npm run performance:smoke` |
| Market price history | `item_identifiers`, `market_price_snapshots`, `market_price_points`, `/v1/market/retrieve`, `/v1/market/prices`, CLI `market retrieve`, web Market tab |
| Amazon listing/media enrichment | `market_listing_snapshots`, `media_assets`, `/v1/market/amazon-listing/retrieve`, `/v1/market/listing`, CLI `market amazon-listing`, item detail media gallery |
| Provenance/audit | `audit_events`, import batch lineage, mutation audit |
| Web and desktop | `web/*`, `electron/main.cjs`, npm scripts |
| Tests | `test/*.mjs`, CLI `self-test` |
| Kanban | Overwatch project config and append-only `events.ndjson` |
| Runbook | `docs/RUNBOOK.md` |
| HCAT-040 Schema migrations | `schema_migrations`, `/v1/schema/migrations`, CLI `schema apply`, rollback metadata |
| HCAT-041 Bulk import review | `import_review_rows`, `/v1/import-review`, CLI `import-review`, Ops tab |
| HCAT-042 Live connector dry-run | `connector_runs`, `/v1/connectors/run`, CLI `connectors run`, fixture-backed adapter |
| HCAT-043 Identity sessions | `identity_sessions`, `/v1/identity-sessions`, CLI `sessions`, token rotation audit |
| HCAT-044 Forecast actuals/model comparison | `forecast_actuals`, `forecast_model_comparisons`, `/v1/forecasts/model-comparisons` |
| HCAT-045 Resilient marketplace enrichment | `market_provider_runs`, provider status/cache keys, challenge-safe retrieval audit |
| HCAT-046 Performance benchmark | `performance_reports`, `/v1/performance/reports`, CLI `performance report` |
| HCAT-047 Hapa Lance projections | `projection_exports`, `/v1/projections/sync`, CLI/API sync to `hapa-lance-node` target |
| HCAT-048 Seasonality/promotions | Forecast model v2 drivers and CLI/API `forecast compare` |
| HCAT-049 Pricing intelligence | `pricing_scenarios`, `/v1/pricing/scenarios`, margin and market average constraints |
| HCAT-050 Catalog lifecycle workflow | `lifecycle_events`, `/v1/lifecycle/events`, SKU status transitions |
| HCAT-051 Publishing cockpit | `publishing_runs`, `/v1/publishing/runs`, storefront readiness payload previews |
| HCAT-052 Telemetry registration | `telemetry_registrations`, `/v1/telemetry/registrations`, heartbeat payloads |
| HCAT-053 Tenancy | `organizations`, `identity_tenants`, `/v1/organizations` |
| HCAT-054 Inventory ledger | `inventory_ledger_events`, `inventory_reconciliations`, `/v1/inventory/ledger`, `/v1/inventory/reconciliations` |
| HCAT-055 Quality rules/work orders | `quality_rules`, `quality_work_orders`, `/v1/quality/rules`, `/v1/quality/evaluate` |
| HCAT-056 Offline desktop distribution | `desktop_packages`, `/v1/desktop/packages`, CLI `desktop package`, Electron wrapper |
| HCAT-057 Lineage/retention/backup | `lineage_exports`, `retention_policies`, `backup_runs`, `/v1/lineage/exports`, `/v1/retention/policies`, `/v1/backups` |
| HCAT-062 Architecture review packet | `next_cycle_artifacts.artifact_type=review_packet`, `/v1/next-cycle/run`, CLI `next-cycle run --phase review` |
| HCAT-063 API and connector contract snapshot | `contract_snapshot` artifact with capabilities endpoints, connector contracts, and RBAC scopes |
| HCAT-064 Schema and migration review report | `schema_review_report` artifact with table groups, rollback strategy, and query paths |
| HCAT-065 Demo walkthrough | `demo_walkthrough` artifact with seeded review steps and expected web/desktop surfaces |
| HCAT-066 Security and threat model review | `threat_model` artifact with assets, actors, trust boundaries, and mitigations |
| HCAT-067 Review gates and acceptance metrics | `review_gates` artifact plus `review_readiness_smoke` test-run row |
| HCAT-068 Connector runtime/credential vault stub | `connector_plugin_runtime` artifact; credential refs use `credref://` and `stores_plain_secret=false` |
| HCAT-069 Provider-compliant enrichment queue | `market_enrichment_queue` artifact with retry/challenge-safe rules |
| HCAT-070 ERP/WMS delta sync replay | `connector_delta_replay` artifact plus dry-run connector run evidence |
| HCAT-071 Hapa Lance projection replay | `hapa_lance_projection_replay` artifact and `/v1/projections/sync` exports |
| HCAT-072 Telemetry heartbeat monitor | `telemetry_heartbeat_monitor` artifact and `/v1/telemetry/registrations` registration |
| HCAT-073 Connector observability dashboard | `connector_observability_dashboard` artifact and Ops connector timeline rows |
| HCAT-074 SKU lifecycle approval workflow | `lifecycle_approval_workflow` artifact, lifecycle event seed, and Hapa card decision context |
| HCAT-075 Quality rule builder workflow | `quality_rule_builder` artifact and seeded configurable rule assignment payload |
| HCAT-076 Workspace boundaries/supplier invitation | `supplier_invitation_flow` artifact with organization and tenant boundary policy |
| HCAT-077 Inventory ledger replay/compaction | `inventory_ledger_replay` artifact with ledger event and reconciliation evidence |
| HCAT-078 Retention/legal hold/deletion drill | `retention_legal_hold_drill` artifact and legal-hold-capable retention policy |
| HCAT-079 Audit review board/attestations | `audit_attestation_board` artifact with filters, attestation scopes, and recent audit rows |
| HCAT-080 Forecast feature store | `forecast_feature_store` artifact with actuals, promotions, seasonality, and lead-time features |
| HCAT-081 Backtesting/champion-challenger | `model_backtest_champion` artifact and `forecast_model_comparisons` record |
| HCAT-082 Pricing workbench | `pricing_workbench` artifact and `pricing_scenarios` record |
| HCAT-083 In-stock risk cycle with card review | `instock_risk_cycle` artifact and `inventory.instock.cycle` decision run |
| HCAT-084 Channel readiness cockpit | `channel_validation_cockpit` artifact and publishing run readiness payload |
| HCAT-085 Browser E2E web/desktop parity | `web_desktop_e2e_tests` artifact and `scripts/web-e2e-smoke.mjs` / `npm run web:e2e` |
| HCAT-086 Signed desktop/updater pipeline | `signed_desktop_updater` artifact and `desktop_packages.status=signed_metadata_ready` |
| HCAT-087 Backup restore drill runner | `backup_restore_drill_runner` artifact and backup run drill metadata |
| HCAT-088 Review issue templates/checklist | `review_issue_templates` artifact with release checklist and review template fields |
| HCAT-089 Pilot launch playbook/metrics | `pilot_launch_playbook` artifact with pilot workflows, metrics, and rollback plan |
| HCAT-090 Pilot workspace seed pack | `pilot_workspace_seed_pack` artifact, CLI/API `next-cycle run --phase continuation`, web Ops `Continue` |
| HCAT-091 Supplier onboarding checklist | `supplier_onboarding_checklist` artifact with role, import, validation, and governance evidence |
| HCAT-092 Data contract diff report | `data_contract_diff_report` artifact comparing endpoints, connector contracts, schema groups, and board events |
| HCAT-093 Connector credential health | `connector_credential_health` artifact with `credref://` references and `stores_plain_secret=false` checks |
| HCAT-094 Agent runbook library | `agent_runbook_library` artifact for forecast, in-stock, SKU review, and publishing cycles |
| HCAT-095 Card policy simulation | `card_policy_simulation` artifact with routed cards, review requirements, and conflict list |
| HCAT-096 Decision review queue | `decision_review_queue` artifact and `hapa_decision_runs` sample decision evidence |
| HCAT-097 Card-owner notification digest | `card_owner_notification_digest` artifact with owner reason, cadence, and action mode |
| HCAT-098 Forecast/publishing exception queue | `planning_exception_queue` artifact for forecast misses, stock risk, and publishing blockers |
| HCAT-099 Product media QA pack | `product_media_qa_pack` artifact covering image, document, alt text, duplicate URL, and provenance checks |
| HCAT-100 Identity federation plan | `identity_federation_plan` artifact with local identity map and future SSO/supplier invite providers |
| HCAT-101 Consent/audit export bundle | `consent_audit_export_bundle` artifact and lineage export evidence |
| HCAT-102 API quota/rate limit policy | `api_quota_rate_limit_policy` artifact with caller classes, limits, retry, and audit behavior |
| HCAT-103 Desktop offline sync manifest | `desktop_offline_sync_manifest` artifact and desktop package manifest evidence |
| HCAT-104 E2E fixture generator | `e2e_fixture_generator` artifact and `scripts/web-e2e-smoke.mjs` action coverage |
| HCAT-105 Load test matrix | `load_test_matrix` artifact and `performance_reports` sample |
| HCAT-106 Pilot cohort dashboard | `pilot_cohort_dashboard` artifact with cohort, workflow, and success signal scaffolds |
| HCAT-107 Risk register/escalation log | `risk_register_escalation_log` artifact with severity, owner, mitigation, and escalation path |
| HCAT-108 Training/demo outline | `training_demo_outline` artifact with operator modules, exercises, and acceptance checks |
| HCAT-109 Post-pilot roadmap intake | `post_pilot_roadmap_intake` artifact with findings, evidence, owner, and next-cycle decision fields |

## Review Prep Traceability

| Review Prep Card | Evidence |
| --- | --- |
| HCAT-110 Executive review narrative | `executive_review_narrative` artifact with storyline, proof points, and review asks |
| HCAT-111 Architecture decision map | `architecture_decision_map` artifact with decisions, rejected options, and open decisions |
| HCAT-112 Reviewer persona packets | `reviewer_persona_packets` artifact for product, security, data, integration, operations, and strategy reviewers |
| HCAT-113 Live demo choreography | `live_demo_choreography` artifact with run-of-show, fixtures, fallbacks, and screenshots |
| HCAT-114 Review evidence index | `review_evidence_index` artifact linking docs, API routes, CLI commands, tests, and board checkpoint |
| HCAT-115 Design partner pilot workflows | `design_partner_pilot_workflows` artifact covering import review, SKU governance, in-stock, forecast, and publishing dry-run |
| HCAT-116 Pilot data acceptance gates | `pilot_data_acceptance_gates` artifact with pass/fail thresholds and remediation paths |
| HCAT-117 Pilot connector activation matrix | `pilot_connector_activation_matrix` artifact ranking ERP, WMS, supplier, marketplace, and BI candidates |
| HCAT-118 Pilot operating agreement | `pilot_operating_agreement` artifact covering roles, cadence, data boundaries, escalation, and exit terms |
| HCAT-119 Pilot measurement plan | `pilot_measurement_plan` artifact with metrics, baselines, targets, owners, and collection sources |
| HCAT-120 Agent ownership model | `agent_ownership_model` artifact with accountable human, card owner, process owner, and organization layers |
| HCAT-121 Card placement policy spec | `card_placement_policy_spec` artifact with placement types, priority resolution, review modes, and conflicts |
| HCAT-122 Agent memory/context boundaries | `agent_context_boundaries` artifact with allowed context, redaction, audit rules, and consent policy |
| HCAT-123 Decision SLA/escalation model | `decision_sla_escalation_model` artifact with due times, stale queue handling, and seeded processes |
| HCAT-124 Agent operations review checklist | `agent_ops_review_checklist` artifact with routing, context quality, safety, conflict, and accountability checks |
| HCAT-125 Integration sandbox contract | `integration_sandbox_contract` artifact with credential, dry-run, replay, rollback, and observability contract |
| HCAT-126 Canonical identifier authority model | `canonical_identifier_authority_model` artifact with authority rank, survivorship, and conflict policy |
| HCAT-127 Forecast feature governance | `forecast_feature_governance` artifact with feature ownership, freshness, backtesting, and Hapa card review |
| HCAT-128 Retention and export controls | `retention_export_controls` artifact with retention classes, export controls, and deletion drill |
| HCAT-129 Resilience and restore review | `resilience_restore_review` artifact with backup, restore, replay, conflict, and board reconstruction review paths |
| HCAT-130 Product packaging roadmap | `product_packaging_roadmap` artifact with local MVP, pilot build, design partner release, and managed node stages |
| HCAT-131 API versioning compatibility plan | `api_versioning_compatibility_plan` artifact with route count, compatibility policy, and contract snapshots |
| HCAT-132 Admin UX backlog | `admin_ux_backlog` artifact with dashboard, queue, policy editor, audit export, and connector observability priorities |
| HCAT-133 Next-cycle test strategy | `next_cycle_test_strategy` artifact with unit, API, browser, desktop, performance, and restore layers |
| HCAT-134 Next drain acceptance rubric | `next_drain_acceptance_rubric` artifact with done criteria for artifacts, code, docs, tests, and board evidence |

## Review Execution Traceability

| Review Execution Card | Evidence |
| --- | --- |
| HCAT-135 Review room briefing deck outline | `review_room_briefing_deck_outline` artifact with product narrative, architecture proof, demo path, evidence map, route map, and decision asks |
| HCAT-136 Review question log template | `review_question_log_template` artifact with reviewer, topic, decision, owner, severity, evidence link, and follow-up card fields |
| HCAT-137 Live demo rehearsal checklist | `live_demo_rehearsal_checklist` artifact with preflight, browser path, CLI fallback, recovery, and evidence capture |
| HCAT-138 Review decision register | `review_decision_register` artifact with seeded pilot, credential, provider, and tenancy decisions |
| HCAT-139 Review issue intake workflow | `review_issue_intake_workflow` artifact with triage states, severity rules, card template, and append-only rule |
| HCAT-140 Design partner data room checklist | `design_partner_data_room_checklist` artifact with folders, owners, required docs, statuses, and gap policy |
| HCAT-141 Partner-facing pilot scope one-pager | `partner_pilot_scope_one_pager` artifact with in-scope workflows, non-goals, time commitment, success metrics, and support model |
| HCAT-142 Pilot security appendix plan | `pilot_security_appendix_plan` artifact with boundaries, evidence, unresolved choices, and pilot controls |
| HCAT-143 Pilot success dashboard spec | `pilot_success_dashboard_spec` artifact with metrics, sources, filters, targets, and acceptance states |
| HCAT-144 Pilot support and escalation model | `pilot_support_escalation_model` artifact with owners, service windows, escalation path, rollback triggers, and connector candidates |
| HCAT-145 Production credential vault direction | `production_credential_vault_direction` artifact comparing local env/file, OS keychain, managed vault, and connector secret references |
| HCAT-146 Deployment topology direction | `deployment_topology_direction` artifact with pilot default, topology options, migration path, and constraints |
| HCAT-147 Event bus and projection architecture | `event_bus_projection_architecture` artifact with event names, producers, consumers, replay policy, and projection contracts |
| HCAT-148 Marketplace provider compliance architecture | `marketplace_provider_compliance_architecture` artifact with allowed paths, forbidden paths, queue policy, and market API routes |
| HCAT-149 Multi-tenant production boundary model | `multi_tenant_boundary_model` artifact with entities, boundary rules, pilot mode, and production next steps |
| HCAT-150 Admin policy editor backlog | `admin_policy_editor_backlog` artifact with policy editor surfaces, priorities, acceptance criteria, and seeded card placements |
| HCAT-151 Decision review queue UX | `decision_review_queue_ux` artifact with queue states, filters, actions, evidence display, and sample decision count |
| HCAT-152 Data quality command center UX | `data_quality_command_center_ux` artifact mapping import, MDM, media, forecast, and remediation workstreams to owners/evidence |
| HCAT-153 Connector observability UX | `connector_observability_ux` artifact with views, metrics, actions, error states, and recent connector runs |
| HCAT-154 Audit export and review bundle UX | `audit_export_review_bundle_ux` artifact with bundle steps, filters, redaction, approvals, and retention behavior |
| HCAT-155 Next build-cycle implementation map | `next_build_cycle_implementation_map` artifact grouping next work by core, API, web, desktop, docs, and tests |
| HCAT-156 Next cycle dependency graph | `next_cycle_dependency_graph` artifact with dependency nodes, edges, parallel work, and risk order |
| HCAT-157 Next cycle acceptance test plan | `next_cycle_acceptance_test_plan` artifact with core, API, browser, desktop, performance, and board-evidence checks |
| HCAT-158 Next cycle risk burn-down plan | `next_cycle_risk_burndown_plan` artifact with risks, owners, mitigations, verification, and next board-card policy |
| HCAT-159 Next cycle board fill rubric | `next_cycle_board_fill_rubric` artifact with source, phase, priority, acceptance, and append-only criteria |

## Review Readout Traceability

| Card | Implemented Evidence |
| --- | --- |
| HCAT-160 Review readout packet | `review_readout_packet` artifact with review decisions, open questions, risks, evidence links, next-cycle asks, and board snapshot |
| HCAT-161 Decision register to ADR queue | `decision_register_adr_queue` artifact with ADR ids, owners, impacted surfaces, status, implementation impact, and source evidence |
| HCAT-162 Review finding severity matrix | `review_finding_severity_matrix` artifact with P0-P3 severity/SLA rules, domains, and board conversion fields |
| HCAT-163 Pilot kickoff sign-off gates | `pilot_kickoff_signoff_gates` artifact with architecture, security, data quality, support/rollback, and partner-scope gates |
| HCAT-164 Reviewer follow-up owner map | `reviewer_followup_owner_map` artifact connecting review domains to owners, loops, due dates, and unresolved-question policy |
| HCAT-165 Design partner kickoff agenda | `design_partner_kickoff_agenda` artifact covering goals, workflows, data boundaries, success measures, support, and feedback capture |
| HCAT-166 Pilot environment readiness checklist | `pilot_environment_readiness_checklist` artifact covering node health, auth, fixtures, web/desktop access, backups, and board checkpoint checks |
| HCAT-167 Pilot data sharing and redaction checklist | `pilot_data_sharing_redaction_checklist` artifact defining data classes, sharing rules, redactions, approvals, and retention notes |
| HCAT-168 Partner feedback capture loop | `partner_feedback_capture_loop` artifact with intake fields, cadence, finding types, severity, owner assignment, and board conversion policy |
| HCAT-169 Pilot rollback and pause protocol | `pilot_rollback_pause_protocol` artifact with pause triggers, pause steps, rollback steps, and resume criteria |
| HCAT-170 Event bus and projection implementation priority | `event_bus_projection_alpha_slice` artifact with first events, first consumers, implementation steps, tests, and dependencies |
| HCAT-171 Credential resolver and keychain priority | `credential_resolver_keychain_alpha_slice` artifact with credential-ref storage contract, resolver APIs, desktop behavior, tests, and routes |
| HCAT-172 Decision review queue implementation priority | `decision_review_queue_implementation_plan` artifact with data model, API routes, web surfaces, actions, and tests |
| HCAT-173 Admin quality command center implementation priority | `admin_quality_command_center_implementation_plan` artifact mapping import review, MDM merge, media QA, forecast quality, and work orders |
| HCAT-174 Connector observability implementation priority | `connector_observability_implementation_plan` artifact with connector ids, views, data sources, actions, and redaction tests |
| HCAT-175 Security review evidence binder | `security_review_evidence_binder` artifact mapping auth, credentials, provider compliance, local storage, audit/export, and desktop evidence |
| HCAT-176 Tenant isolation verification plan | `tenant_isolation_verification_plan` artifact with fixtures, denial/redaction checks, card placement boundaries, and expected evidence |
| HCAT-177 Provider compliance audit checklist | `provider_compliance_audit_checklist` artifact with allowed retrieval paths, blocked-state handling, cache TTL, no-bypass rules, and forbidden paths |
| HCAT-178 Backup restore and export attestation plan | `backup_restore_export_attestation_plan` artifact with drill sequence, export manifest fields, attestation fields, and retention classes |
| HCAT-179 Audit bundle redaction policy draft | `audit_bundle_redaction_policy_draft` artifact covering secrets, supplier private fields, tenant records, legal-hold records, provider challenge content, and approvals |
| HCAT-180 Automated evidence bundle runner plan | `automated_evidence_bundle_runner_plan` artifact defining command surfaces, inputs, outputs, and freshness checks |
| HCAT-181 Board-driven release gate automation | `board_driven_release_gate_automation` artifact connecting done counts, checkpoint title, tests, blocked cards, review findings, outputs, and append-only rule |
| HCAT-182 Review metrics telemetry plan | `review_metrics_telemetry_plan` artifact defining readiness, decision latency, feedback closure, pilot gate, and board drain quality metrics |
| HCAT-183 Next-cycle test fixture expansion | `next_cycle_test_fixture_expansion` artifact defining tenant isolation, provider blocked-state, decision queue, connector failure, and audit export fixtures |
| HCAT-184 Post-review board refill procedure | `post_review_board_refill_procedure` artifact defining append-only refill steps, card fields, and idempotency rule |

## Review Prep And Alpha Build Traceability

| Review Alpha Card | Evidence |
| --- | --- |
| HCAT-185 Implement evidence bundle runner | `evidence_bundle_runner` artifact, `review_evidence_bundles` table, `/v1/review/evidence-bundles`, CLI `review evidence-bundle` |
| HCAT-186 Add evidence bundle API, CLI, and web surfaces | `evidence_bundle_surfaces` artifact, Ops `Alpha` action, API/CLI/web/desktop parity notes |
| HCAT-187 Define bundle manifest and redaction schema | `bundle_manifest_redaction_schema` artifact with manifest keys, redaction manifest, forbidden fields, and retention class |
| HCAT-188 Embed board checkpoint evidence in bundles | `board_checkpoint_bundle_embedding` artifact with board summary, checkpoint id/title, and append-only source path |
| HCAT-189 Create review-room dashboard acceptance tests | `review_room_dashboard_acceptance_tests` artifact plus `review_evidence_automation_smoke` and web/API smoke coverage |
| HCAT-190 Implement event envelope and append API | `event_envelope_append_api` artifact, `event_envelopes` table, `/v1/events`, CLI `events append` |
| HCAT-191 Implement projection consumer checkpoints | `projection_consumer_checkpoints` artifact, `projection_checkpoints` table, `/v1/projection-checkpoints`, CLI `projection checkpoint` |
| HCAT-192 Implement credential reference resolver interface | `credential_ref_resolver_interface` artifact, `credential_refs` table, `/v1/credential-refs`, CLI `credentials ref` |
| HCAT-193 Add secret redaction guard tests | `secret_redaction_guard_tests` artifact and core/API tests proving secret-shaped metadata is redacted |
| HCAT-194 Add API compatibility contract tests | `api_compatibility_contract_tests` artifact, capability endpoint assertions, route smoke coverage |
| HCAT-195 Implement decision review queue data model | `decision_review_queue_data_model` artifact, `decision_queue_items` table, `/v1/decision-review-queue` |
| HCAT-196 Build decision queue web and desktop UX | `decision_queue_web_desktop_ux` artifact, Ops decision rows, desktop smoke parity, queue action route |
| HCAT-197 Build admin quality command center | `admin_quality_command_center` artifact linking quality rules, work orders, forecast quality events, and decision queue items |
| HCAT-198 Connect work orders to board follow-up cards | `work_order_board_followup_bridge` artifact with append-only follow-up card policy and source work-order ids |
| HCAT-199 Expand forecast and quality fixtures | `forecast_quality_fixture_expansion` artifact with imported actuals, quality events, and remediation fixtures |
| HCAT-200 Implement tenant isolation verification fixtures | `tenant_isolation_verification_fixtures` artifact and `trust_attestations.attestation_type=tenant_isolation_verification` |
| HCAT-201 Build audit bundle export and redaction manifest | `audit_bundle_redaction_manifest` artifact and `review_evidence_bundles.bundle_type=audit-redaction` |
| HCAT-202 Record provider compliance run attestations | `provider_compliance_run_attestations` artifact with `challenge bypass` forbidden evidence and provider compliance attestation |
| HCAT-203 Implement backup restore verification runner | `backup_restore_verification_runner` artifact and `backup_runs` recovery drill evidence |
| HCAT-204 Generate security evidence binder | `security_evidence_binder_generator` artifact and `trust_attestations.attestation_type=security_evidence_binder` |
| HCAT-205 Assemble design partner kickoff packet | `design_partner_kickoff_packet` artifact and `pilot_runbooks.packet` kickoff material |
| HCAT-206 Create pilot runbook scheduler | `pilot_runbook_scheduler` artifact, `pilot_runbooks` table, `/v1/pilot/runbooks`, CLI `pilot runbook` |
| HCAT-207 Implement board-driven release gate evaluator | `board_release_gate_evaluator` artifact, `release_gate_evaluations` table, `/v1/release-gates/evaluations` |
| HCAT-208 Add next-cycle review metrics dashboard | `next_cycle_review_metrics_dashboard` artifact with Ops, board, decision, trust, artifact, and test metrics |
| HCAT-209 Define post-drain review refill decision | `post_drain_refill_decision` artifact defining hold/refill policy and review feedback inputs |

## Review And Next Work Cycle Traceability

| Card | Evidence |
| --- | --- |
| HCAT-210 Build review evidence binder index | `review_evidence_binder_index` artifact and `review_decision_records.record_type=review_evidence_binder`, `/v1/review/decision-records` |
| HCAT-211 Create reviewer walkthrough scripts | `reviewer_walkthrough_scripts` artifact with architect, pilot lead, and governance owner walkthrough paths |
| HCAT-212 Implement ADR and decision intake queue | `adr_decision_intake_queue` artifact and `review_decision_records.record_type=adr_intake_queue` |
| HCAT-213 Update architecture and data-flow review diagrams | `architecture_data_flow_review_diagrams` artifact with live capability route snapshot and Mermaid review flows |
| HCAT-214 Run review dry-run checklist | `review_dry_run_checklist` artifact and `review_room_decision_readiness_smoke` test-run record |
| HCAT-215 Seed pilot tenant and data room | `pilot_tenant_data_room_seed` artifact and `pilot_operation_records.operation_type=pilot_activation`, `/v1/pilot/operations` |
| HCAT-216 Rehearse partner connector activation | `partner_connector_activation_rehearsal` artifact with credential, dry-run, mapping, rollback, and audit expectations |
| HCAT-217 Build support and incident runbook | `support_incident_runbook` artifact and `pilot_runbooks.name=Review Next Pilot Operations` |
| HCAT-218 Instrument pilot success metrics | `pilot_success_metrics_instrumentation` artifact with Ops, connector, forecast, and pilot-operation metric sources |
| HCAT-219 Connect pilot feedback to board intake | `pilot_feedback_board_intake` artifact linking feedback notes to decision records and append-only board candidates |
| HCAT-220 Build event replay lag dashboard | `event_replay_lag_dashboard` artifact, `projection_checkpoints.consumer=catalog-event-replay-dashboard`, and `platform_hardening_records` |
| HCAT-221 Add production credential adapter plan | `production_credential_adapter_plan` artifact and `credential_refs.provider=production-connector-adapter` |
| HCAT-222 Run migration and restore cutover drill | `migration_restore_cutover_drill` artifact linked to `backup_runs` recovery drill evidence |
| HCAT-223 Add API versioning and deprecation gate | `api_versioning_deprecation_gate` artifact with v1 route policy and deprecation gate inputs |
| HCAT-224 Define performance regression budget | `performance_regression_budget` artifact and `platform_hardening_records.check_type=production_cutover_hardening` |
| HCAT-225 Build card placement policy review console | `card_placement_policy_review_console` artifact and `agent_governance_records.governance_type=card_placement_policy_review`, `/v1/agent-governance/records` |
| HCAT-226 Automate decision SLA escalation | `decision_sla_escalation_automation` artifact linked to `decision_queue_items.process_key=inventory.instock.cycle` |
| HCAT-227 Capture execution transcripts for governed runs | `governed_execution_transcript_capture` artifact defining retained and redacted transcript fields |
| HCAT-228 Audit agent permissions and context redaction | `agent_permissions_context_redaction_audit` artifact with role, scope, card-context, and redaction checks |
| HCAT-229 Add repeating process scheduler observability | `repeating_process_scheduler_observability` artifact and `hapa_repeating_processes.process_key=inventory.instock.cycle` |
| HCAT-230 Package pilot offer and pricing options | `pilot_offer_pricing_options` artifact and `commercial_readiness_records.record_type=pilot_offer_package`, `/v1/commercial/readiness` |
| HCAT-231 Create design partner onboarding docs | `design_partner_onboarding_docs` artifact with data-room, role, provider policy, and feedback docs |
| HCAT-232 Triage review findings into next-cycle rubric | `review_findings_next_cycle_rubric` artifact mapping severity to launch, harden, refill, or monitor outcomes |
| HCAT-233 Build release readiness scorecard | `release_readiness_scorecard` artifact and `release_gate_evaluations.gate=review-next-readiness-scorecard` |
| HCAT-234 Define post-review board refill and goal trigger | `post_review_refill_goal_trigger` artifact defining append-only refill guardrails and follow-on drain goal trigger |

## Review Operating And Pilot Entry Traceability

| Card | Evidence |
| --- | --- |
| HCAT-235 Run live review room agenda | `live_review_room_agenda` artifact and `review_decision_records.record_type=live_review_room_agenda` |
| HCAT-236 Capture review decisions into ADR records | `review_decisions_adr_records` artifact and `review_decision_records.record_type=adr_capture_workflow` |
| HCAT-237 Resolve launch harden pause decision matrix | `launch_harden_pause_decision_matrix` artifact and `review_decision_records.record_type=launch_harden_pause_matrix` |
| HCAT-238 Publish review minutes and action owners | `review_minutes_action_owners` artifact and `review_decision_records.record_type=review_minutes_action_owners` |
| HCAT-239 Freeze reviewed baseline and acceptance gates | `reviewed_baseline_acceptance_gates` artifact and `release_gate_evaluations.gate=review-operating-baseline-freeze` |
| HCAT-240 Finalize pilot tenant access and consent boundaries | `pilot_tenant_access_consent_boundaries` artifact and `pilot_operation_records.operation_type=pilot_access_consent_boundaries` |
| HCAT-241 Load design partner sample catalog through import review | `design_partner_sample_catalog_import_review` artifact and `import_review_rows` from the design-partner sample batch |
| HCAT-242 Rehearse connector credential handoff | `connector_credential_handoff_rehearsal` artifact and `credential_refs.provider=design-partner-connector-handoff` |
| HCAT-243 Run first pilot forecast and in-stock review cycle | `pilot_forecast_instock_review_cycle` artifact, `forecast_runs`, `hapa_decision_runs`, and `hapa_repeating_processes.process_key=pilot.forecast.instock.review` |
| HCAT-244 Capture partner feedback and support tickets | `partner_feedback_support_ticket_capture` artifact and `pilot_operation_records.operation_type=partner_feedback_support_ticket_capture` |
| HCAT-245 Implement event replay worker alert thresholds | `event_replay_worker_alert_thresholds` artifact and `projection_checkpoints.checkpoint_key=phase42:event-replay-alerts` |
| HCAT-246 Build production credential resolver adapter | `production_credential_resolver_adapter` artifact and `credential_refs.provider=production-credential-resolver` |
| HCAT-247 Automate migration restore drill | `automated_migration_restore_drill` artifact, `schema_migrations.version=phase42-reliability-smoke-v1`, and `backup_runs` |
| HCAT-248 Add API version and deprecation contract tests | `api_version_deprecation_contract_tests` artifact with capability route snapshot and v1 deprecation policy |
| HCAT-249 Ramp performance benchmark toward 100k and 1M targets | `performance_benchmark_target_ramp` artifact, `performance_reports`, and `platform_hardening_records.check_type=production_reliability_slice` |
| HCAT-250 Build card placement review action UI | `card_placement_review_action_ui` artifact and `agent_governance_records.governance_type=card_placement_review_actions` |
| HCAT-251 Implement decision SLA escalation runner | `decision_sla_escalation_runner` artifact and escalated `decision_queue_items.process_key=inventory.instock.cycle` |
| HCAT-252 Persist governed execution transcripts | `governed_execution_transcript_persistence` artifact and `hapa_decision_runs` governed execution context |
| HCAT-253 Enforce agent context redaction tests | `agent_context_redaction_enforcement_tests` artifact and `agent_governance_records.governance_type=governed_execution_runtime` |
| HCAT-254 Instrument scheduler alerts for repeating processes | `repeating_process_scheduler_alerts` artifact and `hapa_repeating_processes.process_key=inventory.instock.cycle` |
| HCAT-255 Finalize pilot offer approval packet | `pilot_offer_approval_packet` artifact and `commercial_readiness_records.record_type=pilot_offer_approval_packet` |
| HCAT-256 Publish design partner onboarding packet | `design_partner_onboarding_packet_publish` artifact and `commercial_readiness_records.record_type=design_partner_onboarding_packet` |
| HCAT-257 Convert review findings into board refill candidates | `review_findings_board_refill_candidates` artifact and `review_decision_records.record_type=review_findings_board_refill_candidates` |
| HCAT-258 Create release readiness signoff | `release_readiness_signoff` artifact and `release_gate_evaluations.gate=commercial-review-refill-signoff` |
| HCAT-259 Define follow-on drain goal and criteria | `follow_on_drain_goal_criteria` artifact and `commercial_readiness_records.record_type=follow_on_drain_goal_criteria` |

## Parity, Documentation, Demo Data, And UI Traceability

| Card | Evidence |
| --- | --- |
| HCAT-260 Build UI CLI API parity matrix | `ui_cli_api_parity_matrix` artifact mapping capabilities, endpoints, CLI commands, web/desktop controls, docs, and tests |
| HCAT-261 Audit capability to CLI command coverage | `capability_cli_command_audit` artifact and CLI help `next-cycle run --phase parity-docs-ui` |
| HCAT-262 Audit endpoint to web and desktop control coverage | `endpoint_web_desktop_control_audit` artifact and shared web/desktop workbench controls |
| HCAT-263 Map docs to every public surface | `docs_public_surface_map` artifact and `/v1/docs` entries for operator, screenshot, and handoff docs |
| HCAT-264 Define parity acceptance suite | `parity_acceptance_suite` artifact with API, CLI, web e2e, desktop smoke, and browser checks |
| HCAT-265 Complete API examples for parity gaps | `api_parity_examples` artifact and `docs/API.md` parity-docs-ui examples |
| HCAT-266 Complete CLI examples for parity gaps | `cli_parity_examples` artifact, CLI help, and `docs/RUNBOOK.md` parity drain commands |
| HCAT-267 Write web desktop operator guide | `web_desktop_operator_guide` artifact and `docs/OPERATOR_GUIDE.md` |
| HCAT-268 Add review screenshots checklist | `review_screenshots_checklist` artifact and `docs/SCREENSHOT_CHECKLIST.md` |
| HCAT-269 Publish release handoff notes | `release_handoff_notes` artifact and `docs/RELEASE_HANDOFF.md` |
| HCAT-270 Validate 100 SKU demo fixture taxonomy | `demo_fixture_taxonomy_validation` artifact with category, supplier, facility, stock, and forecast diversity |
| HCAT-271 Add fixture API and CLI parity tests | `demo_fixture_api_cli_parity_tests` artifact, `test/api-smoke.test.mjs`, and `test/catalog-core.test.mjs` |
| HCAT-272 Add web import walkthrough for 100 SKUs | `demo_web_import_walkthrough` artifact and web/desktop `Import 100 SKUs` control |
| HCAT-273 Seed forecast inventory diversity checks | `forecast_inventory_diversity_checks` artifact with lead-time, demand, reorder, and forecast run evidence |
| HCAT-274 Add fixture driven quality checks | `fixture_quality_checks` artifact and quality evaluation rows from the demo fixture |
| HCAT-275 Polish topbar telemetry and action hierarchy | `topbar_telemetry_action_hierarchy` artifact plus masked token field and topbar import/status controls |
| HCAT-276 Improve item master density and filters | `item_master_density_filters` artifact plus category/brand/status filters in `web/index.html` and `web/app.js` |
| HCAT-277 Improve board empty and refill states | `board_empty_refill_states` artifact and Board inspector drained/active/refill copy |
| HCAT-278 Group Ops actions by parity domain | `ops_actions_by_parity_domain` artifact plus grouped Ops controls and `Parity` action |
| HCAT-279 Run accessibility responsive scroll polish | `accessibility_responsive_scroll_polish` artifact, focusable task cards, reduced-motion CSS, and responsive smoke |
| HCAT-280 Capture parity browser screenshots | `parity_browser_screenshots` artifact and outputs screenshot evidence after browser verification |
| HCAT-281 Verify desktop parity smoke after UI pass | `desktop_parity_smoke_notes` artifact and `npm run desktop:smoke` |
| HCAT-282 Refresh traceability after parity pass | `parity_traceability_refresh` artifact and this traceability section |
| HCAT-283 Run performance check after 100 SKU import | `demo_fixture_performance_check` artifact and `npm run performance:smoke` |
| HCAT-284 Define next drain goal acceptance | `next_drain_goal_acceptance` artifact and release gate `parity-docs-ui-review-rehearsal` |

## Forecast Dashboard And Experimentation Traceability

| Card | Evidence |
| --- | --- |
| HCAT-285 Define forecast dashboard data model | `forecastDashboard()` contract, `/v1/forecasts/dashboard`, `forecast-dashboard-v1`, and `test/catalog-core.test.mjs` |
| HCAT-286 Generate dummy actuals and forecast fixture data | `buildForecastDashboardRow()` deterministic actual/forecast buckets, seeded 100-SKU fixture, and `scripts/pages-smoke.mjs` dashboard assertions |
| HCAT-287 Implement time increment aggregation | `normalizeForecastIncrement()`, `forecastIncrementDays()`, and day/week/month/quarter/year dashboard filters |
| HCAT-288 Add YoY baseline and variance calculations | Dashboard bucket `yoy` values and YoY table rows in `web/app.js` and `docs/demo-site.js` |
| HCAT-289 Expose dashboard API and CLI contract | `/v1/forecasts/dashboard`, CLI `forecast dashboard`, and `docs/API.md` examples |
| HCAT-290 Add Category Brand State SKU filters | Dashboard query filters, web Forecast controls, and metadata filters returned by `/v1/forecasts/dashboard` |
| HCAT-291 Add filter metadata and empty states | `forecastDashboardMetadata()`, dashboard `metadata.filters`, and web/static empty table messaging |
| HCAT-292 Persist filter and increment state in UI | `state.forecastFilters` and `attachForecastDashboardInteractions()` in `web/app.js` |
| HCAT-293 Optimize filtered dashboard query path | `matchesForecastDashboardFilters()` and grouped filtered rows before graph/table rendering |
| HCAT-294 Verify responsive accessible filter controls | Forecast control CSS in `web/styles.css` and web e2e source assertions |
| HCAT-295 Build hybrid actual forecast table shell | `renderForecastTable()` and static `staticForecastTable()` |
| HCAT-296 Populate actual units revenue cost cells | Actual bucket metrics in `buildForecastDashboardRow()` and dashboard table cells |
| HCAT-297 Populate projected units revenue COGS cells | Forecast bucket metrics, effective values, and graph series |
| HCAT-298 Add increment selector for days weeks months quarters years | Forecast increment select in `web/app.js`, API query handling, and CLI option |
| HCAT-299 Add year over year comparison row | `.yoy-row` table rendering and bucket `yoy.units_delta`, `revenue_delta`, and percentages |
| HCAT-300 Add inventory and demand graph series | `buildForecastDashboardGraph()` inventory/demand totals and Forecast graph bars |
| HCAT-301 Add revenue cost and COGS graph series | Graph revenue, cost, and COGS series in API and web/static renderers |
| HCAT-302 Add tooltip legend and axis formatting | Forecast graph labels, legends, bucket dates, and metric text in web/static demo |
| HCAT-303 Coordinate chart and table selected period | Shared bucket labels and table/graph data from one dashboard payload |
| HCAT-304 Run visual QA for dashboard | `npm run web:e2e`, `npm run pages:smoke`, and browser verification against `http://127.0.0.1:8770/` |
| HCAT-305 Add dashboard core and API tests | `builds forecast dashboard overrides supply and experimentation contracts` and API smoke dashboard test |
| HCAT-306 Add web and desktop smoke coverage | `scripts/web-e2e-smoke.mjs`, `scripts/desktop-smoke.mjs`, and shared web bundle |
| HCAT-307 Document forecast dashboard | `docs/API.md`, `docs/RUNBOOK.md`, `docs/FEATURE_PARITY.md`, and `docs/OPERATOR_GUIDE.md` |
| HCAT-308 Update GitHub Pages forecast dashboard demo | `scripts/build-pages-demo.mjs`, `docs/demo-site.js`, `docs/demo-site.css`, and `docs/demo-data.json.forecast_dashboard` |
| HCAT-309 Record dashboard drain acceptance | Board event evidence, checkpoint, tests, and this traceability section |
| HCAT-310 Track forecast lineage metadata | `runForecast()` `explanation.lineage` with created timestamp, source data refs, app, process, agent, methodology, granularity, and scope |
| HCAT-311 Enable table forecast overrides | `/v1/forecasts/overrides`, CLI `forecast override`, and inline web override controls |
| HCAT-312 Capture override reason and approval context | `reason_code`, `rationale`, `actor`, `generated_by`, and audit event metadata in `createForecastOverride()` |
| HCAT-313 Factor overrides into visualization and subscribers | Effective dashboard bucket values, graph totals, and `/v1/forecasts/subscriber-payload` |
| HCAT-314 Add override history rollback audit trail | `forecast_overrides` table status, `revertForecastOverride()`, `/v1/forecasts/overrides/revert`, and audit events |
| HCAT-315 Compute time unit of supply | Bucket `supply.time_unit_supply`, `supplyRiskState()`, and table supply chips |
| HCAT-316 Simulate purchase orders with delivery dates | `forecast_purchase_orders` table, seed data, CLI/API purchase-order commands, and dashboard receipt matching |
| HCAT-317 Project inventory with supply on order | `projected_inventory_on_hand`, received PO units, and forward bucket inventory projections |
| HCAT-318 Display supply on order units and time units | Dashboard buckets `supply.on_order_units` and `supply.on_order_time_units` plus table rendering |
| HCAT-319 Add stockout and supply risk thresholds | `supplyRiskState()` and row-level `supply_risk` values |
| HCAT-320 Add supply filters and sort controls | Web controls for supply sort, direction, in-stock, on-order, and API query parameters |
| HCAT-321 Support AND OR supply filter logic | `matchesSupplyFilters()` and `supply_filter_logic` dashboard query state |
| HCAT-322 Emit subscriber payloads for effective forecast supply | `/v1/forecasts/subscriber-payload`, CLI `forecast subscriber-payload`, and `forecast-effective-supply-subscriber-v1` |
| HCAT-323 Add supply override tests and docs | Core/API tests plus `docs/API.md`, `docs/RUNBOOK.md`, and `docs/FEATURE_PARITY.md` |
| HCAT-324 Record supply override drain acceptance | Board event evidence and test checkpoint for HCAT-310 through HCAT-324 |
| HCAT-325 Define hierarchy and granularity contract | `forecastHierarchyContract()` levels and manipulation rules |
| HCAT-326 Add granularity selector | API/CLI `granularity`, web selector, and category/brand/state/SKU grouping |
| HCAT-327 Add top down and bottom up allocation scaffolding | Hierarchy contract `bottom_up`, `top_down`, and row `rollup` allocation data |
| HCAT-328 Add cross level reconciliation scaffolding | `forecastHierarchyContract().reconciliation` and comparison payload reconciliation notes |
| HCAT-329 Track manipulation lineage | Forecast lineage scope/granularity, override metadata, and plan promotion records |
| HCAT-330 Create reusable assumption set schema | `forecast_assumption_sets` table and `defaultForecastAssumptionSets()` |
| HCAT-331 Add assumption editor contract | `/v1/forecasts/assumption-sets`, CLI `forecast assumption-save`, and web experiment panel assumption list |
| HCAT-332 Add API CLI assumption driven run contracts | `runForecast()` `assumption_set_id`, experiment API, and CLI `forecast experiment` |
| HCAT-333 Inject model input assumptions into new runs | Merged assumption set, explicit assumptions, and scenario factors in `runForecast()` |
| HCAT-334 Add sensitivity analysis scenario branching | `buildScenarioBranches()` and `forecastExperimentation().scenario_branches` |
| HCAT-335 Track methodology metadata | `forecastMethodConfig()`, run lineage methodology, and comparison methodology summaries |
| HCAT-336 Compare multiple forecast runs side by side | `compareForecastRuns()`, `/v1/forecasts/experiments/compare`, and CLI `forecast compare-runs` |
| HCAT-337 Add methodology backtest metrics | Comparison ranking, confidence, bias proxy, and backtest summary metadata |
| HCAT-338 Promote forecast plan of record | `forecast_plan_records` table, `/v1/forecasts/plan-of-record`, and CLI `forecast plan promote` |
| HCAT-339 Show forecast run diffs | Comparison `deltas`, winner selection, and run comparison payloads |
| HCAT-340 Build experimentation dashboard panel | `forecastExperimentation()`, web Forecast inspector panel, and static demo experiment snapshot |
| HCAT-341 Include experimentation subscribers | `forecastSubscriberPayload()` and experimentation `subscriber_payload` evidence |
| HCAT-342 Route Hapa card governance into forecast choices | Run lineage process keys and subscriber payloads for forecast/in-stock decision processes |
| HCAT-343 Seed fixture data for experimentation | Seeded assumption sets, purchase orders, demo catalog rows, and generated experiment runs |
| HCAT-344 Complete tests docs and drain acceptance | `npm test`, Pages/web smoke, updated docs, board event drain, and GitHub Pages demo refresh |
