# Feature Parity

Status: MVP parity plus post-MVP operations scaffold.

| Surface | Status | Notes |
| --- | --- | --- |
| API | Active | Loopback HTTP server with `/health`, `/capabilities`, `/v1/*`, JSON errors, bearer auth, 100-SKU demo fixture preview/import endpoints, forecast dashboard, overrides, assumption sets, purchase orders, experiments, comparisons, plan-of-record, and subscriber payloads. |
| CLI | Active | JSON commands for health, capabilities, import, 100-SKU fixture preview/import, mappings, search, forecast run/dashboard/assumptions/overrides/purchase-orders/experiments/subscriber payloads, MDM, connectors, operations, performance, market retrieval, telemetry, and self-test. |
| Web | Active | Dense operator UI served from `/`, including item filters, forecast dashboard filters/graph/table/overrides/experiments, board, workbench, quality, grouped Ops actions, market lookup, listing media, cards, 100-SKU import, and inspector views. |
| Desktop | Active scaffold | Electron wrapper loads the same local server surface and shared forecast dashboard controls. |
| Data | Active | SQLite local store, compact sample fixture, 100-SKU demo fixture, forecast actual/forecast/supply/override/assumption/purchase-order rows, plus append-only audit and board event evidence. |
| Tests | Active | Node test suite covers core and API smoke; Pages and web e2e smoke assert forecast dashboard, experiments, and static demo data. |
| Kanban | Active | Board is registered under Overwatch Kanban with requirement-mapped cards. |

Known MVP limits:

- Forecasting is deterministic model-comparison logic with seasonality/promotion drivers, assumption sets, override lineage, and plan-of-record promotion; it is not a production ML model.
- Lance and Telemetry integrations are represented by contract surfaces, projection exports, telemetry registration records, and payloads; live external node registration is optional.
- Desktop smoke requires Electron dependencies installed.
- Performance validation is an MVP smoke that records target scale and sampled timings; full-volume validation can be run with larger `--measured-skus` and `--measured-events` values.
- The 100-SKU fixture is intentionally deterministic local demo data for parity testing, not a supplier contract or production taxonomy.
- CamelCamelCamel live retrieval can be blocked by remote anti-automation challenges; supplied HTML/history payloads use the same schema and append path.
- Amazon listing retrieval stores product facts and media assets from product pages; UPC lookup depends on local identifier resolution or Amazon search fallback when no ASIN is known.
- Post-MVP enterprise features are local-first scaffolds with auditable rows and dry-run payloads; external SSO, updater signing, and live marketplace/storefront publishing are intentionally not wired to credentials yet.

## Forecast Dashboard And Experimentation Parity

| Capability | API | CLI | Web/Desktop | Static Demo | Tests |
| --- | --- | --- | --- | --- | --- |
| Filterable forecast dashboard | `/v1/forecasts/dashboard` | `forecast dashboard` | Forecast filters for category, brand, state, SKU, increment, granularity, and supply sorting | `docs/demo-data.json.forecast_dashboard` rendered by `docs/demo-site.js` | `test/catalog-core.test.mjs`, `test/api-smoke.test.mjs`, `scripts/pages-smoke.mjs`, `scripts/web-e2e-smoke.mjs` |
| Hybrid actuals/forecast table and YoY row | `/v1/forecasts/dashboard` | `forecast dashboard` | Forecast table first half actuals, second half forecasts, YoY row below each group | Static Forecast panel table | Same as above |
| Forecast overrides with reason and revert history | `/v1/forecasts/overrides`, `/v1/forecasts/overrides/revert` | `forecast override` | Inline forecast table override controls and effective values | Static demo shows effective values from generated snapshot | Core/API tests |
| Time-unit supply and supply on order | `/v1/forecasts/dashboard`, `/v1/forecasts/purchase-orders` | `forecast purchase-orders` | Supply chips, in-stock/on-order filters, supply-aware sorting | Static graph/table includes supply metrics | Core/API/Pages smoke |
| Assumption-driven runs and methodology comparisons | `/v1/forecasts/assumption-sets`, `/v1/forecasts/experiments/run`, `/v1/forecasts/experiments/compare`, `/v1/forecasts/plan-of-record` | `forecast assumptions`, `forecast experiment`, `forecast compare-runs`, `forecast plan promote` | Forecast inspector experiment panel | Static experiment snapshot | Core/API/Web smoke |
| Subscriber payload for planning processes | `/v1/forecasts/subscriber-payload` | `forecast subscriber-payload` | Forecast dashboard uses the same effective table and lineage data | Static payload generated during Pages build | Core/API tests |

## Parity Docs UI Drain

```bash
node bin/hapa-catalog.mjs next-cycle run --phase parity-docs-ui
```

The parity/docs/UI drain creates 25 artifacts and 5 passed test-run records:

- Phase 45: UI/CLI/API parity matrix, capability-to-command audit, endpoint-to-control audit, docs map, and acceptance suite.
- Phase 46: API examples, CLI examples, web/desktop operator guide, screenshot checklist, and release handoff notes.
- Phase 47: 100-SKU fixture taxonomy validation, API/CLI fixture tests, web import walkthrough, forecast/inventory diversity checks, and quality checks.
- Phase 48: topbar telemetry polish, item-master filters, board states, grouped Ops actions, and responsive/accessibility polish.
- Phase 49: browser screenshots, desktop smoke notes, traceability refresh, 100-SKU performance check, and next drain acceptance.
