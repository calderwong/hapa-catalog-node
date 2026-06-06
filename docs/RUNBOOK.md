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
```

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
