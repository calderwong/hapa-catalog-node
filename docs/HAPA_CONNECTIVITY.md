# Hapa Connectivity

## Identity

- Node id: `hapa-catalog-node`
- Display name: `.hapaCatalog`
- System group: `commerce/operations/trust`
- Board id: `hapa-app-hapa-catalog-node`

## Reads From

- Product catalog files and API payloads.
- Supplier, ERP/PLM, marketplace, WMS/3PL, CRM/order, and manual sources.
- Hapa Agent Registry identities when configured.
- Hapa Telemetry discovery when configured.

## Writes To

- Local SQLite item master and inventory store.
- Audit events and self-test artifacts.
- Overwatch Kanban board events.
- Optional Lance-compatible projection records.
- Optional Overwatch/open-task remediation cards.

## Related Nodes

- Hapa Telemetry Node: discovery, health, and graph status.
- Hapa Lance Node: item, quality, and forecast projections.
- Hapa Agent Registry Node: agent identities and role-aware suggestions.
- Hapa front door: ecosystem route and operator launch context.
- Hapa Quest Keeper / Overwatch Kanban: board state and work evidence.

