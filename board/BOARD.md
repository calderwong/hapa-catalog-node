# .hapaCatalog Board

Canonical board id: `hapa-app-hapa-catalog-node`

Canonical append-only log:

```text
/Users/calderwong/Documents/Codex/2026-05-27/can-you-generate-me-some-concept/hapa-overwatch-kanban/data/hapa-app-hapa-catalog-node/events.ndjson
```

This local note mirrors the board purpose only. Do not treat it as the task source of truth.

## Drain Rule

A card is done only when the implementation surface and verification evidence named in the card are present. Completion is appended as a `task_moved` or `checkpoint` event.

## Latest Snapshot

- Checkpoint: `.hapaCatalog parity documentation demo data and UI cycle drained`
- Tasks: 284 done / 0 active / 0 backlog / 0 blocked
- Events: 596 append-only events / 27 checkpoints
- Done: HCAT-260..284 parity matrix, API/CLI/web/desktop parity evidence, documentation completion, 100-SKU demo data validation, operator UI enhancements, browser screenshot evidence, desktop smoke, performance smoke, traceability refresh, and next-drain acceptance.
- Evidence: `npm test`, `npm run web:e2e`, `npm run desktop:smoke`, `npm run performance:smoke`, `node bin/hapa-catalog.mjs self-test`, demo fixture CLI checks, final browser verification at `http://127.0.0.1:8768`, and `outputs/hapa-catalog-board-drained.png`.
