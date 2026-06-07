# API

Default base URL:

```text
http://127.0.0.1:8768
```

Public:

- `GET /`
- `GET /health`

Authenticated:

- `GET /capabilities`
- `GET /v1/capabilities`
- `GET /v1/telemetry`
- `POST /v1/telemetry/ping`
- `GET /v1/summary`
- `GET /v1/items`
- `GET /v1/items/:id`
- `GET /v1/search?q=...`
- `POST /v1/import-batches`
- `GET /v1/import-batches`
- `GET /v1/fixtures/demo-catalog-100`
- `POST /v1/fixtures/demo-catalog-100/import`
- `GET /v1/import-mappings`
- `POST /v1/import-mappings`
- `POST /v1/import-mappings/preview`
- `GET /v1/digital-products`
- `GET /v1/inventory/positions`
- `GET /v1/forecasts/runs`
- `POST /v1/forecasts/runs`
- `POST /v1/forecasts/scenarios`
- `POST /v1/forecasts/actuals`
- `GET /v1/forecasts/quality`
- `GET /v1/forecasts/dashboard`
- `GET /v1/forecasts/assumption-sets`
- `POST /v1/forecasts/assumption-sets`
- `GET /v1/forecasts/purchase-orders`
- `POST /v1/forecasts/purchase-orders`
- `POST /v1/forecasts/overrides`
- `POST /v1/forecasts/overrides/revert`
- `GET /v1/forecasts/subscriber-payload`
- `GET /v1/forecasts/experiments`
- `POST /v1/forecasts/experiments/run`
- `POST /v1/forecasts/experiments/compare`
- `POST /v1/forecasts/plan-of-record`
- `GET /v1/mdm/duplicates`
- `POST /v1/mdm/detect-duplicates`
- `POST /v1/mdm/merge`
- `GET /v1/roles`
- `GET /v1/identities`
- `GET /v1/permissions`
- `GET /v1/audit-events`
- `GET /v1/kanban-board`
- `GET /v1/identifiers/resolve?scheme=upc&value=...`
- `GET /v1/market/prices`
- `POST /v1/market/retrieve`
- `GET /v1/market/listing`
- `POST /v1/market/amazon-listing/retrieve`
- `GET /v1/hapa-cards`
- `POST /v1/hapa-cards`
- `GET /v1/hapa-card-placements`
- `POST /v1/hapa-card-placements`
- `GET /v1/hapa-processes`
- `POST /v1/hapa-processes`
- `POST /v1/hapa-processes/run-due`
- `GET /v1/hapa-decision-context`
- `POST /v1/hapa-decisions/run`
- `GET /v1/hapa-decisions/runs`
- `GET /v1/connectors/contracts`
- `POST /v1/connectors/validate`
- `GET /v1/connectors/runs`
- `POST /v1/connectors/run`
- `GET /v1/performance/reports`
- `POST /v1/performance/reports`
- `GET /v1/schema/migrations`
- `POST /v1/schema/migrations`
- `POST /v1/import-review`
- `GET /v1/import-review/rows`
- `POST /v1/import-review/commit`
- `GET /v1/identity-sessions`
- `POST /v1/identity-sessions`
- `POST /v1/identity-sessions/rotate`
- `GET /v1/forecasts/model-comparisons`
- `POST /v1/forecasts/model-comparisons`
- `GET /v1/market/provider-runs`
- `GET /v1/projections`
- `POST /v1/projections/sync`
- `GET /v1/pricing/scenarios`
- `POST /v1/pricing/scenarios`
- `GET /v1/lifecycle/events`
- `POST /v1/lifecycle/events`
- `GET /v1/publishing/runs`
- `POST /v1/publishing/runs`
- `GET /v1/telemetry/registrations`
- `POST /v1/telemetry/registrations`
- `GET /v1/organizations`
- `POST /v1/organizations`
- `GET /v1/inventory/ledger`
- `POST /v1/inventory/ledger`
- `GET /v1/inventory/reconciliations`
- `POST /v1/inventory/reconciliations`
- `GET /v1/quality/rules`
- `POST /v1/quality/rules`
- `POST /v1/quality/evaluate`
- `GET /v1/quality/work-orders`
- `GET /v1/desktop/packages`
- `POST /v1/desktop/packages`
- `GET /v1/lineage/exports`
- `POST /v1/lineage/exports`
- `GET /v1/retention/policies`
- `POST /v1/retention/policies`
- `GET /v1/backups`
- `POST /v1/backups`
- `GET /v1/review/evidence-bundles`
- `POST /v1/review/evidence-bundles`
- `GET /v1/events`
- `POST /v1/events`
- `GET /v1/projection-checkpoints`
- `POST /v1/projection-checkpoints`
- `GET /v1/credential-refs`
- `POST /v1/credential-refs`
- `GET /v1/decision-review-queue`
- `POST /v1/decision-review-queue`
- `POST /v1/decision-review-queue/actions`
- `GET /v1/trust/attestations`
- `POST /v1/trust/attestations`
- `GET /v1/pilot/runbooks`
- `POST /v1/pilot/runbooks`
- `GET /v1/release-gates/evaluations`
- `POST /v1/release-gates/evaluations`
- `GET /v1/review/decision-records`
- `POST /v1/review/decision-records`
- `GET /v1/pilot/operations`
- `POST /v1/pilot/operations`
- `GET /v1/platform/hardening`
- `POST /v1/platform/hardening`
- `GET /v1/agent-governance/records`
- `POST /v1/agent-governance/records`
- `GET /v1/commercial/readiness`
- `POST /v1/commercial/readiness`
- `GET /v1/next-cycle/artifacts`
- `GET /v1/next-cycle/test-runs`
- `POST /v1/next-cycle/run`
- `GET /v1/ops`
- `GET /v1/docs`

Auth:

```bash
curl -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" http://127.0.0.1:8768/v1/summary
```

Board:

```bash
curl -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" http://127.0.0.1:8768/v1/kanban-board
```

The board endpoint reconstructs visible Kanban columns from the append-only Overwatch event log configured by `HAPA_CATALOG_BOARD_LOG_PATH`.

Demo catalog fixture:

```bash
curl -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" http://127.0.0.1:8768/v1/fixtures/demo-catalog-100

curl -X POST \
  -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit":100,"actor":"api-client"}' \
  http://127.0.0.1:8768/v1/fixtures/demo-catalog-100/import
```

The fixture endpoint returns the local `data/fixtures/demo_catalog_100.csv` records for API review. The import route uses the same catalog import pipeline, audit trail, item master, inventory, and identifier writes as `POST /v1/import-batches`.

Market price history:

```bash
curl -X POST \
  -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"upc":"075375927016"}' \
  http://127.0.0.1:8768/v1/market/retrieve
```

`POST /v1/market/retrieve` accepts `url`, `asin`, `upc`, optional `html`, optional `identifiers`, and optional `history` keyed by `amazon`, `new`, and `used`. It appends point-level history into `market_price_points` and records every retrieval attempt in `market_price_snapshots`.

Amazon listing and media:

```bash
curl -X POST \
  -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.amazon.com/dp/B095QX1FSR?language=en_US"}' \
  http://127.0.0.1:8768/v1/market/amazon-listing/retrieve
```

`POST /v1/market/amazon-listing/retrieve` accepts `url`, `asin`, `upc`, optional `html`, and optional `identifiers`. UPC requests resolve through local item identifiers first. Successful responses include `listing_snapshot`, `media`, and `inserted_media`. Listing reads are available through `GET /v1/market/listing?sku=...&asin=...`.

Scoped write authorization:

Write-style routes enforce role scopes in addition to the bearer token. Set `X-Hapa-Identity` or body `identity` to select an identity. `local_operator` has `*`, `supplier_demo` can use supplier dry-runs and mapping previews, and `read_only_viewer` is denied writes. Denials write `auth.denied` audit events.

Workbench and quality:

- Mapping save/preview: `/v1/import-mappings`, `/v1/import-mappings/preview`.
- Bulk import review: `/v1/import-review`, `/v1/import-review/rows`, `/v1/import-review/commit`.
- MDM queue: `/v1/mdm/detect-duplicates`, `/v1/mdm/duplicates`, `/v1/mdm/merge`.
- Digital products: `/v1/digital-products`.
- Forecast actuals and quality: `/v1/forecasts/actuals`, `/v1/forecasts/quality`.
- Connector and performance scaffolds: `/v1/connectors/contracts`, `/v1/connectors/validate`, `/v1/connectors/run`, `/v1/connectors/runs`, `/v1/performance/reports`.

Forecast dashboard and experimentation:

```bash
curl -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" \
  "http://127.0.0.1:8768/v1/forecasts/dashboard?increment=weeks&granularity=category&sort_by=supply_time_units"

curl -X POST -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" -H "Content-Type: application/json" \
  -d '{"scope_type":"sku","scope_id":"ALPHA-RING-9","bucket_start":"2026-07-19","metric":"projected_units","override_value":42,"reason_code":"pilot_adjustment","rationale":"Design partner expects promo lift."}' \
  http://127.0.0.1:8768/v1/forecasts/overrides

curl -X POST -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" -H "Content-Type: application/json" \
  -d '{"sku":"ALPHA-RING-9","methods":["baseline","seasonal","promotion"],"assumption_set_id":"assumption-seasonal-promo"}' \
  http://127.0.0.1:8768/v1/forecasts/experiments/run
```

`GET /v1/forecasts/dashboard` returns filter metadata, a graph series, and a hybrid table whose first half is trailing actuals and second half is forecast. Forecast buckets include projected units, revenue, COGS, projected inventory, on-order units, time-unit supply, YoY comparison, applied override evidence, and lineage references. The same query accepts `category`, `brand`, `state`, `sku`, `increment`, `granularity`, `assumption_set_id`, `sort_by`, `sort_direction`, `supply_in_stock`, `supply_on_order`, and `supply_filter_logic`.

`POST /v1/forecasts/overrides` requires `reason_code` and `rationale`. Overrides update dashboard table values, graph totals, and `/v1/forecasts/subscriber-payload`. `POST /v1/forecasts/overrides/revert` marks an override reverted without deleting history.

Assumption sets and purchase orders are managed with `/v1/forecasts/assumption-sets` and `/v1/forecasts/purchase-orders`. Experiment routes run assumption-driven methodologies, compare multiple forecast runs, promote a plan of record, and expose the effective subscriber payload for downstream in-stock and planning processes.

Operations:

`GET /v1/ops` returns a single rollup for schema migrations, import reviews, connector runs, identity sessions, forecast comparisons, market provider runs, projection exports, pricing scenarios, lifecycle events, publishing runs, telemetry registrations, organizations and tenants, inventory ledger/reconciliation rows, quality rules/work orders, desktop package plans, lineage exports, retention policies, backup runs, review evidence bundles, event envelopes, projection checkpoints, credential references, decision review queues, trust attestations, pilot runbooks, release gate evaluations, review decision records, pilot operation records, platform hardening records, agent governance records, and commercial readiness records.

Common operation writes:

```bash
curl -X POST -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" -H "Content-Type: application/json" \
  -d '{"connector_id":"connector-erp-plm","mode":"dry_run"}' \
  http://127.0.0.1:8768/v1/connectors/run

curl -X POST -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" -H "Content-Type: application/json" \
  -d '{"target":"hapa-lance-node"}' \
  http://127.0.0.1:8768/v1/projections/sync
```

Next cycle drain:

```bash
curl -X POST -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" -H "Content-Type: application/json" \
  -d '{"phase":"all"}' \
  http://127.0.0.1:8768/v1/next-cycle/run
```

`POST /v1/next-cycle/run` accepts `phase` as `review`, `connected`, `governance`, `intelligence`, `release`, `continuation`, `review-prep`, `review-execution`, `review-readout`, `review-alpha`, `review-next`, `review-operating`, `parity-docs-ui`, or `all`. `all` drains the review-to-release set for HCAT-062 through HCAT-089. `continuation` drains HCAT-090 through HCAT-109 for pilot operations, agent decision ops, compliance/admin readiness, test scale, and pilot learning. `review-prep` drains HCAT-110 through HCAT-134 for review-room readiness, design partner pilot, agent operating model, integration/data hardening, and productization prep. `review-execution` drains HCAT-135 through HCAT-159 for the review execution room, pilot commitments, production architecture decisions, admin/governance UX, and next work-cycle planning. `review-readout` drains HCAT-160 through HCAT-184 for review closure, pilot kickoff readiness, build-cycle alpha planning, enterprise trust/compliance prep, and review automation/board hygiene. `review-alpha` drains HCAT-185 through HCAT-209 for evidence bundles, event envelopes, projection checkpoints, credential references, decision queues, trust attestations, pilot runbooks, release gate evaluations, and refill decisions. `review-next` drains HCAT-210 through HCAT-234 for review-room decision readiness, pilot operations activation, production hardening, agent governance operations, commercial readiness, release scorecards, and post-review refill goal triggers. `review-operating` drains HCAT-235 through HCAT-259 for live review operating sessions, design partner pilot entry, production reliability slices, governed agent runtime enforcement, commercial/refill signoff, release gates, and follow-on drain goal criteria. `parity-docs-ui` drains HCAT-260 through HCAT-284 for parity matrices, documentation completion, 100-SKU fixture validation, UI enhancement evidence, browser/desktop/performance QA, traceability refresh, and next-drain acceptance. Read rows with `GET /v1/next-cycle/artifacts?phase=Phase%2049` and `GET /v1/next-cycle/test-runs`.

Hapa card placement:

```bash
curl -X POST \
  -H "Authorization: Bearer $HAPA_CATALOG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"card_id":"card-avatar-forecast-friend","placement_type":"process","target_type":"process","target_id":"forecast.cycle","role":"governor","decision_mode":"review_required"}' \
  http://127.0.0.1:8768/v1/hapa-card-placements
```

`GET /v1/hapa-decision-context?process_key=forecast.cycle` returns the cards, placements, required reviews, and execution notes for a process. `POST /v1/hapa-decisions/run` records the routed decision, and `POST /v1/hapa-processes/run-due` runs enabled repeating processes through the same resolver.
