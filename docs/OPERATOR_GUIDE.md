# Web And Desktop Operator Guide

Use the same workflow in the browser and Electron desktop shell.

1. Start the node with `npm start` or `npm run desktop`.
2. Paste the local bearer token from `.node_token` or `HAPA_CATALOG_TOKEN`.
3. Click `Import 100 SKUs` to seed the deterministic demo catalog.
4. Use Items search plus category, brand, and state filters to browse the item master.
5. Use Board to inspect HCAT cards, checkpoints, evidence, and drained/refill state.
6. Use Ops grouped actions for data, identity, lifecycle, next-cycle, and review operations.
7. Use Cards to place Avatar or Protocol cards onto roles, catalog domains, SKUs, and repeating processes.

Desktop parity means the Electron wrapper loads the same web bundle and loopback API, so browser verification and desktop smoke should agree on visible controls and authenticated data.
