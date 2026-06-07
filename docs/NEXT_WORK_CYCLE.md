# Next Work Cycle

This roadmap starts after the verified post-MVP drain checkpoint on June 5, 2026.

## Phase 5: Review Readiness

Prepare the project for an architecture, product, security, and demo review. The work should turn the implemented scaffold into a reviewable package: diagrams, contract snapshots, seeded walkthroughs, threat model, migration notes, and a decision log.

Primary outcome: reviewers can understand what exists, what is scaffolded, what remains external, and what risks need owner decisions.

## Phase 6: Connected Pilot

Move from fixture-backed local-first scaffolds to controlled live pilots. Connectors should remain dry-run safe by default, with credential isolation, replayable deltas, provider-compliant fetch queues, Hapa Lance projection replay, telemetry heartbeat monitoring, and connector observability.

Primary outcome: the node can safely prove one or two real integration paths without losing local auditability.

## Phase 7: Governance And Enterprise Controls

Turn governance scaffolds into operational workflows: lifecycle approvals, rule-builder remediation, tenant boundaries, signed attestations, inventory ledger replay, legal hold, retention drills, and audit-review packets.

Primary outcome: catalog, inventory, supplier, and identity governance can be reviewed as an operational control system.

## Phase 8: Intelligence Workbench

Deepen forecasting, pricing, in-stock, and publishing decisions with feature-store inputs, backtests, champion/challenger models, pricing scenarios, Hapa card review loops, and channel readiness validations.

Primary outcome: planners can run explainable decision cycles instead of only viewing deterministic outputs.

## Phase 9: Release Hardening

Prepare the app for pilot distribution with browser E2E tests, signed desktop packaging, restore drills, issue templates, release checklist, launch metrics, and success/failure criteria.

Primary outcome: the app is ready for a bounded pilot with measurable review gates.

## Implementation Evidence

The phases above are represented by a repeatable next-cycle drain runner:

- Core: `runNextCycle({ phase: "all" })` creates 28 artifacts and 5 test-run records.
- API: `POST /v1/next-cycle/run`, `GET /v1/next-cycle/artifacts`, and `GET /v1/next-cycle/test-runs`.
- CLI: `next-cycle run`, `next-cycle artifacts`, and `next-cycle tests`.
- Web/desktop: Ops buttons for Review, Pilot, Governance, Intelligence, Release, and Drain.
- Tables: `next_cycle_artifacts` and `next_cycle_test_runs`.
- Tests: `npm test`, `node bin/hapa-catalog.mjs self-test`, `npm run web:e2e`, `npm run desktop:smoke`, and `npm run performance:smoke`.

## Continuation Cycle

After the HCAT-089 drain, the board continues with HCAT-090 through HCAT-109:

- Phase 10: Pilot Operations Continuation covers pilot workspace seeds, supplier onboarding, data contract diffs, credential health, and agent runbooks.
- Phase 11: Agent Decision Ops covers card policy simulation, decision review queues, owner notifications, and planning exceptions.
- Phase 12: Compliance And Admin Readiness covers media QA, identity federation, consent/audit exports, quota policy, and offline desktop sync.
- Phase 13: Test And Scale Hardening covers E2E fixture generation and load test matrix artifacts.
- Phase 14: Pilot Learning Loop covers cohort dashboards, risk registers, training outlines, and post-pilot roadmap intake.

Run it with:

```bash
node bin/hapa-catalog.mjs next-cycle run --phase continuation
```

The continuation drain creates 20 artifacts and 5 passed test-run records.

## Review Prep Cycle

After the HCAT-109 continuation drain, the board is refilled with HCAT-110 through HCAT-134 to prepare for a formal review and the next implementation drain.

### Phase 15: Review Room Readiness

Package the system for an architecture/product/security review. This phase turns the current implementation into a clean review narrative, architecture decision map, reviewer persona packets, live demo choreography, and evidence index.

Primary outcome: reviewers can see the product story, the implementation proof, and the open decisions without spelunking through the codebase.

### Phase 16: Design Partner Pilot

Shape the first design partner pilot. This phase selects workflows, defines pilot data acceptance gates, ranks connector activation candidates, drafts the operating agreement, and prepares the measurement plan.

Primary outcome: the next cycle can move from local scaffolds to a bounded, measurable pilot plan.

### Phase 17: Agent Operating Model

Clarify how Hapa cards participate in real organizational decisions. This phase defines agent ownership, placement policy, memory/context boundaries, decision SLAs, and an agent operations review checklist.

Primary outcome: Avatar and Protocol cards have an accountable operating model for governance, catalog, forecast, in-stock, and publishing cycles.

### Phase 18: Integration And Data Hardening

Prepare the data and integration layer for review. This phase covers sandbox contracts, identifier authority, forecast feature governance, retention/export controls, and resilience/restore review.

Primary outcome: external integrations and core data governance are ready for design review before live pilot execution.

### Phase 19: Productization

Plan the next productization wave. This phase covers packaging, API versioning, admin UX backlog, next-cycle test strategy, and the acceptance rubric for the next drain.

Primary outcome: the next implementation cycle has clear done criteria and a review-ready path from local node to pilot product.

Run it with:

```bash
node bin/hapa-catalog.mjs next-cycle run --phase review-prep
```

The review-prep drain creates 25 artifacts and 5 passed test-run records.

## Review Execution Cycle

After the HCAT-134 review-prep drain, the board is refilled with HCAT-135 through HCAT-159 to move from review preparation into review execution, pilot commitment shaping, and next build-cycle planning.

### Phase 20: Review Execution

Prepare the material and operating loop for the actual review. This phase covers the briefing deck outline, question log, demo rehearsal checklist, decision register, and issue intake workflow.

Primary outcome: the review can run cleanly, capture decisions, and turn findings into append-only board work.

### Phase 21: Pilot Commitments

Shape the design partner commitment package. This phase covers the data room checklist, partner-facing pilot scope, security appendix, success dashboard spec, and support/escalation model.

Primary outcome: a partner can evaluate pilot scope, boundaries, success metrics, and support expectations before live work begins.

### Phase 22: Production Architecture Decisions

Resolve architecture direction for production-grade paths. This phase covers credential vault direction, deployment topology, event/projection architecture, marketplace provider compliance, and multi-tenant boundaries.

Primary outcome: the next implementation cycle can make irreversible architecture moves with explicit review decisions.

### Phase 23: Admin And Governance UX

Turn governance and operations needs into admin UX specifications. This phase covers policy editors, decision review queues, data quality command center, connector observability, and audit export/review bundles.

Primary outcome: the next build cycle has concrete UI requirements for the administrative surfaces operators will actually live in.

### Phase 24: Next Work Cycle Planning

Convert review and pilot decisions into a build plan. This phase covers implementation mapping, dependency graph, acceptance tests, risk burn-down, and future board-fill rubric.

Primary outcome: the next drain can start from a coherent implementation map instead of a loose pile of review notes.

Run it with:

```bash
node bin/hapa-catalog.mjs next-cycle run --phase review-execution
```

The review-execution drain creates 25 artifacts and 5 passed test-run records:

- Phase 20 creates review room briefing, question log, demo rehearsal, decision register, and issue intake artifacts.
- Phase 21 creates pilot data room, scope, security, dashboard, and support artifacts.
- Phase 22 creates credential vault, topology, event bus, provider compliance, and tenancy decision artifacts.
- Phase 23 creates admin policy, decision queue, data quality, connector observability, and audit bundle UX artifacts.
- Phase 24 creates implementation map, dependency graph, acceptance test plan, risk burn-down, and board fill rubric artifacts.

## Review Readout Cycle

After the HCAT-159 review-execution drain, the board is refilled with HCAT-160 through HCAT-184 to turn review execution into closure artifacts, pilot kickoff readiness, and a buildable next implementation wave.

### Phase 25: Review Readout And Decision Closure

Close the review loop. This phase covers the review readout packet, ADR queue, finding severity matrix, pilot kickoff sign-off gates, and reviewer follow-up owner map.

Primary outcome: the team can leave review with decision ownership, risk severity, and pilot gates clear enough to act on.

### Phase 26: Pilot Kickoff Readiness

Prepare the design partner kickoff. This phase covers the kickoff agenda, environment readiness checklist, pilot data sharing/redaction checklist, partner feedback loop, and rollback/pause protocol.

Primary outcome: the partner pilot can start with clear session logistics, data boundaries, feedback capture, and recovery rules.

### Phase 27: Build Cycle Alpha Implementation Plan

Turn architecture decisions into ranked implementation slices. This phase covers event bus/projection scaffolds, credential resolver/keychain work, decision review queue, admin quality command center, and connector observability.

Primary outcome: the next drain can begin with buildable surfaces rather than broad architecture themes.

### Phase 28: Enterprise Trust And Compliance Prep

Prepare trust evidence for enterprise and partner review. This phase covers the security evidence binder, tenant isolation verification, provider compliance audit checklist, backup/restore and export attestation, and audit bundle redaction policy.

Primary outcome: security, compliance, and review evidence are organized before deeper production hardening begins.

### Phase 29: Review Automation And Board Hygiene

Make future reviews repeatable. This phase covers automated evidence bundle planning, board-driven release gates, review metrics telemetry, test fixture expansion, and post-review board refill procedure.

Primary outcome: each future review and drain can be reconstructed from evidence, metrics, and append-only board history.

```bash
node bin/hapa-catalog.mjs next-cycle run --phase review-readout
```

The review-readout drain creates 25 artifacts and 5 passed test-run records:

- Phase 25: review readout packet, ADR queue, severity matrix, pilot sign-off gates, and owner map.
- Phase 26: pilot kickoff agenda, environment checklist, data redaction checklist, feedback loop, and rollback protocol.
- Phase 27: event bus/projection, credential resolver, decision queue, quality command center, and connector observability alpha plans.
- Phase 28: security binder, tenant isolation verification, provider compliance audit, backup/export attestation, and redaction policy.
- Phase 29: evidence bundle runner, board release gates, review telemetry, fixture expansion, and post-review refill procedure.

## Review Prep And Alpha Build Cycle

After the HCAT-184 review-readout drain, the board is refilled with HCAT-185 through HCAT-209 to prepare the next review room while turning the prior alpha plans into concrete build slices.

### Phase 30: Review Evidence Automation Build

Build the review evidence machinery. This phase covers the evidence bundle runner, evidence bundle API/CLI/web surfaces, bundle manifest/redaction schema, board checkpoint evidence embedding, and review-room dashboard acceptance tests.

Primary outcome: reviewers can ask for a current evidence bundle and see docs, board state, artifacts, tests, and redaction status without hand assembly.

### Phase 31: Alpha Platform Foundations

Implement the first platform primitives from the alpha plan. This phase covers event envelopes and append APIs, projection consumer checkpoints, credential reference resolution, secret redaction guards, and API compatibility contract tests.

Primary outcome: future build work can rely on repeatable events, replayable projections, and credential-safe connector execution.

### Phase 32: Decision And Quality Ops Build

Build the operator queues. This phase covers the decision review queue data model, decision queue web/desktop UX, admin quality command center, work-order to board follow-up conversion, and expanded forecast/quality fixtures.

Primary outcome: review-required decisions and quality remediation work become visible, assignable, auditable, and testable.

### Phase 33: Enterprise Trust Verification

Turn trust plans into verification surfaces. This phase covers tenant isolation fixtures, audit bundle export/redaction manifests, provider compliance run attestations, backup/restore verification, and security evidence binder generation.

Primary outcome: enterprise and design-partner reviewers can inspect trust controls as executable evidence rather than static claims.

### Phase 34: Pilot And Release Gate Readiness

Prepare the next review and pilot gate. This phase covers design partner kickoff packets, pilot runbook scheduling, release gate automation, next-cycle review metrics, and the post-drain review refill decision.

Primary outcome: the next drain can end in a review-ready pilot gate with clear evidence, metrics, and follow-up board policy.

```bash
node bin/hapa-catalog.mjs next-cycle run --phase review-alpha
```

The review-alpha drain creates 25 artifacts and 5 passed test-run records:

- Phase 30: evidence bundle runner, evidence bundle surfaces, manifest/redaction schema, board checkpoint embedding, and dashboard acceptance tests.
- Phase 31: event envelope append API, projection checkpoints, credential reference resolver, secret redaction guards, and API compatibility tests.
- Phase 32: decision review queue, queue UX parity, admin quality command center, work-order follow-up bridge, and forecast/quality fixtures.
- Phase 33: tenant isolation fixtures, audit redaction bundle, provider compliance attestations, backup restore verification, and security evidence binder.
- Phase 34: design partner kickoff packet, pilot runbook scheduler, release gate evaluator, review metrics dashboard, and post-drain refill decision.

## Review And Next Work Cycle Planning

After the HCAT-209 review-alpha drain, the next board refill is HCAT-210 through HCAT-234. These cards prepare a review room that can turn evidence into decisions, then convert those decisions into the next execution cycle.

### Phase 35: Review Room Decision Readiness

Turn the alpha evidence into a reviewer-facing decision room. This phase covers the review evidence binder index, reviewer walkthrough scripts, ADR intake, architecture/data-flow review diagrams, and a review dry-run checklist.

Primary outcome: reviewers can see current proof, ask for decisions, and leave behind clean ADR/work-order inputs.

### Phase 36: Pilot Operations Activation

Prepare the design-partner pilot as an executable operating loop. This phase covers pilot tenant/data-room seed, partner connector rehearsal, support and incident runbooks, pilot metrics instrumentation, and feedback-to-board intake.

Primary outcome: the pilot can start with scoped data, rehearsed workflows, support paths, and feedback capture that turns into board evidence.

### Phase 37: Production Platform Hardening

Promote the alpha foundations toward production readiness. This phase covers event replay lag dashboards, production credential adapters, migration and restore cutover drills, API versioning/deprecation gates, and performance regression budgets.

Primary outcome: the next work cycle has concrete hardening targets for reliability, compatibility, credentials, and scale.

### Phase 38: Agent Governance Operations

Tighten human-agent accountability before deeper automation. This phase covers card placement policy review, decision SLA escalation, execution transcript capture, permission/context redaction audits, and repeating-process scheduler observability.

Primary outcome: Hapa cards can participate in recurring decisions with inspectable context, escalation, and safety boundaries.

### Phase 39: Commercialization And Refill Gates

Package the review outcome into pilot/commercial decisions. This phase covers pilot offer packaging, design partner onboarding docs, review findings triage, release readiness scorecard, and the next board refill/goal trigger.

Primary outcome: after review, the team can choose whether to launch pilot, harden production slices, refill the board, or pause with explicit evidence.

```bash
node bin/hapa-catalog.mjs next-cycle run --phase review-next
```

The review-next drain creates 25 artifacts and 5 passed test-run records:

- Phase 35: review evidence binder index, reviewer walkthrough scripts, ADR intake queue, architecture/data-flow review diagrams, and review dry-run checklist.
- Phase 36: pilot tenant/data-room seed, partner connector activation rehearsal, support incident runbook, pilot success metrics, and feedback-to-board intake.
- Phase 37: event replay lag dashboard, production credential adapter plan, migration/restore cutover drill, API versioning/deprecation gate, and performance regression budget.
- Phase 38: card placement policy review console, decision SLA escalation, governed execution transcripts, permission/context redaction audit, and repeating-process scheduler observability.
- Phase 39: pilot offer/pricing options, design partner onboarding docs, review finding rubric, release readiness scorecard, and post-review board refill/goal trigger.

```bash
node bin/hapa-catalog.mjs next-cycle run --phase review-operating
```

The review-operating drain creates 25 artifacts and 5 passed test-run records:

- Phase 40: live review room agenda, review decisions captured into ADR records, launch/harden/pause decision matrix, review minutes/action owners, and reviewed baseline acceptance gates.
- Phase 41: pilot tenant access and consent boundaries, design partner sample catalog import review, connector credential handoff rehearsal, first pilot forecast/in-stock review cycle, and partner feedback/support ticket capture.
- Phase 42: event replay worker alert thresholds, production credential resolver adapter, automated migration/restore drill, API version/deprecation contract tests, and performance benchmark ramp.
- Phase 43: card placement review action UI, decision SLA escalation runner, governed execution transcript persistence, agent context redaction enforcement tests, and repeating process scheduler alerts.
- Phase 44: pilot offer approval packet, design partner onboarding packet publication, review findings board refill candidates, release readiness signoff, and follow-on drain goal criteria.

## Review Operating And Pilot Entry Planning

After the HCAT-234 review-next drain, the next board refill is HCAT-235 through HCAT-259. These cards move from prepared evidence into an operating review session, then into pilot entry and the first production reliability/runtime slices.

### Phase 40: Review Room Operating Session

Run the review room as an operating session rather than another prep pass. This phase covers the live review agenda, ADR decision capture, launch/harden/pause decision matrix, review minutes/action owners, and a reviewed baseline freeze.

Primary outcome: review decisions become assigned, dated, and linked to evidence before any pilot or production commitments move forward.

### Phase 41: Design Partner Pilot Entry

Turn the pilot package into partner-facing entry work. This phase covers pilot tenant access/consent boundaries, design-partner sample catalog loading, connector credential handoff rehearsal, first forecast/in-stock review cycle, and partner feedback/support ticket capture.

Primary outcome: a design partner can enter the pilot with scoped data, reviewed access, one working operating loop, and visible support intake.

### Phase 42: Production Reliability Slice

Promote the hardening plan into implementable reliability slices. This phase covers event replay worker alerts, production credential resolver adapter, automated migration/restore drill, API version/deprecation contract tests, and performance ramp toward the 100k SKU / 1M inventory-event target.

Primary outcome: the next drain can implement measurable reliability improvements rather than only describing production readiness.

### Phase 43: Governed Agent Runtime

Turn agent-governance scaffolds into runtime enforcement. This phase covers card placement review actions, SLA escalation runner, governed execution transcript persistence, context redaction enforcement tests, and scheduler alert instrumentation.

Primary outcome: recurring Hapa-card-governed processes can run with inspectable authority, escalation, transcript, redaction, and scheduler evidence.

### Phase 44: Commercial Review And Refill Signoff

Package review and pilot entry into explicit commercial and board decisions. This phase covers pilot offer approval, design partner onboarding packet publication, review finding conversion into board candidates, release readiness signoff, and follow-on goal/drain criteria.

Primary outcome: the team can leave review with a signed pilot/commercial decision and a concrete next drain goal.

## Parity, Documentation, Demo Data, And UI Refill

After the HCAT-259 review-operating drain, the next board refill is HCAT-260 through HCAT-284. These cards make parity and documentation explicit, broaden the catalog demo data, and polish the web/desktop operator experience before the next implementation drain.

### Phase 45: Surface Parity Audit

Confirm that API capabilities, CLI commands, web/desktop controls, docs, and tests describe the same feature map. This phase covers a parity matrix, capability-to-command audit, endpoint-to-control audit, docs coverage map, and acceptance suite definition.

Primary outcome: gaps between UI, CLI, API, desktop, and docs are visible before the next drain begins.

### Phase 46: Documentation Completion

Turn the parity audit into operator-facing documentation. This phase covers API examples, CLI examples, web/desktop operator guide, runbook screenshots/checklist, and release handoff notes.

Primary outcome: a reviewer or design partner can operate the node without hidden knowledge from this thread.

### Phase 47: Demo Data Expansion

Use the new deterministic 100-SKU fixture as the base for broader demos. This phase covers fixture taxonomy review, fixture API/CLI parity, web import walkthrough, forecast/inventory diversity, and fixture-driven quality checks.

Primary outcome: browse, inventory, forecast, quality, and performance demos have enough data shape to feel real.

### Phase 48: Operator UI Enhancement Pass

Polish the Hapa/Astros operator shell while preserving IDs and behavior. This phase covers topbar telemetry, item-master density, board empty/refill states, Ops action grouping, responsive behavior, scroll polish, and accessibility checks.

Primary outcome: the web and desktop shells feel like a coherent operator console rather than a raw scaffold.

### Phase 49: Review Rehearsal And Refill QA

Close the cycle with evidence. This phase covers browser screenshots, desktop parity smoke, traceability refresh, 100-SKU performance check, and follow-on goal criteria.

Primary outcome: the next drain can be accepted with screenshots, docs, tests, board evidence, and measurable demo-data behavior.

The parity/docs/UI drain creates 25 artifacts and 5 passed test-run records with:

- Phase 45: `ui_cli_api_parity_matrix`, `capability_cli_command_audit`, `endpoint_web_desktop_control_audit`, `docs_public_surface_map`, and `parity_acceptance_suite`.
- Phase 46: `api_parity_examples`, `cli_parity_examples`, `web_desktop_operator_guide`, `review_screenshots_checklist`, and `release_handoff_notes`.
- Phase 47: `demo_fixture_taxonomy_validation`, `demo_fixture_api_cli_parity_tests`, `demo_web_import_walkthrough`, `forecast_inventory_diversity_checks`, and `fixture_quality_checks`.
- Phase 48: `topbar_telemetry_action_hierarchy`, `item_master_density_filters`, `board_empty_refill_states`, `ops_actions_by_parity_domain`, and `accessibility_responsive_scroll_polish`.
- Phase 49: `parity_browser_screenshots`, `desktop_parity_smoke_notes`, `parity_traceability_refresh`, `demo_fixture_performance_check`, and `next_drain_goal_acceptance`.

## Forecast Visualization Dashboard Refill

After the HCAT-284 parity/docs/UI drain, the next board refill is HCAT-285 through HCAT-309. These cards create a forecast visualization dashboard that combines item filters, trailing actuals, projected forecasts, year-over-year comparisons, dummy data, and filter-responsive graphs.

### Phase 50: Forecast Dashboard Data Foundation

Define the reusable dashboard contract before UI work. This phase covers the dashboard data model, deterministic dummy data fixture, day/week/month/quarter/year aggregation engine, YoY baseline calculations, and API/CLI contract.

Primary outcome: the table, graph, API, CLI, tests, and static demo all read from one forecast dashboard contract rather than separate UI-only calculations.

### Phase 51: Filter And Query Controls

Build the dashboard filter spine. This phase covers category, brand, state, and SKU filters; filter metadata and empty states; persisted filter/increment state; optimized query paths; and accessibility/responsive checks.

Primary outcome: changing any filter updates the table, graph, and inspector consistently across web, desktop, API, CLI, and Pages demo surfaces.

### Phase 52: Actual Forecast Table

Build the hybrid table requested for the dashboard. This phase covers the actual/forecast table shell, trailing actual units sold/revenue sold/total cost cells, projected units/revenue/COGS cells, the increment selector, and the year-over-year comparison row below the actual/forecast row.

Primary outcome: operators can scan one table that transitions from historical actuals into forecast projections and immediately compare each bucket against the prior year.

### Phase 53: Forecast Visualization Graphs

Create the visual forecasting layer. This phase covers graph series for inventory levels, demand, actual/projected units, revenue, total cost, COGS, margin, tooltip/legend/axis formatting, chart-table selection coordination, and responsive visual QA.

Primary outcome: inventory, demand, revenue, and cost trends respond to the same filters and time increments as the table.

### Phase 54: Forecast Dashboard Tests Docs Release

Close the cycle with evidence. This phase covers core/API tests, web/desktop smoke coverage, operator/API docs, GitHub Pages snapshot updates, and final drain acceptance.

Primary outcome: the forecast visualization dashboard can be drained with implementation evidence, screenshots, docs, tests, and hosted demo coverage.

The forecast visualization dashboard refill creates 25 cards:

- Phase 50: HCAT-285 forecast dashboard data model, HCAT-286 dummy data fixture, HCAT-287 time increment aggregation, HCAT-288 YoY baseline and variance calculations, and HCAT-289 API/CLI contract.
- Phase 51: HCAT-290 category/brand/state/SKU filters, HCAT-291 filter metadata and empty states, HCAT-292 persisted filter/increment state, HCAT-293 optimized filtered query path, and HCAT-294 responsive/accessibility filter verification.
- Phase 52: HCAT-295 hybrid actual/forecast table shell, HCAT-296 actuals metrics cells, HCAT-297 forecast projection metrics cells, HCAT-298 increment selector, and HCAT-299 YoY comparison row.
- Phase 53: HCAT-300 inventory and demand graph series, HCAT-301 revenue/cost/COGS graph series, HCAT-302 tooltip/legend/axis formatting, HCAT-303 chart/table selection coordination, and HCAT-304 visual QA.
- Phase 54: HCAT-305 core/API tests, HCAT-306 web/desktop smoke coverage, HCAT-307 docs, HCAT-308 GitHub Pages demo update, and HCAT-309 drain acceptance.
