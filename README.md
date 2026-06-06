# .hapaCatalog

`.hapaCatalog` is a Hapa Protocol node for catalog ingestion, global item mastering, inventory visibility, identity/permission governance, item browsing, and explainable demand forecasting.

Status: tested MVP plus post-MVP operations scaffold with SQLite-backed local data, API/CLI/web/desktop surfaces, seeded governance roles, Hapa card placement, staged imports, item search, inventory positions, forecast explanations, audit events, telemetry, and an append-only Hapa Kanban board.

## Hapa Invariants

- Local-first and loopback by default.
- One feature spine feeds API, CLI, web, desktop, and tests.
- Product truth is a typed item graph; search and forecast views are projections.
- Every mutation records provenance and an audit event.
- Runtime DBs, tokens, logs, imports, forecasts, and projections stay out of Git.

## Quick Start

```bash
npm install
npm test
npm start
```

Default service URL:

```text
http://127.0.0.1:8768
```

The server creates `.node_token` on first start unless `HAPA_CATALOG_TOKEN` is set.

## CLI

```bash
node bin/hapa-catalog.mjs health
node bin/hapa-catalog.mjs capabilities
node bin/hapa-catalog.mjs import --file data/fixtures/sample_catalog.csv --dry-run
node bin/hapa-catalog.mjs import --file data/fixtures/sample_catalog.csv
node bin/hapa-catalog.mjs fixtures demo-catalog --limit 100
node bin/hapa-catalog.mjs fixtures import-demo-catalog --limit 100
node bin/hapa-catalog.mjs mapping save --file data/fixtures/supplier_mapping.json
node bin/hapa-catalog.mjs mapping preview --mapping-file data/fixtures/supplier_mapping.json --records-file data/fixtures/supplier_source.json
node bin/hapa-catalog.mjs items search alpha
node bin/hapa-catalog.mjs forecast run --sku ALPHA-RING-9 --location main-bin
node bin/hapa-catalog.mjs forecast actuals --file actuals.json
node bin/hapa-catalog.mjs forecast quality --sku ALPHA-RING-9
node bin/hapa-catalog.mjs market retrieve --upc 075375927016
node bin/hapa-catalog.mjs market prices --asin B095QX1FSR
node bin/hapa-catalog.mjs market amazon-listing --upc 075375927016
node bin/hapa-catalog.mjs market listing --sku B095QX1FSR
node bin/hapa-catalog.mjs cards list
node bin/hapa-catalog.mjs cards place --card-id card-avatar-forecast-friend --target-type process --target-id forecast.cycle --role governor --decision-mode review_required
node bin/hapa-catalog.mjs decisions context --process-key forecast.cycle
node bin/hapa-catalog.mjs decisions run --process-key forecast.cycle
node bin/hapa-catalog.mjs processes run-due --force
node bin/hapa-catalog.mjs mdm detect --threshold 0.5
node bin/hapa-catalog.mjs mdm duplicates
node bin/hapa-catalog.mjs digital list
node bin/hapa-catalog.mjs connectors validate
node bin/hapa-catalog.mjs connectors run --connector-id connector-erp-plm
node bin/hapa-catalog.mjs performance report --measured-skus 1000 --measured-events 5000
node bin/hapa-catalog.mjs schema apply --version catalog-post-mvp-v1
node bin/hapa-catalog.mjs import-review create --file data/fixtures/sample_catalog.csv
node bin/hapa-catalog.mjs sessions create --identity-id local_operator
node bin/hapa-catalog.mjs forecast compare --sku ALPHA-RING-9
node bin/hapa-catalog.mjs pricing scenario --sku ALPHA-RING-9
node bin/hapa-catalog.mjs publishing run --channel storefront
node bin/hapa-catalog.mjs quality evaluate
node bin/hapa-catalog.mjs desktop package
node bin/hapa-catalog.mjs lineage export --dataset catalog_items
node bin/hapa-catalog.mjs backup run
node bin/hapa-catalog.mjs next-cycle run --phase all
node bin/hapa-catalog.mjs next-cycle run --phase continuation
node bin/hapa-catalog.mjs next-cycle run --phase review-prep
node bin/hapa-catalog.mjs next-cycle run --phase review-execution
node bin/hapa-catalog.mjs next-cycle run --phase review-readout
node bin/hapa-catalog.mjs next-cycle run --phase review-alpha
node bin/hapa-catalog.mjs next-cycle run --phase review-next
node bin/hapa-catalog.mjs next-cycle run --phase review-operating
node bin/hapa-catalog.mjs next-cycle artifacts --phase "Phase 6"
node bin/hapa-catalog.mjs next-cycle tests
node bin/hapa-catalog.mjs ops overview
node bin/hapa-catalog.mjs self-test
```

## Market Enrichment

The node can append marketplace price history to item master records. `POST /v1/market/retrieve` and CLI `market retrieve` accept a CamelCamelCamel URL, ASIN, UPC, supplied page HTML, or explicit history payload keyed by `amazon`, `new`, and `used`.

Provider fetches are recorded even when the remote site returns a challenge page; in that case the node stores identifiers and a retrieval snapshot without inventing price points.

Amazon listing enrichment is available through `POST /v1/market/amazon-listing/retrieve` and CLI `market amazon-listing`. It accepts an Amazon product URL, ASIN, UPC, or supplied page HTML. UPC retrieval resolves through the local item identifier graph first, then falls back to Amazon search if an ASIN is not known. Listing snapshots store title, brand, price, list price, rating, review count, bought-in-last-month signal, bullets, description, documents, and normalized media assets.

## Workbench, Quality, And Connectors

The MVP includes source-to-canonical import mappings with preview cells and numeric unit conversions, duplicate candidate detection and merge survivorship events, digital product objects, forecast actuals with quality remediation, connector contract fixtures, a 100-SKU demo catalog fixture, and repeatable performance reports for the 100k SKU / 1M inventory-event target.

The web and desktop UI expose these in the Workbench and Quality tabs, plus `Import 100 SKUs` in the top operator bar. API callers can use `/v1/fixtures/demo-catalog-100`, `/v1/fixtures/demo-catalog-100/import`, `/v1/import-mappings`, `/v1/import-mappings/preview`, `/v1/mdm/*`, `/v1/forecasts/actuals`, `/v1/forecasts/quality`, `/v1/connectors/*`, and `/v1/performance/reports`.

## Operations Scaffold

The post-MVP board phases are represented by tested local-first operations surfaces: schema migrations with rollback metadata, bulk import review rows, connector dry-run/commit runs, identity sessions and rotation, forecast model comparison, provider cache/run records, Hapa Lance projection exports, pricing scenarios, lifecycle transitions, publishing runs, telemetry registration, organization tenancy, inventory ledger/reconciliation, configurable quality rules and work orders, desktop package plans, lineage exports, retention policies, backup/recovery drill records, review evidence bundles, event envelopes, projection checkpoints, credential references, decision review queues, trust attestations, pilot runbooks, release gate evaluations, review decision records, pilot operation records, platform hardening records, agent governance records, and commercial readiness records.

Use the web/desktop `Ops` tab, API `/v1/ops`, or CLI `ops overview` to inspect all operations rows.

## Next Cycle Drain

Review-readiness and pilot-prep phases are implemented as repeatable evidence generators. `POST /v1/next-cycle/run`, CLI `next-cycle run`, and the web/desktop Ops `Drain` button create artifacts for HCAT-062 through HCAT-089: review packets, connector pilot scaffolds, governance workflows, intelligence workbench artifacts, release hardening records, and passed test-run rows.

The web/desktop Ops `Continue` button and CLI `next-cycle run --phase continuation` create artifacts for HCAT-090 through HCAT-109: pilot operations, agent decision ops, compliance/admin readiness, test scale, and pilot learning loop.

The web/desktop Ops `Prep` button and CLI `next-cycle run --phase review-prep` create artifacts for HCAT-110 through HCAT-134: review-room readiness, design partner pilot, agent operating model, integration/data hardening, and productization prep.

The web/desktop Ops `Execute` button and CLI `next-cycle run --phase review-execution` create artifacts for HCAT-135 through HCAT-159: review execution, pilot commitments, production architecture decisions, admin/governance UX, and next work-cycle planning.

The web/desktop Ops `Readout` button and CLI `next-cycle run --phase review-readout` create artifacts for HCAT-160 through HCAT-184: review readout closure, pilot kickoff readiness, build-cycle alpha implementation planning, enterprise trust/compliance prep, and review automation/board hygiene.

The web/desktop Ops `Alpha` button and CLI `next-cycle run --phase review-alpha` create artifacts and operational rows for HCAT-185 through HCAT-209: review evidence automation, event/projection/credential platform foundations, decision and quality ops, enterprise trust verification, pilot runbooks, release gates, and post-drain refill decisions.

The web/desktop Ops `Next` button and CLI `next-cycle run --phase review-next` create artifacts and operational rows for HCAT-210 through HCAT-234: review room decision readiness, pilot operations activation, production platform hardening, agent governance operations, commercialization packaging, release scorecards, and post-review refill goal triggers.

The web/desktop Ops `Operate` button and CLI `next-cycle run --phase review-operating` create artifacts and operational rows for HCAT-235 through HCAT-259: review room operating sessions, design partner pilot entry, production reliability slices, governed agent runtime enforcement, commercial signoff, release gates, and follow-on drain goal criteria.

The web/desktop Ops `Parity` button and CLI `next-cycle run --phase parity-docs-ui` create artifacts and operational rows for HCAT-260 through HCAT-284: UI/CLI/API parity audits, documentation completion, 100-SKU demo data validation, item filter and Ops grouping UI polish, screenshot/desktop/performance QA, traceability refresh, and next-drain acceptance criteria.

Artifacts are readable through `/v1/next-cycle/artifacts`, CLI `next-cycle artifacts`, and the Ops tab. Automated coverage includes `npm test`, `node bin/hapa-catalog.mjs self-test`, and `npm run web:e2e`.

## Hapa Cards And Governance Placement

The node includes a Hapa card registry for Avatar and Protocol cards, placement slots for governance roles, catalog/SKU domains, SKUs, identities, global protocol guardrails, and repeating process cycles.

The seeded examples place an Inventory Governor Avatar over `in-stock`, a Forecasting Friend Avatar over `forecast.cycle`, and a Source Truth Protocol over all decisions. `GET /v1/hapa-decision-context` resolves the active card context for a process, and `POST /v1/hapa-decisions/run` records an auditable decision run with routed cards and required reviews.

The web and desktop UI expose this in the Cards tab with draggable cards and role/domain/process drop zones. Details live in `docs/HAPA_CARD_PLACEMENT.md`.

## Web And Desktop

- Web UI: `npm start`, then open `http://127.0.0.1:8768`.
- Desktop UI: `npm run desktop`.
- Desktop smoke: `npm run desktop:smoke`.

The browser UI prompts for the local bearer token before calling authenticated `/v1/*` routes.

## GitHub Pages Demo

The public demo is a static, read-only snapshot generated from the local node:

```bash
npm run pages:build
npm run pages:smoke
```

Published site:

```text
https://calderwong.github.io/hapa-catalog-node/
```

The Pages site shows item master browsing, the drained 284-card board, Hapa card placement examples, forecast and operations telemetry, and documentation links. Authenticated writes, live market retrieval, SQLite persistence, Electron, and board-drain operations require the local loopback node. Details live in `docs/GITHUB_PAGES_DEMO.md`.

## Hapa Board

Board project id: `hapa-app-hapa-catalog-node`

Registered under:

```text
/Users/calderwong/Documents/Codex/2026-05-27/can-you-generate-me-some-concept/hapa-overwatch-kanban
```

Local board summary lives in `board/BOARD.md`. The canonical board record is the append-only Overwatch Kanban event log.

## Verification

```bash
npm test
npm run web:e2e
npm run desktop:smoke
npm run performance:smoke
node bin/hapa-catalog.mjs self-test
```

The self-test exercises Hapa health/capabilities, import, item master, inventory, roles, forecast, connector/performance scaffolds, Hapa card decision context, next-cycle drain evidence, telemetry, and audit evidence. The full test suite also covers the post-MVP operations scaffold through core and API paths.
