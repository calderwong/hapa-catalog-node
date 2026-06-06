# Connector Contracts

The MVP declares contract-ready scaffolds for ERP/PLM item sync, WMS/3PL inventory sync, supplier portal draft import, marketplace listing exchange, storefront export, CRM/order demand feed, and BI export.

Contracts are exposed through:

- `GET /v1/connectors/contracts`
- `POST /v1/connectors/validate`
- `POST /v1/connectors/run`
- `GET /v1/connectors/runs`
- CLI `connectors contracts`
- CLI `connectors validate`
- CLI `connectors run --connector-id connector-erp-plm`

Fixtures live under `data/fixtures/connectors`. They are intentionally compact and schema-versioned so each external system has a stable example payload before live connector credentials are introduced.

`connectors run` reads the fixture declared on the contract and executes the same import pipeline in dry-run mode by default. Inbound connectors can be committed with `--commit`; outbound connectors produce a payload preview without external credentials.
