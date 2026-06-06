# Security

`.hapaCatalog` is loopback-first.

- Default host: `127.0.0.1`.
- Default port: `8768`.
- Public routes: `/` and `/health`.
- Authenticated routes: `/capabilities` and `/v1/*`.
- Token source: `HAPA_CATALOG_TOKEN`, then `.node_token`, then generated local token.

Do not commit `.node_token`, SQLite databases, import payloads, generated reports, logs, runtime files, or projection data.

Non-loopback exposure requires a separate security pass for TLS, token storage, allowed origins, rate limits, and identity provider integration.

