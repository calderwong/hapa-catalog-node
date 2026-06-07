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

- Checkpoint: `.hapaCatalog forecast dashboard and experimentation board drained`
- Tasks: 344 done / 0 active / 0 backlog / 0 blocked
- Events: 720 append-only events / 31 checkpoints
- Scope drained: HCAT-285..344 forecast dashboard, filters, hybrid actuals/forecast table, YoY rows, graphing, lineage, overrides, supply on order, assumption sets, methodology comparison, plan-of-record promotion, subscriber payloads, docs, static demo, and tests.
- Evidence: `npm test`, `npm run web:e2e`, `npm run pages:build`, `npm run pages:smoke`, CLI forecast dashboard smoke, docs parity updates, and append-only task move events.
