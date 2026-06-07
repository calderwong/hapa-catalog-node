# .hapaCatalog Runbook

## Install

```bash
npm install
```

## Verify

```bash
npm test
npm run desktop:smoke
npm run performance:smoke
NODE_NO_WARNINGS=1 node bin/hapa-catalog.mjs self-test
```

## Start Web/API

```bash
HAPA_CATALOG_TOKEN=test-token npm start
```

Open:

```text
http://127.0.0.1:8768
```

Paste `test-token` into the web UI bearer token field for local testing.

## Start Desktop

```bash
npm run desktop
```

The desktop wrapper starts the loopback server and loads the same web operator UI.

## Sample Import

```bash
node bin/hapa-catalog.mjs import --file data/fixtures/sample_catalog.csv --dry-run
node bin/hapa-catalog.mjs import --file data/fixtures/sample_catalog.csv
```

## Demo Catalog Import

```bash
node bin/hapa-catalog.mjs fixtures demo-catalog --limit 100
node bin/hapa-catalog.mjs fixtures import-demo-catalog --limit 100
```

The same fixture is available in the web and desktop top bar through `Import 100 SKUs`, and over API through `/v1/fixtures/demo-catalog-100` plus `/v1/fixtures/demo-catalog-100/import`.

## Forecast

```bash
node bin/hapa-catalog.mjs forecast run --sku ALPHA-RING-9 --location main-bin
node bin/hapa-catalog.mjs forecast dashboard --increment weeks --granularity category --sort-by supply_time_units
node bin/hapa-catalog.mjs forecast assumptions
node bin/hapa-catalog.mjs forecast purchase-orders --sku ALPHA-RING-9
node bin/hapa-catalog.mjs forecast override --sku ALPHA-RING-9 --bucket-start 2026-07-19 --metric projected_units --value 42 --reason-code pilot_adjustment --rationale "Design partner expects promo lift"
node bin/hapa-catalog.mjs forecast experiment --sku ALPHA-RING-9 --methods baseline seasonal promotion --assumption-set-id assumption-seasonal-promo
node bin/hapa-catalog.mjs forecast subscriber-payload --increment weeks --granularity sku
```

The Forecast view in web and desktop exposes the same data as `forecast dashboard`: category, brand, state, and SKU filters; increment/granularity controls; trailing actuals; projected forecast buckets; YoY comparison rows; inventory, demand, revenue, and COGS graph bars; inline override capture with rationale; time-unit supply; supply on order; and experiment/comparison panels.

Forecast runs record lineage in `explanation.lineage`: timestamp created, source data references, app/process/agent, assumption set, methodology, granularity, and scope. Overrides preserve the original value, effective value, reason, actor, and revert status, and are included in subscriber payloads for downstream in-stock and planning processes.

## Workbench And Quality

```bash
node bin/hapa-catalog.mjs connectors validate
node bin/hapa-catalog.mjs performance report --measured-skus 1000 --measured-events 5000
node bin/hapa-catalog.mjs mdm detect --threshold 0.5
node bin/hapa-catalog.mjs forecast quality
```

## Board Review

Canonical board:

```text
/Users/calderwong/Documents/Codex/2026-05-27/can-you-generate-me-some-concept/hapa-overwatch-kanban/data/hapa-app-hapa-catalog-node/events.ndjson
```

The board endpoint and web Board tab reconstruct cards from the append-only event log. The MVP drain should show all HCAT cards in Done after the verification checkpoint is appended.

## Parity Drain

```bash
node bin/hapa-catalog.mjs next-cycle run --phase parity-docs-ui --actor cli
node bin/hapa-catalog.mjs next-cycle artifacts --phase "Phase 49"
node bin/hapa-catalog.mjs next-cycle tests --status passed
```

Use the web/desktop Ops `Parity` action for the same drain from the operator console. Review `docs/OPERATOR_GUIDE.md`, `docs/SCREENSHOT_CHECKLIST.md`, and `docs/RELEASE_HANDOFF.md` before moving HCAT-260 through HCAT-284 to Done.

## GitHub Pages Demo

Build the public static demo from the local node state:

```bash
npm run pages:build
npm run pages:smoke
```

Publish with GitHub Pages configured to serve the `main` branch from `/docs`. The hosted demo is intentionally read-only. Use the loopback app for token-gated API writes, imports, market retrieval, forecast creation, and board drain operations.
