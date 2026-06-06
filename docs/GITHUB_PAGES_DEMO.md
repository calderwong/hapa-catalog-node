# GitHub Pages Demo

The hosted GitHub Pages site is a read-only `.hapaCatalog` demo snapshot. It is generated from the same core APIs as the local app, then sanitized for public review.

## Published Site

- Demo URL: <https://calderwong.github.io/hapa-catalog-node/>
- Repository: <https://github.com/calderwong/hapa-catalog-node>
- Source: `docs/`

## What The Demo Shows

- 100+ SKU item master browsing with category, brand, status, and text filters.
- Drained Hapa board evidence with 284 of 284 cards complete.
- Hapa Avatar and Protocol card placement examples.
- Forecast run, fixture diversity, inventory, and operations telemetry.
- Documentation manifest with API, CLI, web, desktop, and board traceability.

## What Requires The Local Node

GitHub Pages cannot run the loopback API, SQLite store, bearer-token writes, Electron wrapper, or live market retrieval. Use the local node for:

```bash
npm install
npm start
```

Then open:

```text
http://127.0.0.1:8768
```

## Build And Verify

```bash
npm run pages:build
npm run pages:smoke
npm test
npm run web:e2e
```

The build writes `docs/demo-data.json` and refreshes the board screenshot asset when the local screenshot exists.
