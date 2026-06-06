# Release Handoff Notes

## Current State

- Board tranche HCAT-260 through HCAT-284 is implemented by `next-cycle run --phase parity-docs-ui`.
- The 100-SKU demo fixture is available through API, CLI, web, and desktop.
- Web and desktop share item filters, grouped Ops actions, board inspection, Cards placement, and market lookup.

## Verification Commands

```bash
npm test
npm run web:e2e
npm run desktop:smoke
npm run performance:smoke
node bin/hapa-catalog.mjs self-test
npm run pages:build
npm run pages:smoke
```

## Hosted Demo

- GitHub Pages source: `docs/`
- Demo entrypoint: `docs/index.html`
- Snapshot generator: `scripts/build-pages-demo.mjs`
- Smoke check: `scripts/pages-smoke.mjs`

The hosted site is static and read-only. It is safe for public review because `docs/demo-data.json` redacts local filesystem paths and does not include bearer tokens, SQLite files, or runtime logs.

## Demo Data

```bash
node bin/hapa-catalog.mjs fixtures demo-catalog --limit 100
node bin/hapa-catalog.mjs fixtures import-demo-catalog --limit 100
node bin/hapa-catalog.mjs next-cycle run --phase parity-docs-ui
```

## Known Limits

- The bearer token is local-first loopback auth, not production SSO.
- Marketplace fetches remain provider-policy-safe and may store blocked retrieval evidence instead of scraped data.
- The demo fixture is deterministic local dummy data, not a supplier-certified taxonomy.

## Next Drain Criteria

Only set the next drain goal after a board refill is appended append-only, acceptance criteria are explicit, and the five verification commands pass.
