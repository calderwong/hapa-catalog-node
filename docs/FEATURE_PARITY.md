# Feature Parity

Status: MVP parity plus post-MVP operations scaffold.

| Surface | Status | Notes |
| --- | --- | --- |
| API | Active | Loopback HTTP server with `/health`, `/capabilities`, `/v1/*`, JSON errors, bearer auth, and 100-SKU demo fixture preview/import endpoints. |
| CLI | Active | JSON commands for health, capabilities, import, 100-SKU fixture preview/import, mappings, search, forecast, MDM, connectors, operations, performance, market retrieval, telemetry, and self-test. |
| Web | Active | Dense operator UI served from `/`, including item filters, board, workbench, quality, grouped Ops actions, market lookup, listing media, cards, 100-SKU import, and inspector views. |
| Desktop | Active scaffold | Electron wrapper loads the local server surface. |
| Data | Active | SQLite local store, compact sample fixture, 100-SKU demo fixture, plus append-only audit and board event evidence. |
| Tests | Active | Node test suite covers core and API smoke. |
| Kanban | Active | Board is registered under Overwatch Kanban with requirement-mapped cards. |

Known MVP limits:

- Forecasting is deterministic model-comparison logic with seasonality/promotion drivers, not a production ML model.
- Lance and Telemetry integrations are represented by contract surfaces, projection exports, telemetry registration records, and payloads; live external node registration is optional.
- Desktop smoke requires Electron dependencies installed.
- Performance validation is an MVP smoke that records target scale and sampled timings; full-volume validation can be run with larger `--measured-skus` and `--measured-events` values.
- The 100-SKU fixture is intentionally deterministic local demo data for parity testing, not a supplier contract or production taxonomy.
- CamelCamelCamel live retrieval can be blocked by remote anti-automation challenges; supplied HTML/history payloads use the same schema and append path.
- Amazon listing retrieval stores product facts and media assets from product pages; UPC lookup depends on local identifier resolution or Amazon search fallback when no ASIN is known.
- Post-MVP enterprise features are local-first scaffolds with auditable rows and dry-run payloads; external SSO, updater signing, and live marketplace/storefront publishing are intentionally not wired to credentials yet.

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
