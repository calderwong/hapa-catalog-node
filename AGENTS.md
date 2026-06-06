# .hapaCatalog Agent Notes

This repo is the owning source for the `hapa-catalog-node` Hapa Protocol node.

## Safe Edit Rules

- Preserve API, CLI, web, desktop, test, and Kanban parity.
- Keep runtime data out of Git: `.node_token`, SQLite DBs, import payloads, logs, generated projections, and self-test reports.
- Use append-only board events for coordination. Do not rewrite existing `events.ndjson`.
- Label inferred roadmap ideas separately from verified runtime facts.
- Do not expose the service beyond loopback without a new security review.

## Board Writeback

Canonical board:

```text
/Users/calderwong/Documents/Codex/2026-05-27/can-you-generate-me-some-concept/hapa-overwatch-kanban/data/hapa-app-hapa-catalog-node/events.ndjson
```

Append implementation progress, blockers, handoffs, and verification evidence as `task_comment`, `task_moved`, or `checkpoint` events.

## Verification

Run the smallest meaningful checks:

```bash
npm test
node bin/hapa-catalog.mjs self-test
```

Before claiming runtime status, launch or health-check the service.

