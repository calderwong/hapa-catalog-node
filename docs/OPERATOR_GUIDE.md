# Web And Desktop Operator Guide

Use the same workflow in the browser and Electron desktop shell.

1. Start the node with `npm start` or `npm run desktop`.
2. Paste the local bearer token from `.node_token` or `HAPA_CATALOG_TOKEN`.
3. Click `Import 100 SKUs` to seed the deterministic demo catalog.
4. Use Items search plus category, brand, and state filters to browse the item master.
5. Use Forecasts to filter category, brand, state, or SKU; switch day/week/month/quarter/year increments; compare trailing actuals against forward forecasts; inspect YoY rows; sort by in-stock or on-order supply; and review inventory, demand, revenue, cost, and COGS graph totals.
6. Enter forecast overrides from the Forecast table with a reason code and rationale. The effective table, graph, subscriber payload, and audit evidence update from the same override record.
7. Review Forecast experiments to compare assumptions, methodologies, hierarchy levels, and promoted plans of record before using the output in planning or in-stock processes.
8. Use Board to inspect HCAT cards, checkpoints, evidence, and drained/refill state.
9. Use Ops grouped actions for data, identity, lifecycle, next-cycle, and review operations.
10. Use Cards to place Avatar or Protocol cards onto roles, catalog domains, SKUs, and repeating processes.

Desktop parity means the Electron wrapper loads the same web bundle and loopback API, so browser verification and desktop smoke should agree on visible controls and authenticated data.
