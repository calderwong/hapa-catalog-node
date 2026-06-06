import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function encode(value) {
  return JSON.stringify(value ?? null);
}

function decode(value, fallback = null) {
  if (value == null || value === '') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export class CatalogStore {
  constructor(dbPath) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.migrate();
    this.seedGovernance();
    this.seedHapaCards();
  }

  close() {
    this.db.close();
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        brand TEXT,
        category TEXT,
        lifecycle TEXT NOT NULL DEFAULT 'draft',
        taxonomy TEXT NOT NULL DEFAULT '{}',
        attributes TEXT NOT NULL DEFAULT '{}',
        provenance TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        external_keys TEXT NOT NULL DEFAULT '{}',
        provenance TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS skus (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL REFERENCES products(id),
        sku TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        identifiers TEXT NOT NULL DEFAULT '{}',
        supplier_id TEXT REFERENCES suppliers(id),
        status TEXT NOT NULL DEFAULT 'active',
        attributes TEXT NOT NULL DEFAULT '{}',
        sales_30d REAL NOT NULL DEFAULT 0,
        lead_time_days INTEGER NOT NULL DEFAULT 0,
        price REAL NOT NULL DEFAULT 0,
        cost REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS packaging (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        level TEXT NOT NULL,
        units_per_pack REAL NOT NULL DEFAULT 1,
        gtin TEXT,
        dimensions TEXT NOT NULL DEFAULT '{}',
        weight REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(sku_id, level)
      );
      CREATE TABLE IF NOT EXISTS relationships (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS item_identifiers (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        scheme TEXT NOT NULL,
        value TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'catalog',
        confidence REAL NOT NULL DEFAULT 1,
        metadata TEXT NOT NULL DEFAULT '{}',
        first_seen_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        UNIQUE(scheme, value, source)
      );
      CREATE INDEX IF NOT EXISTS idx_item_identifiers_lookup ON item_identifiers(scheme, value);
      CREATE TABLE IF NOT EXISTS inventory_positions (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        facility TEXT NOT NULL,
        location TEXT NOT NULL,
        on_hand REAL NOT NULL DEFAULT 0,
        reserved REAL NOT NULL DEFAULT 0,
        in_transit REAL NOT NULL DEFAULT 0,
        safety_stock REAL NOT NULL DEFAULT 0,
        reorder_point REAL NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        UNIQUE(sku_id, facility, location)
      );
      CREATE TABLE IF NOT EXISTS inventory_events (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        facility TEXT NOT NULL,
        location TEXT NOT NULL,
        event_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        ref TEXT,
        occurred_at TEXT NOT NULL,
        provenance TEXT NOT NULL DEFAULT '{}'
      );
      CREATE TABLE IF NOT EXISTS roles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        scopes TEXT NOT NULL DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS identities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        role_id TEXT NOT NULL REFERENCES roles(id),
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS permissions (
        id TEXT PRIMARY KEY,
        role_id TEXT NOT NULL REFERENCES roles(id),
        action TEXT NOT NULL,
        scope TEXT NOT NULL,
        effect TEXT NOT NULL DEFAULT 'allow',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        object_type TEXT NOT NULL,
        object_id TEXT,
        summary TEXT NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS import_batches (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        stage TEXT NOT NULL,
        totals TEXT NOT NULL DEFAULT '{}',
        errors TEXT NOT NULL DEFAULT '[]',
        mapping_version TEXT NOT NULL DEFAULT 'canonical-import-v1',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS import_mappings (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT NOT NULL DEFAULT 'mapping-v1',
        source_type TEXT NOT NULL DEFAULT 'generic',
        field_map TEXT NOT NULL DEFAULT '{}',
        defaults TEXT NOT NULL DEFAULT '{}',
        conversions TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS forecast_runs (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        location TEXT NOT NULL,
        channel TEXT NOT NULL,
        horizon_days INTEGER NOT NULL,
        status TEXT NOT NULL,
        assumptions TEXT NOT NULL DEFAULT '{}',
        explanation TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS forecast_series (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL REFERENCES forecast_runs(id),
        bucket_start TEXT NOT NULL,
        bucket_end TEXT NOT NULL,
        baseline REAL NOT NULL,
        adjusted REAL NOT NULL,
        confidence_low REAL NOT NULL,
        confidence_high REAL NOT NULL,
        drivers TEXT NOT NULL DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS forecast_actuals (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        location TEXT NOT NULL,
        channel TEXT NOT NULL,
        bucket_start TEXT NOT NULL,
        bucket_end TEXT NOT NULL,
        actual REAL NOT NULL,
        stockout_days REAL NOT NULL DEFAULT 0,
        miss_reason TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS forecast_quality_events (
        id TEXT PRIMARY KEY,
        run_id TEXT REFERENCES forecast_runs(id),
        sku_id TEXT NOT NULL REFERENCES skus(id),
        actual_id TEXT REFERENCES forecast_actuals(id),
        error REAL NOT NULL,
        absolute_error REAL NOT NULL,
        bias REAL NOT NULL,
        percent_error REAL NOT NULL,
        stockout_impact REAL NOT NULL DEFAULT 0,
        miss_reason TEXT,
        remediation TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS quality_events (
        id TEXT PRIMARY KEY,
        object_type TEXT NOT NULL,
        object_id TEXT,
        rule_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        owner_role TEXT NOT NULL,
        message TEXT NOT NULL,
        remediation TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projection_state (
        id TEXT PRIMARY KEY,
        source_watermark TEXT NOT NULL,
        row_count INTEGER NOT NULL,
        error_count INTEGER NOT NULL,
        schema_version TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS duplicate_candidates (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        duplicate_sku_id TEXT NOT NULL REFERENCES skus(id),
        confidence REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        reasons TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(sku_id, duplicate_sku_id)
      );
      CREATE TABLE IF NOT EXISTS merge_events (
        id TEXT PRIMARY KEY,
        winner_sku_id TEXT NOT NULL REFERENCES skus(id),
        merged_sku_id TEXT NOT NULL REFERENCES skus(id),
        actor TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'applied',
        survivorship TEXT NOT NULL DEFAULT '{}',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS digital_products (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL UNIQUE REFERENCES skus(id),
        version TEXT,
        file_ref TEXT,
        download_url TEXT,
        license TEXT,
        entitlement TEXT,
        subscription_term TEXT,
        rights TEXT NOT NULL DEFAULT '{}',
        release_lifecycle TEXT NOT NULL DEFAULT 'active',
        attributes TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS connector_contracts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT NOT NULL,
        direction TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        schema TEXT NOT NULL DEFAULT '{}',
        fixture_path TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS performance_reports (
        id TEXT PRIMARY KEY,
        sku_target INTEGER NOT NULL,
        inventory_event_target INTEGER NOT NULL,
        measured_skus INTEGER NOT NULL,
        measured_inventory_events INTEGER NOT NULL,
        duration_ms REAL NOT NULL,
        search_ms REAL NOT NULL,
        import_preview_ms REAL NOT NULL,
        result TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS hapa_cards (
        id TEXT PRIMARY KEY,
        card_kind TEXT NOT NULL,
        name TEXT NOT NULL,
        owner_identity_id TEXT REFERENCES identities(id),
        organization_id TEXT,
        source_node TEXT,
        card_ref TEXT,
        skills TEXT NOT NULL DEFAULT '[]',
        context TEXT NOT NULL DEFAULT '{}',
        tags TEXT NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS hapa_card_placements (
        id TEXT PRIMARY KEY,
        card_id TEXT NOT NULL REFERENCES hapa_cards(id),
        placement_type TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'advisor',
        decision_mode TEXT NOT NULL DEFAULT 'context',
        priority INTEGER NOT NULL DEFAULT 50,
        cadence TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(card_id, placement_type, target_type, target_id, role)
      );
      CREATE INDEX IF NOT EXISTS idx_hapa_card_placements_target ON hapa_card_placements(target_type, target_id, active);
      CREATE TABLE IF NOT EXISTS hapa_decision_runs (
        id TEXT PRIMARY KEY,
        process_key TEXT NOT NULL,
        trigger_type TEXT NOT NULL DEFAULT 'manual',
        subject_type TEXT,
        subject_id TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        actor TEXT NOT NULL,
        input_context TEXT NOT NULL DEFAULT '{}',
        card_context TEXT NOT NULL DEFAULT '{}',
        result TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS hapa_repeating_processes (
        id TEXT PRIMARY KEY,
        process_key TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        cadence TEXT NOT NULL,
        target_domain TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        card_policy TEXT NOT NULL DEFAULT '{}',
        last_run_at TEXT,
        next_run_at TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS market_price_snapshots (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        source TEXT NOT NULL,
        source_url TEXT,
        asin TEXT,
        status TEXT NOT NULL,
        identifiers TEXT NOT NULL DEFAULT '{}',
        price_summary TEXT NOT NULL DEFAULT '{}',
        warnings TEXT NOT NULL DEFAULT '[]',
        error TEXT,
        retrieved_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS market_price_points (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        snapshot_id TEXT REFERENCES market_price_snapshots(id),
        source TEXT NOT NULL,
        asin TEXT,
        price_type TEXT NOT NULL,
        observed_at TEXT NOT NULL,
        price REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        availability TEXT,
        condition TEXT,
        seller_type TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        UNIQUE(sku_id, source, price_type, observed_at, price)
      );
      CREATE INDEX IF NOT EXISTS idx_market_price_points_lookup ON market_price_points(sku_id, price_type, observed_at);
      CREATE TABLE IF NOT EXISTS market_listing_snapshots (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        source TEXT NOT NULL,
        source_url TEXT,
        asin TEXT,
        status TEXT NOT NULL,
        title TEXT,
        brand TEXT,
        price REAL,
        list_price REAL,
        currency TEXT NOT NULL DEFAULT 'USD',
        rating REAL,
        review_count INTEGER,
        bought_in_last_month TEXT,
        availability TEXT,
        feature_bullets TEXT NOT NULL DEFAULT '[]',
        description TEXT,
        details TEXT NOT NULL DEFAULT '{}',
        documents TEXT NOT NULL DEFAULT '[]',
        warnings TEXT NOT NULL DEFAULT '[]',
        retrieved_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_market_listing_snapshots_lookup ON market_listing_snapshots(sku_id, source, asin, created_at);
      CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        listing_snapshot_id TEXT REFERENCES market_listing_snapshots(id),
        source TEXT NOT NULL,
        source_url TEXT,
        media_type TEXT NOT NULL,
        variant TEXT,
        url TEXT NOT NULL,
        alt TEXT,
        width INTEGER,
        height INTEGER,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(sku_id, source, url)
      );
      CREATE INDEX IF NOT EXISTS idx_media_assets_lookup ON media_assets(sku_id, source, media_type);
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id TEXT PRIMARY KEY,
        version TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'applied',
        applied_at TEXT NOT NULL,
        rollback_plan TEXT NOT NULL DEFAULT '{}',
        checksum TEXT,
        evidence TEXT NOT NULL DEFAULT '[]'
      );
      CREATE TABLE IF NOT EXISTS import_review_rows (
        id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL REFERENCES import_batches(id),
        row_index INTEGER NOT NULL,
        status TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'info',
        errors TEXT NOT NULL DEFAULT '[]',
        raw_record TEXT NOT NULL DEFAULT '{}',
        canonical_preview TEXT NOT NULL DEFAULT '{}',
        owner_role TEXT NOT NULL DEFAULT 'product_data_steward',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_import_review_rows_batch ON import_review_rows(batch_id, status);
      CREATE TABLE IF NOT EXISTS connector_runs (
        id TEXT PRIMARY KEY,
        connector_id TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'dry_run',
        status TEXT NOT NULL,
        fetched_count INTEGER NOT NULL DEFAULT 0,
        imported_batch_id TEXT REFERENCES import_batches(id),
        preview TEXT NOT NULL DEFAULT '{}',
        errors TEXT NOT NULL DEFAULT '[]',
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS identity_sessions (
        id TEXT PRIMARY KEY,
        identity_id TEXT NOT NULL REFERENCES identities(id),
        token_suffix TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        scopes TEXT NOT NULL DEFAULT '[]',
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        rotated_at TEXT,
        revoked_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_identity_sessions_identity ON identity_sessions(identity_id, status);
      CREATE TABLE IF NOT EXISTS forecast_model_comparisons (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        location TEXT NOT NULL,
        channel TEXT NOT NULL,
        baseline_run_id TEXT REFERENCES forecast_runs(id),
        models TEXT NOT NULL DEFAULT '[]',
        winner TEXT NOT NULL DEFAULT '{}',
        metrics TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS market_provider_runs (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        lookup TEXT NOT NULL,
        status TEXT NOT NULL,
        cache_key TEXT,
        retry_after TEXT,
        warnings TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projection_exports (
        id TEXT PRIMARY KEY,
        target TEXT NOT NULL,
        dataset TEXT NOT NULL,
        schema_version TEXT NOT NULL,
        watermark TEXT NOT NULL,
        row_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS pricing_scenarios (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        current_price REAL NOT NULL DEFAULT 0,
        cost REAL NOT NULL DEFAULT 0,
        target_margin REAL NOT NULL DEFAULT 0,
        recommended_price REAL NOT NULL DEFAULT 0,
        markdown REAL NOT NULL DEFAULT 0,
        constraints TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'draft',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS lifecycle_events (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        from_state TEXT NOT NULL,
        to_state TEXT NOT NULL,
        actor TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'applied',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS publishing_runs (
        id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        sku_count INTEGER NOT NULL DEFAULT 0,
        readiness TEXT NOT NULL DEFAULT '{}',
        payload_preview TEXT NOT NULL DEFAULT '{}',
        external_refs TEXT NOT NULL DEFAULT '[]',
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS telemetry_registrations (
        id TEXT PRIMARY KEY,
        endpoint TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'registered',
        heartbeat_at TEXT NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'organization',
        external_keys TEXT NOT NULL DEFAULT '{}',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS identity_tenants (
        id TEXT PRIMARY KEY,
        identity_id TEXT NOT NULL REFERENCES identities(id),
        organization_id TEXT NOT NULL REFERENCES organizations(id),
        role TEXT NOT NULL DEFAULT 'member',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(identity_id, organization_id, role)
      );
      CREATE TABLE IF NOT EXISTS inventory_ledger_events (
        id TEXT PRIMARY KEY,
        sku_id TEXT NOT NULL REFERENCES skus(id),
        facility TEXT NOT NULL,
        location TEXT NOT NULL,
        event_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        balance_after REAL NOT NULL,
        ref TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS inventory_reconciliations (
        id TEXT PRIMARY KEY,
        facility TEXT NOT NULL,
        status TEXT NOT NULL,
        discrepancy_count INTEGER NOT NULL DEFAULT 0,
        adjustments TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS quality_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        object_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'warning',
        expression TEXT NOT NULL DEFAULT '{}',
        owner_role TEXT NOT NULL DEFAULT 'product_data_steward',
        enabled INTEGER NOT NULL DEFAULT 1,
        remediation TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS quality_work_orders (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL REFERENCES quality_rules(id),
        object_type TEXT NOT NULL,
        object_id TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        severity TEXT NOT NULL,
        owner_role TEXT NOT NULL,
        message TEXT NOT NULL,
        remediation TEXT NOT NULL,
        evidence TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS desktop_packages (
        id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        status TEXT NOT NULL,
        artifact_ref TEXT NOT NULL,
        updater_policy TEXT NOT NULL DEFAULT '{}',
        offline_mode INTEGER NOT NULL DEFAULT 1,
        smoke_result TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS lineage_exports (
        id TEXT PRIMARY KEY,
        dataset TEXT NOT NULL,
        format TEXT NOT NULL DEFAULT 'json',
        status TEXT NOT NULL,
        row_count INTEGER NOT NULL DEFAULT 0,
        payload TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS retention_policies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        dataset TEXT NOT NULL,
        policy TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS backup_runs (
        id TEXT PRIMARY KEY,
        backup_type TEXT NOT NULL,
        status TEXT NOT NULL,
        artifact_ref TEXT NOT NULL,
        retention_policy_id TEXT REFERENCES retention_policies(id),
        recovery_drill_result TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS next_cycle_artifacts (
        id TEXT PRIMARY KEY,
        artifact_type TEXT NOT NULL,
        phase TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        payload TEXT NOT NULL DEFAULT '{}',
        evidence TEXT NOT NULL DEFAULT '[]',
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_next_cycle_artifacts_lookup ON next_cycle_artifacts(phase, artifact_type, status);
      CREATE TABLE IF NOT EXISTS next_cycle_test_runs (
        id TEXT PRIMARY KEY,
        test_type TEXT NOT NULL,
        status TEXT NOT NULL,
        target TEXT NOT NULL,
        assertions TEXT NOT NULL DEFAULT '[]',
        evidence TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS review_evidence_bundles (
        id TEXT PRIMARY KEY,
        bundle_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        manifest TEXT NOT NULL DEFAULT '{}',
        redaction_manifest TEXT NOT NULL DEFAULT '{}',
        sources TEXT NOT NULL DEFAULT '[]',
        board_checkpoint_id TEXT,
        board_checkpoint_title TEXT,
        artifact_count INTEGER NOT NULL DEFAULT 0,
        test_run_count INTEGER NOT NULL DEFAULT 0,
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_review_evidence_bundles_lookup ON review_evidence_bundles(bundle_type, status, created_at);
      CREATE TABLE IF NOT EXISTS event_envelopes (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        object_type TEXT NOT NULL,
        object_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        payload TEXT NOT NULL DEFAULT '{}',
        producer TEXT NOT NULL DEFAULT 'hapa-catalog-node',
        actor TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_event_envelopes_lookup ON event_envelopes(event_type, object_type, object_id, occurred_at);
      CREATE TABLE IF NOT EXISTS projection_checkpoints (
        id TEXT PRIMARY KEY,
        consumer TEXT NOT NULL,
        source TEXT NOT NULL,
        checkpoint_key TEXT NOT NULL UNIQUE,
        watermark TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'current',
        row_count INTEGER NOT NULL DEFAULT 0,
        last_event_id TEXT,
        metadata TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_projection_checkpoints_lookup ON projection_checkpoints(consumer, source, status);
      CREATE TABLE IF NOT EXISTS credential_refs (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        label TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        storage TEXT NOT NULL DEFAULT 'reference_only',
        secret_ref TEXT NOT NULL,
        scopes TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_credential_refs_lookup ON credential_refs(provider, status);
      CREATE TABLE IF NOT EXISTS decision_queue_items (
        id TEXT PRIMARY KEY,
        process_key TEXT NOT NULL,
        subject_type TEXT NOT NULL,
        subject_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        owner_identity_id TEXT,
        severity TEXT NOT NULL DEFAULT 'medium',
        sla_due_at TEXT,
        required_review_mode TEXT NOT NULL DEFAULT 'review_required',
        card_context TEXT NOT NULL DEFAULT '{}',
        evidence TEXT NOT NULL DEFAULT '{}',
        audit_event_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_decision_queue_items_lookup ON decision_queue_items(status, process_key, severity);
      CREATE TABLE IF NOT EXISTS trust_attestations (
        id TEXT PRIMARY KEY,
        attestation_type TEXT NOT NULL,
        subject TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'passed',
        checks TEXT NOT NULL DEFAULT '[]',
        evidence TEXT NOT NULL DEFAULT '{}',
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_trust_attestations_lookup ON trust_attestations(attestation_type, status, created_at);
      CREATE TABLE IF NOT EXISTS pilot_runbooks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        schedule TEXT NOT NULL DEFAULT '{}',
        gates TEXT NOT NULL DEFAULT '{}',
        packet TEXT NOT NULL DEFAULT '{}',
        metrics TEXT NOT NULL DEFAULT '{}',
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pilot_runbooks_lookup ON pilot_runbooks(status, created_at);
      CREATE TABLE IF NOT EXISTS release_gate_evaluations (
        id TEXT PRIMARY KEY,
        gate TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        inputs TEXT NOT NULL DEFAULT '{}',
        findings TEXT NOT NULL DEFAULT '[]',
        metrics TEXT NOT NULL DEFAULT '{}',
        decision TEXT NOT NULL DEFAULT '{}',
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_release_gate_evaluations_lookup ON release_gate_evaluations(gate, status, created_at);
      CREATE TABLE IF NOT EXISTS review_decision_records (
        id TEXT PRIMARY KEY,
        record_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        subject TEXT NOT NULL,
        owner TEXT NOT NULL DEFAULT 'local_operator',
        payload TEXT NOT NULL DEFAULT '{}',
        evidence TEXT NOT NULL DEFAULT '{}',
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_review_decision_records_lookup ON review_decision_records(record_type, status, owner);
      CREATE TABLE IF NOT EXISTS pilot_operation_records (
        id TEXT PRIMARY KEY,
        operation_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'planned',
        tenant_id TEXT NOT NULL DEFAULT 'pilot-tenant',
        payload TEXT NOT NULL DEFAULT '{}',
        evidence TEXT NOT NULL DEFAULT '{}',
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pilot_operation_records_lookup ON pilot_operation_records(operation_type, status, tenant_id);
      CREATE TABLE IF NOT EXISTS platform_hardening_records (
        id TEXT PRIMARY KEY,
        check_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'planned',
        target TEXT NOT NULL,
        metrics TEXT NOT NULL DEFAULT '{}',
        evidence TEXT NOT NULL DEFAULT '{}',
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_platform_hardening_records_lookup ON platform_hardening_records(check_type, status, target);
      CREATE TABLE IF NOT EXISTS agent_governance_records (
        id TEXT PRIMARY KEY,
        governance_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'planned',
        process_key TEXT NOT NULL DEFAULT 'catalog.sku.review',
        payload TEXT NOT NULL DEFAULT '{}',
        evidence TEXT NOT NULL DEFAULT '{}',
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_agent_governance_records_lookup ON agent_governance_records(governance_type, status, process_key);
      CREATE TABLE IF NOT EXISTS commercial_readiness_records (
        id TEXT PRIMARY KEY,
        record_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'planned',
        audience TEXT NOT NULL DEFAULT 'design_partner',
        payload TEXT NOT NULL DEFAULT '{}',
        evidence TEXT NOT NULL DEFAULT '{}',
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_commercial_readiness_records_lookup ON commercial_readiness_records(record_type, status, audience);
    `);
  }

  seedGovernance() {
    const count = this.db.prepare('SELECT COUNT(*) AS count FROM roles').get().count;
    if (count === 0) {
      const roles = [
        ['catalog_admin', 'Catalog Admin', 'Schema, identifiers, taxonomies, imports, workflows, publishing contracts.', ['*']],
        ['product_data_steward', 'Product Data Steward', 'Remediates records, duplicates, enrichments, and readiness.', ['catalog:write', 'quality:write']],
        ['supplier_contributor', 'Supplier Contributor', 'Submits supplier-owned draft data only.', ['supplier:draft']],
        ['inventory_planner', 'Inventory Planner', 'Reviews inventory positions and replenishment signals.', ['inventory:read', 'inventory:write']],
        ['demand_planner', 'Demand Planner', 'Runs forecast scenarios and manages overrides.', ['forecast:read', 'forecast:write']],
        ['read_only', 'Read Only Viewer', 'Views dashboards and records without mutations.', ['*:read']]
      ];
      const insertRole = this.db.prepare('INSERT INTO roles (id, name, description, scopes) VALUES (?, ?, ?, ?)');
      const insertPermission = this.db.prepare('INSERT INTO permissions (id, role_id, action, scope, effect, created_at) VALUES (?, ?, ?, ?, ?, ?)');
      for (const [id, name, description, scopes] of roles) {
        insertRole.run(id, name, description, encode(scopes));
        for (const scope of scopes) {
          insertPermission.run(makeId('perm'), id, scope.endsWith(':read') ? 'read' : scope === '*' ? '*' : 'write', scope, 'allow', nowIso());
        }
      }
    }
    this.ensureSeedIdentities();
  }

  ensureSeedIdentities() {
    const insertIdentity = this.db.prepare(`
      INSERT OR IGNORE INTO identities (id, name, kind, role_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const ts = nowIso();
    insertIdentity.run('local_operator', 'Local Operator', 'human', 'catalog_admin', encode({ source: 'seed' }), ts);
    insertIdentity.run('supplier_demo', 'Supplier Demo', 'human', 'supplier_contributor', encode({ source: 'seed', supplier_id: 'supplier-demo' }), ts);
    insertIdentity.run('read_only_viewer', 'Read Only Viewer', 'human', 'read_only', encode({ source: 'seed' }), ts);
  }

  seedHapaCards() {
    const ts = nowIso();
    const insertCard = this.db.prepare(`
      INSERT OR IGNORE INTO hapa_cards (
        id, card_kind, name, owner_identity_id, organization_id, source_node, card_ref,
        skills, context, tags, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const cards = [
      {
        id: 'card-avatar-inventory-governor',
        kind: 'avatar',
        name: 'Inventory Governor Avatar',
        owner: 'local_operator',
        source_node: 'hapa-avatar-node',
        card_ref: 'avatar://inventory-governor',
        skills: ['inventory management', 'in-stock governance', 'replenishment review'],
        tags: ['avatar', 'inventory', 'governor'],
        context: {
          voice: 'Inventory operator focused on in-stock truth, safety stock, reorder risk, and stockout prevention.',
          decision_bias: 'Prefer keeping sellable SKUs in stock while surfacing inventory uncertainty before committing replenishment actions.',
          checks: ['available quantity', 'below reorder point', 'in transit coverage', 'stockout risk']
        }
      },
      {
        id: 'card-avatar-forecast-friend',
        kind: 'avatar',
        name: 'Forecasting Friend Avatar',
        owner: 'local_operator',
        source_node: 'hapa-avatar-node',
        card_ref: 'avatar://forecast-friend',
        skills: ['demand forecasting', 'forecast quality', 'promotion review'],
        tags: ['avatar', 'forecasting', 'advisor'],
        context: {
          voice: 'Friendly demand planner with strong forecasting instincts and a habit of checking assumptions against actuals.',
          decision_bias: 'Prefer explainable forecasts, scenario deltas, and quality-loop evidence before approving demand changes.',
          checks: ['forecast confidence', 'recent actuals', 'promotion uplift', 'lead time risk']
        }
      },
      {
        id: 'card-protocol-source-truth',
        kind: 'protocol',
        name: 'Source Truth Protocol',
        owner: 'local_operator',
        source_node: 'hapa-dev-proto',
        card_ref: 'protocol://source-truth-over-assumption',
        skills: ['provenance review', 'audit discipline', 'source reconciliation'],
        tags: ['protocol', 'governance', 'truth'],
        context: {
          voice: 'Protocol card that insists every execution step names source, actor, confidence, and reversible state.',
          decision_bias: 'Prefer source-backed actions and explicit uncertainty over silent mutation.',
          checks: ['source present', 'actor present', 'audit event planned', 'rollback path known']
        }
      }
    ];
    for (const card of cards) {
      insertCard.run(
        card.id,
        card.kind,
        card.name,
        card.owner,
        'hapa-local',
        card.source_node,
        card.card_ref,
        encode(card.skills),
        encode(card.context),
        encode(card.tags),
        'active',
        ts,
        ts
      );
    }

    const placements = [
      {
        card_id: 'card-avatar-inventory-governor',
        placement_type: 'catalog_domain',
        target_type: 'catalog_domain',
        target_id: 'in-stock',
        role: 'governor',
        decision_mode: 'review_required',
        priority: 10,
        cadence: 'inventory-cycle',
        metadata: { placed_by: 'seed', surface: 'Catalog/SKU governance' }
      },
      {
        card_id: 'card-avatar-inventory-governor',
        placement_type: 'governance_role',
        target_type: 'role',
        target_id: 'inventory_planner',
        role: 'advisor',
        decision_mode: 'context',
        priority: 20,
        cadence: 'inventory-cycle',
        metadata: { placed_by: 'seed', surface: 'Governance roles' }
      },
      {
        card_id: 'card-avatar-forecast-friend',
        placement_type: 'process',
        target_type: 'process',
        target_id: 'forecast.cycle',
        role: 'governor',
        decision_mode: 'review_required',
        priority: 10,
        cadence: 'weekly',
        metadata: { placed_by: 'seed', surface: 'Process cycle' }
      },
      {
        card_id: 'card-avatar-forecast-friend',
        placement_type: 'governance_role',
        target_type: 'role',
        target_id: 'demand_planner',
        role: 'advisor',
        decision_mode: 'context',
        priority: 20,
        cadence: 'weekly',
        metadata: { placed_by: 'seed', surface: 'Governance roles' }
      },
      {
        card_id: 'card-protocol-source-truth',
        placement_type: 'global',
        target_type: 'governance',
        target_id: 'all-decisions',
        role: 'protocol',
        decision_mode: 'context',
        priority: 5,
        cadence: 'always',
        metadata: { placed_by: 'seed', surface: 'Protocol guardrail' }
      }
    ];
    for (const placement of placements) this.upsertHapaCardPlacement(placement);

    const processes = [
      {
        process_key: 'inventory.instock.cycle',
        name: 'In-stock governance cycle',
        cadence: 'daily',
        target_domain: 'in-stock',
        card_policy: { include_roles: ['governor', 'advisor', 'protocol'], require_governor: true },
        metadata: { description: 'Review inventory positions, reorder risk, and stockout prevention with placed Hapa cards.' }
      },
      {
        process_key: 'forecast.cycle',
        name: 'Forecast governance cycle',
        cadence: 'weekly',
        target_domain: 'forecasting',
        card_policy: { include_roles: ['governor', 'advisor', 'protocol'], require_governor: true },
        metadata: { description: 'Review forecast runs, actuals, and scenario assumptions with placed Hapa cards.' }
      },
      {
        process_key: 'catalog.sku.review',
        name: 'Catalog/SKU governance review',
        cadence: 'weekly',
        target_domain: 'catalog',
        card_policy: { include_roles: ['governor', 'advisor', 'protocol'], require_governor: false },
        metadata: { description: 'Review item master changes, identifiers, media, and catalog quality with placed Hapa cards.' }
      }
    ];
    for (const process of processes) this.upsertHapaRepeatingProcess(process);
  }

  audit({ actor = 'system', action, objectType, objectId = null, summary, payload = {} }) {
    const row = {
      id: makeId('audit'),
      actor,
      action,
      object_type: objectType,
      object_id: objectId,
      summary,
      payload: encode(payload),
      created_at: nowIso()
    };
    this.db.prepare(`
      INSERT INTO audit_events (id, actor, action, object_type, object_id, summary, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(row.id, row.actor, row.action, row.object_type, row.object_id, row.summary, row.payload, row.created_at);
    return row;
  }

  upsertSupplier({ id, name, externalKeys = {}, provenance = {} }) {
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO suppliers (id, name, external_keys, provenance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        external_keys = excluded.external_keys,
        provenance = excluded.provenance,
        updated_at = excluded.updated_at
    `).run(id, name, encode(externalKeys), encode(provenance), ts, ts);
  }

  upsertProduct({ id, name, brand, category, lifecycle = 'active', taxonomy = {}, attributes = {}, provenance = {} }) {
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO products (id, name, brand, category, lifecycle, taxonomy, attributes, provenance, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        brand = excluded.brand,
        category = excluded.category,
        lifecycle = excluded.lifecycle,
        taxonomy = excluded.taxonomy,
        attributes = excluded.attributes,
        provenance = excluded.provenance,
        updated_at = excluded.updated_at
    `).run(id, name, brand, category, lifecycle, encode(taxonomy), encode(attributes), encode(provenance), ts, ts);
  }

  upsertSku(row) {
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO skus (id, product_id, sku, name, identifiers, supplier_id, status, attributes, sales_30d, lead_time_days, price, cost, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sku) DO UPDATE SET
        product_id = excluded.product_id,
        name = excluded.name,
        identifiers = excluded.identifiers,
        supplier_id = excluded.supplier_id,
        status = excluded.status,
        attributes = excluded.attributes,
        sales_30d = excluded.sales_30d,
        lead_time_days = excluded.lead_time_days,
        price = excluded.price,
        cost = excluded.cost,
        updated_at = excluded.updated_at
    `).run(
      row.id,
      row.product_id,
      row.sku,
      row.name,
      encode(row.identifiers),
      row.supplier_id,
      row.status || 'active',
      encode(row.attributes),
      Number(row.sales_30d || 0),
      Number(row.lead_time_days || 0),
      Number(row.price || 0),
      Number(row.cost || 0),
      ts,
      ts
    );
    this.upsertIdentifiersFromMap(row.id, row.identifiers || {}, row.identifierSource || 'catalog');
  }

  upsertIdentifiersFromMap(skuId, identifiers = {}, source = 'catalog') {
    for (const [scheme, rawValue] of Object.entries(identifiers || {})) {
      if (rawValue == null || rawValue === '') continue;
      const values = Array.isArray(rawValue) ? rawValue : [rawValue];
      for (const value of values) {
        if (typeof value === 'object') continue;
        this.upsertItemIdentifier({
          sku_id: skuId,
          scheme,
          value: String(value),
          source,
          confidence: source === 'catalog' ? 0.8 : 0.95
        });
      }
    }
  }

  upsertItemIdentifier({ sku_id, scheme, value, source = 'catalog', confidence = 1, metadata = {} }) {
    const cleanScheme = String(scheme || '').trim().toLowerCase();
    const cleanValue = normalizeIdentifierValue(cleanScheme, value);
    if (!cleanScheme || !cleanValue) return null;
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO item_identifiers (id, sku_id, scheme, value, source, confidence, metadata, first_seen_at, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(scheme, value, source) DO UPDATE SET
        sku_id = excluded.sku_id,
        confidence = excluded.confidence,
        metadata = excluded.metadata,
        last_seen_at = excluded.last_seen_at
    `).run(makeId('ident'), sku_id, cleanScheme, cleanValue, source, Number(confidence || 1), encode(metadata), ts, ts);
    return this.db.prepare('SELECT * FROM item_identifiers WHERE scheme = ? AND value = ? AND source = ?').get(cleanScheme, cleanValue, source);
  }

  upsertPackaging({ id, sku_id, level, units_per_pack = 1, gtin = null, dimensions = {}, weight = null }) {
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO packaging (id, sku_id, level, units_per_pack, gtin, dimensions, weight, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sku_id, level) DO UPDATE SET
        units_per_pack = excluded.units_per_pack,
        gtin = excluded.gtin,
        dimensions = excluded.dimensions,
        weight = excluded.weight,
        updated_at = excluded.updated_at
    `).run(id, sku_id, level, Number(units_per_pack || 1), gtin, encode(dimensions), weight == null ? null : Number(weight), ts, ts);
  }

  upsertInventoryPosition(row) {
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO inventory_positions (id, sku_id, facility, location, on_hand, reserved, in_transit, safety_stock, reorder_point, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sku_id, facility, location) DO UPDATE SET
        on_hand = excluded.on_hand,
        reserved = excluded.reserved,
        in_transit = excluded.in_transit,
        safety_stock = excluded.safety_stock,
        reorder_point = excluded.reorder_point,
        updated_at = excluded.updated_at
    `).run(
      row.id,
      row.sku_id,
      row.facility,
      row.location,
      Number(row.on_hand || 0),
      Number(row.reserved || 0),
      Number(row.in_transit || 0),
      Number(row.safety_stock || 0),
      Number(row.reorder_point || 0),
      ts
    );
    this.db.prepare(`
      INSERT INTO inventory_events (id, sku_id, facility, location, event_type, quantity, ref, occurred_at, provenance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(makeId('invevt'), row.sku_id, row.facility, row.location, 'snapshot', Number(row.on_hand || 0), row.ref || null, ts, encode(row.provenance || {}));
  }

  createImportBatch({ source, status, stage, totals, errors = [] }) {
    const id = makeId('import');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO import_batches (id, source, status, stage, totals, errors, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, source, status, stage, encode(totals), encode(errors), ts, ts);
    return this.getImportBatch(id);
  }

  listImportBatches() {
    return this.db.prepare('SELECT * FROM import_batches ORDER BY created_at DESC').all().map(row => ({
      ...row,
      totals: decode(row.totals, {}),
      errors: decode(row.errors, [])
    }));
  }

  getImportBatch(id) {
    const row = this.db.prepare('SELECT * FROM import_batches WHERE id = ?').get(id);
    return row ? { ...row, totals: decode(row.totals, {}), errors: decode(row.errors, []) } : null;
  }

  listItems({ q = '', limit = 100 } = {}) {
    const like = `%${q}%`;
    const rows = this.db.prepare(`
      SELECT s.id AS sku_id, s.sku, s.name AS sku_name, s.status, s.identifiers, s.attributes AS sku_attributes,
             s.sales_30d, s.lead_time_days, s.price, s.cost,
             p.id AS product_id, p.name AS product_name, p.brand, p.category, p.lifecycle,
             sup.id AS supplier_id, sup.name AS supplier_name
      FROM skus s
      JOIN products p ON p.id = s.product_id
      LEFT JOIN suppliers sup ON sup.id = s.supplier_id
      WHERE (? = '' OR s.sku LIKE ? OR s.name LIKE ? OR p.name LIKE ? OR p.brand LIKE ? OR p.category LIKE ?)
         OR EXISTS (
           SELECT 1 FROM item_identifiers ii
           WHERE ii.sku_id = s.id AND (? != '' AND ii.value LIKE ?)
         )
      ORDER BY p.name, s.sku
      LIMIT ?
    `).all(q, like, like, like, like, like, q, like, limit);
    return rows.map(row => ({
      ...row,
      identifiers: decode(row.identifiers, {}),
      sku_attributes: decode(row.sku_attributes, {})
    }));
  }

  getItem(idOrSku) {
    const row = this.db.prepare(`
      SELECT s.id AS sku_id, s.sku, s.name AS sku_name, s.status, s.identifiers, s.attributes AS sku_attributes,
             s.sales_30d, s.lead_time_days, s.price, s.cost,
             p.id AS product_id, p.name AS product_name, p.brand, p.category, p.lifecycle,
             p.taxonomy, p.attributes AS product_attributes, p.provenance,
             sup.id AS supplier_id, sup.name AS supplier_name
      FROM skus s
      JOIN products p ON p.id = s.product_id
      LEFT JOIN suppliers sup ON sup.id = s.supplier_id
      WHERE s.id = ? OR s.sku = ?
    `).get(idOrSku, idOrSku);
    if (!row) return null;
    const packaging = this.db.prepare('SELECT * FROM packaging WHERE sku_id = ? ORDER BY level').all(row.sku_id).map(pack => ({
      ...pack,
      dimensions: decode(pack.dimensions, {})
    }));
    const inventory = this.listInventory({ sku: row.sku });
    const relationships = this.db.prepare('SELECT * FROM relationships WHERE source_id = ? OR target_id = ? ORDER BY created_at DESC').all(row.sku_id, row.sku_id).map(rel => ({
      ...rel,
      metadata: decode(rel.metadata, {})
    }));
    const normalizedIdentifiers = this.listItemIdentifiers(row.sku_id);
    const market = this.marketPriceSummary({ skuId: row.sku_id });
    const marketListing = {
      snapshots: this.listMarketListingSnapshots({ sku: row.sku, limit: 5 }),
      media: this.listMediaAssets({ sku: row.sku, limit: 40 })
    };
    const digitalProduct = this.getDigitalProductBySkuId(row.sku_id);
    const forecastQuality = this.listForecastQualityEvents({ sku: row.sku, limit: 5 });
    return {
      ...row,
      identifiers: decode(row.identifiers, {}),
      sku_attributes: decode(row.sku_attributes, {}),
      taxonomy: decode(row.taxonomy, {}),
      product_attributes: decode(row.product_attributes, {}),
      provenance: decode(row.provenance, {}),
      packaging,
      inventory,
      relationships,
      normalized_identifiers: normalizedIdentifiers,
      market,
      market_listing: marketListing,
      digital_product: digitalProduct,
      forecast_quality: forecastQuality
    };
  }

  listItemIdentifiers(skuId) {
    return this.db.prepare('SELECT * FROM item_identifiers WHERE sku_id = ? ORDER BY scheme, source, value').all(skuId).map(row => ({
      ...row,
      metadata: decode(row.metadata, {})
    }));
  }

  findSkuByIdentifier(scheme, value) {
    const cleanScheme = String(scheme || '').trim().toLowerCase();
    const cleanValue = normalizeIdentifierValue(cleanScheme, value);
    if (!cleanScheme || !cleanValue) return null;
    return this.db.prepare(`
      SELECT s.*, ii.scheme, ii.value, ii.source AS identifier_source
      FROM item_identifiers ii
      JOIN skus s ON s.id = ii.sku_id
      WHERE ii.scheme = ? AND ii.value = ?
      ORDER BY ii.confidence DESC, ii.last_seen_at DESC
      LIMIT 1
    `).get(cleanScheme, cleanValue);
  }

  listInventory({ sku = '', limit = 100 } = {}) {
    const rows = this.db.prepare(`
      SELECT ip.*, s.sku, s.name AS sku_name,
             (ip.on_hand - ip.reserved) AS available,
             CASE WHEN (ip.on_hand - ip.reserved + ip.in_transit) < ip.reorder_point THEN 1 ELSE 0 END AS below_reorder
      FROM inventory_positions ip
      JOIN skus s ON s.id = ip.sku_id
      WHERE (? = '' OR s.sku = ? OR s.id = ?)
      ORDER BY below_reorder DESC, s.sku, ip.facility, ip.location
      LIMIT ?
    `).all(sku, sku, sku, limit);
    return rows;
  }

  getSkuBySku(sku) {
    return this.db.prepare('SELECT * FROM skus WHERE sku = ? OR id = ?').get(sku, sku);
  }

  createForecastRun({ sku_id, location, channel, horizon_days, status, assumptions, explanation, series }) {
    const id = makeId('forecast');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO forecast_runs (id, sku_id, location, channel, horizon_days, status, assumptions, explanation, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, sku_id, location, channel, horizon_days, status, encode(assumptions), encode(explanation), ts);
    const insertSeries = this.db.prepare(`
      INSERT INTO forecast_series (id, run_id, bucket_start, bucket_end, baseline, adjusted, confidence_low, confidence_high, drivers)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const bucket of series) {
      insertSeries.run(makeId('series'), id, bucket.bucket_start, bucket.bucket_end, bucket.baseline, bucket.adjusted, bucket.confidence_low, bucket.confidence_high, encode(bucket.drivers));
    }
    return this.getForecastRun(id);
  }

  listForecastRuns() {
    return this.db.prepare(`
      SELECT fr.*, s.sku, s.name AS sku_name
      FROM forecast_runs fr
      JOIN skus s ON s.id = fr.sku_id
      ORDER BY fr.created_at DESC
    `).all().map(row => ({
      ...row,
      assumptions: decode(row.assumptions, {}),
      explanation: decode(row.explanation, {})
    }));
  }

  getForecastRun(id) {
    const row = this.db.prepare(`
      SELECT fr.*, s.sku, s.name AS sku_name
      FROM forecast_runs fr
      JOIN skus s ON s.id = fr.sku_id
      WHERE fr.id = ?
    `).get(id);
    if (!row) return null;
    const series = this.db.prepare('SELECT * FROM forecast_series WHERE run_id = ? ORDER BY bucket_start').all(id).map(bucket => ({
      ...bucket,
      drivers: decode(bucket.drivers, [])
    }));
    return {
      ...row,
      assumptions: decode(row.assumptions, {}),
      explanation: decode(row.explanation, {}),
      series
    };
  }

  createMarketPriceSnapshot({ sku_id, source, source_url = null, asin = null, status = 'retrieved', identifiers = {}, price_summary = {}, warnings = [], error = null, points = [] }) {
    const id = makeId('market');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO market_price_snapshots (id, sku_id, source, source_url, asin, status, identifiers, price_summary, warnings, error, retrieved_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, sku_id, source, source_url, asin, status, encode(identifiers), encode(price_summary), encode(warnings), error, ts, ts);
    for (const point of points) {
      this.insertMarketPricePoint({ ...point, sku_id, snapshot_id: id, source, asin });
    }
    return this.getMarketPriceSnapshot(id);
  }

  insertMarketPricePoint({ sku_id, snapshot_id = null, source, asin = null, price_type, observed_at, price, currency = 'USD', availability = null, condition = null, seller_type = null, metadata = {} }) {
    const ts = nowIso();
    this.db.prepare(`
      INSERT OR IGNORE INTO market_price_points (id, sku_id, snapshot_id, source, asin, price_type, observed_at, price, currency, availability, condition, seller_type, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(makeId('price'), sku_id, snapshot_id, source, asin, price_type, observed_at, Number(price), currency || 'USD', availability, condition, seller_type, encode(metadata), ts);
  }

  getMarketPriceSnapshot(id) {
    const row = this.db.prepare(`
      SELECT mps.*, s.sku, s.name AS sku_name
      FROM market_price_snapshots mps
      JOIN skus s ON s.id = mps.sku_id
      WHERE mps.id = ?
    `).get(id);
    return row ? decodeMarketSnapshot(row) : null;
  }

  listMarketPriceSnapshots({ sku = '', asin = '', limit = 50 } = {}) {
    return this.db.prepare(`
      SELECT mps.*, s.sku, s.name AS sku_name
      FROM market_price_snapshots mps
      JOIN skus s ON s.id = mps.sku_id
      WHERE (? = '' OR s.sku = ? OR s.id = ?)
        AND (? = '' OR mps.asin = ?)
      ORDER BY mps.created_at DESC
      LIMIT ?
    `).all(sku, sku, sku, asin, asin, limit).map(decodeMarketSnapshot);
  }

  listMarketPricePoints({ sku = '', asin = '', priceType = '', limit = 500 } = {}) {
    return this.db.prepare(`
      SELECT mpp.*, s.sku, s.name AS sku_name
      FROM market_price_points mpp
      JOIN skus s ON s.id = mpp.sku_id
      WHERE (? = '' OR s.sku = ? OR s.id = ?)
        AND (? = '' OR mpp.asin = ?)
        AND (? = '' OR mpp.price_type = ?)
      ORDER BY mpp.observed_at DESC
      LIMIT ?
    `).all(sku, sku, sku, asin, asin, priceType, priceType, limit).map(row => ({
      ...row,
      metadata: decode(row.metadata, {})
    }));
  }

  marketPriceSummary({ skuId = '', sku = '', asin = '' } = {}) {
    const rows = this.db.prepare(`
      SELECT mpp.price_type,
             COUNT(*) AS points,
             MIN(mpp.price) AS lowest,
             MAX(mpp.price) AS highest,
             AVG(mpp.price) AS average,
             MAX(mpp.observed_at) AS last_observed_at
      FROM market_price_points mpp
      JOIN skus s ON s.id = mpp.sku_id
      WHERE (? = '' OR mpp.sku_id = ?)
        AND (? = '' OR s.sku = ? OR s.id = ?)
        AND (? = '' OR mpp.asin = ?)
      GROUP BY mpp.price_type
      ORDER BY mpp.price_type
    `).all(skuId, skuId, sku, sku, sku, asin, asin);
    return rows.map(row => ({
      ...row,
      lowest: Number(row.lowest || 0),
      highest: Number(row.highest || 0),
      average: Number(row.average || 0)
    }));
  }

  createMarketListingSnapshot({
    sku_id,
    source,
    source_url = null,
    asin = null,
    status = 'retrieved',
    title = '',
    brand = '',
    price = null,
    list_price = null,
    currency = 'USD',
    rating = null,
    review_count = null,
    bought_in_last_month = '',
    availability = '',
    feature_bullets = [],
    description = '',
    details = {},
    documents = [],
    warnings = [],
    media = []
  }) {
    const id = makeId('listing');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO market_listing_snapshots (
        id, sku_id, source, source_url, asin, status, title, brand, price, list_price,
        currency, rating, review_count, bought_in_last_month, availability, feature_bullets,
        description, details, documents, warnings, retrieved_at, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      sku_id,
      source,
      source_url,
      asin,
      status,
      title,
      brand,
      price == null ? null : Number(price),
      list_price == null ? null : Number(list_price),
      currency || 'USD',
      rating == null ? null : Number(rating),
      review_count == null ? null : Number(review_count),
      bought_in_last_month,
      availability,
      encode(feature_bullets),
      description,
      encode(details),
      encode(documents),
      encode(warnings),
      ts,
      ts
    );
    for (const asset of media) {
      this.upsertMediaAsset({
        ...asset,
        sku_id,
        listing_snapshot_id: id,
        source,
        source_url: asset.source_url || source_url
      });
    }
    return this.getMarketListingSnapshot(id);
  }

  upsertMediaAsset({
    sku_id,
    listing_snapshot_id = null,
    source,
    source_url = null,
    media_type = 'image',
    variant = '',
    url,
    alt = '',
    width = null,
    height = null,
    metadata = {}
  }) {
    if (!sku_id || !source || !url) return null;
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO media_assets (id, sku_id, listing_snapshot_id, source, source_url, media_type, variant, url, alt, width, height, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sku_id, source, url) DO UPDATE SET
        listing_snapshot_id = excluded.listing_snapshot_id,
        source_url = excluded.source_url,
        media_type = excluded.media_type,
        variant = excluded.variant,
        alt = excluded.alt,
        width = excluded.width,
        height = excluded.height,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `).run(
      makeId('media'),
      sku_id,
      listing_snapshot_id,
      source,
      source_url,
      media_type,
      variant,
      url,
      alt,
      width == null ? null : Number(width),
      height == null ? null : Number(height),
      encode(metadata),
      ts,
      ts
    );
    return this.db.prepare('SELECT * FROM media_assets WHERE sku_id = ? AND source = ? AND url = ?').get(sku_id, source, url);
  }

  getMarketListingSnapshot(id) {
    const row = this.db.prepare(`
      SELECT mls.*, s.sku, s.name AS sku_name
      FROM market_listing_snapshots mls
      JOIN skus s ON s.id = mls.sku_id
      WHERE mls.id = ?
    `).get(id);
    return row ? decodeListingSnapshot(row) : null;
  }

  listMarketListingSnapshots({ sku = '', asin = '', limit = 50 } = {}) {
    return this.db.prepare(`
      SELECT mls.*, s.sku, s.name AS sku_name
      FROM market_listing_snapshots mls
      JOIN skus s ON s.id = mls.sku_id
      WHERE (? = '' OR s.sku = ? OR s.id = ?)
        AND (? = '' OR mls.asin = ?)
      ORDER BY mls.created_at DESC
      LIMIT ?
    `).all(sku, sku, sku, asin, asin, limit).map(decodeListingSnapshot);
  }

  listMediaAssets({ sku = '', source = '', mediaType = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT ma.*, s.sku, s.name AS sku_name
      FROM media_assets ma
      JOIN skus s ON s.id = ma.sku_id
      WHERE (? = '' OR s.sku = ? OR s.id = ?)
        AND (? = '' OR ma.source = ?)
        AND (? = '' OR ma.media_type = ?)
      ORDER BY
        CASE ma.variant
          WHEN 'hiRes' THEN 0
          WHEN 'landing' THEN 1
          WHEN 'large' THEN 2
          WHEN 'main' THEN 3
          WHEN 'aplus' THEN 4
          WHEN 'document' THEN 8
          ELSE 6
        END,
        ma.created_at DESC
      LIMIT ?
    `).all(sku, sku, sku, source, source, mediaType, mediaType, limit).map(decodeMediaAsset);
  }

  upsertImportMapping({ id = null, name, version = 'mapping-v1', source_type = 'generic', field_map = {}, defaults = {}, conversions = {} }) {
    const mappingId = id || `mapping-${normalizeKey(name || 'default')}`;
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO import_mappings (id, name, version, source_type, field_map, defaults, conversions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        version = excluded.version,
        source_type = excluded.source_type,
        field_map = excluded.field_map,
        defaults = excluded.defaults,
        conversions = excluded.conversions,
        updated_at = excluded.updated_at
    `).run(mappingId, name, version, source_type, encode(field_map), encode(defaults), encode(conversions), ts, ts);
    return this.getImportMapping(mappingId);
  }

  listImportMappings() {
    return this.db.prepare('SELECT * FROM import_mappings ORDER BY updated_at DESC').all().map(decodeImportMapping);
  }

  getImportMapping(id) {
    const row = this.db.prepare('SELECT * FROM import_mappings WHERE id = ?').get(id);
    return row ? decodeImportMapping(row) : null;
  }

  upsertDigitalProduct({ sku_id, version = '', file_ref = '', download_url = '', license = '', entitlement = '', subscription_term = '', rights = {}, release_lifecycle = 'active', attributes = {} }) {
    const id = `digital-${sku_id}`;
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO digital_products (id, sku_id, version, file_ref, download_url, license, entitlement, subscription_term, rights, release_lifecycle, attributes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sku_id) DO UPDATE SET
        version = excluded.version,
        file_ref = excluded.file_ref,
        download_url = excluded.download_url,
        license = excluded.license,
        entitlement = excluded.entitlement,
        subscription_term = excluded.subscription_term,
        rights = excluded.rights,
        release_lifecycle = excluded.release_lifecycle,
        attributes = excluded.attributes,
        updated_at = excluded.updated_at
    `).run(id, sku_id, version, file_ref, download_url, license, entitlement, subscription_term, encode(rights), release_lifecycle, encode(attributes), ts, ts);
    return this.getDigitalProductBySkuId(sku_id);
  }

  getDigitalProductBySkuId(skuId) {
    const row = this.db.prepare('SELECT * FROM digital_products WHERE sku_id = ?').get(skuId);
    return row ? decodeDigitalProduct(row) : null;
  }

  listDigitalProducts({ sku = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT dp.*, s.sku, s.name AS sku_name
      FROM digital_products dp
      JOIN skus s ON s.id = dp.sku_id
      WHERE (? = '' OR s.sku = ? OR s.id = ?)
      ORDER BY dp.updated_at DESC
      LIMIT ?
    `).all(sku, sku, sku, limit).map(decodeDigitalProduct);
  }

  upsertDuplicateCandidate({ sku_id, duplicate_sku_id, confidence, reasons = [], status = 'open' }) {
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO duplicate_candidates (id, sku_id, duplicate_sku_id, confidence, status, reasons, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sku_id, duplicate_sku_id) DO UPDATE SET
        confidence = excluded.confidence,
        status = excluded.status,
        reasons = excluded.reasons,
        updated_at = excluded.updated_at
    `).run(makeId('dup'), sku_id, duplicate_sku_id, Number(confidence), status, encode(reasons), ts, ts);
    return this.db.prepare('SELECT * FROM duplicate_candidates WHERE sku_id = ? AND duplicate_sku_id = ?').get(sku_id, duplicate_sku_id);
  }

  listDuplicateCandidates({ status = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT dc.*, s.sku, s.name AS sku_name, d.sku AS duplicate_sku, d.name AS duplicate_sku_name
      FROM duplicate_candidates dc
      JOIN skus s ON s.id = dc.sku_id
      JOIN skus d ON d.id = dc.duplicate_sku_id
      WHERE (? = '' OR dc.status = ?)
      ORDER BY dc.confidence DESC, dc.updated_at DESC
      LIMIT ?
    `).all(status, status, limit).map(decodeDuplicateCandidate);
  }

  createMergeEvent({ winner_sku_id, merged_sku_id, actor = 'system', status = 'applied', survivorship = {}, metadata = {} }) {
    const id = makeId('merge');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO merge_events (id, winner_sku_id, merged_sku_id, actor, status, survivorship, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, winner_sku_id, merged_sku_id, actor, status, encode(survivorship), encode(metadata), ts);
    this.db.prepare('UPDATE skus SET status = ?, updated_at = ? WHERE id = ?').run('merged', ts, merged_sku_id);
    this.db.prepare('UPDATE duplicate_candidates SET status = ?, updated_at = ? WHERE (sku_id = ? AND duplicate_sku_id = ?) OR (sku_id = ? AND duplicate_sku_id = ?)').run(
      'merged',
      ts,
      winner_sku_id,
      merged_sku_id,
      merged_sku_id,
      winner_sku_id
    );
    return this.getMergeEvent(id);
  }

  getMergeEvent(id) {
    const row = this.db.prepare('SELECT * FROM merge_events WHERE id = ?').get(id);
    return row ? decodeMergeEvent(row) : null;
  }

  listMergeEvents({ limit = 100 } = {}) {
    return this.db.prepare('SELECT * FROM merge_events ORDER BY created_at DESC LIMIT ?').all(limit).map(decodeMergeEvent);
  }

  createForecastActual({ sku_id, location, channel, bucket_start, bucket_end, actual, stockout_days = 0, miss_reason = '' }) {
    const id = makeId('actual');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO forecast_actuals (id, sku_id, location, channel, bucket_start, bucket_end, actual, stockout_days, miss_reason, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, sku_id, location, channel, bucket_start, bucket_end, Number(actual), Number(stockout_days || 0), miss_reason, ts);
    return this.getForecastActual(id);
  }

  getForecastActual(id) {
    const row = this.db.prepare(`
      SELECT fa.*, s.sku, s.name AS sku_name
      FROM forecast_actuals fa
      JOIN skus s ON s.id = fa.sku_id
      WHERE fa.id = ?
    `).get(id);
    return row ? decodeForecastActual(row) : null;
  }

  listForecastActuals({ sku = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT fa.*, s.sku, s.name AS sku_name
      FROM forecast_actuals fa
      JOIN skus s ON s.id = fa.sku_id
      WHERE (? = '' OR s.sku = ? OR s.id = ?)
      ORDER BY fa.created_at DESC
      LIMIT ?
    `).all(sku, sku, sku, limit).map(decodeForecastActual);
  }

  createForecastQualityEvent({ run_id = null, sku_id, actual_id = null, error, absolute_error, bias, percent_error, stockout_impact = 0, miss_reason = '', remediation }) {
    const id = makeId('fq');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO forecast_quality_events (id, run_id, sku_id, actual_id, error, absolute_error, bias, percent_error, stockout_impact, miss_reason, remediation, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, run_id, sku_id, actual_id, Number(error), Number(absolute_error), Number(bias), Number(percent_error), Number(stockout_impact || 0), miss_reason, remediation, ts);
    return this.getForecastQualityEvent(id);
  }

  getForecastQualityEvent(id) {
    const row = this.db.prepare(`
      SELECT fqe.*, s.sku, s.name AS sku_name
      FROM forecast_quality_events fqe
      JOIN skus s ON s.id = fqe.sku_id
      WHERE fqe.id = ?
    `).get(id);
    return row ? decodeForecastQualityEvent(row) : null;
  }

  listForecastQualityEvents({ sku = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT fqe.*, s.sku, s.name AS sku_name
      FROM forecast_quality_events fqe
      JOIN skus s ON s.id = fqe.sku_id
      WHERE (? = '' OR s.sku = ? OR s.id = ?)
      ORDER BY fqe.created_at DESC
      LIMIT ?
    `).all(sku, sku, sku, limit).map(decodeForecastQualityEvent);
  }

  upsertConnectorContract({ id, name, domain, direction, endpoint, schema = {}, fixture_path = '', status = 'contract-ready' }) {
    const contractId = id || `connector-${normalizeKey(domain)}-${normalizeKey(name)}`;
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO connector_contracts (id, name, domain, direction, endpoint, schema, fixture_path, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        domain = excluded.domain,
        direction = excluded.direction,
        endpoint = excluded.endpoint,
        schema = excluded.schema,
        fixture_path = excluded.fixture_path,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(contractId, name, domain, direction, endpoint, encode(schema), fixture_path, status, ts, ts);
    const row = this.db.prepare('SELECT * FROM connector_contracts WHERE id = ?').get(contractId);
    return row ? decodeConnectorContract(row) : null;
  }

  listConnectorContracts() {
    return this.db.prepare('SELECT * FROM connector_contracts ORDER BY domain, name').all().map(decodeConnectorContract);
  }

  createPerformanceReport({ sku_target, inventory_event_target, measured_skus, measured_inventory_events, duration_ms, search_ms, import_preview_ms, result, notes = [] }) {
    const id = makeId('perf');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO performance_reports (id, sku_target, inventory_event_target, measured_skus, measured_inventory_events, duration_ms, search_ms, import_preview_ms, result, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, Number(sku_target), Number(inventory_event_target), Number(measured_skus), Number(measured_inventory_events), Number(duration_ms), Number(search_ms), Number(import_preview_ms), result, encode(notes), ts);
    return this.getPerformanceReport(id);
  }

  getPerformanceReport(id) {
    const row = this.db.prepare('SELECT * FROM performance_reports WHERE id = ?').get(id);
    return row ? decodePerformanceReport(row) : null;
  }

  listPerformanceReports({ limit = 20 } = {}) {
    return this.db.prepare('SELECT * FROM performance_reports ORDER BY created_at DESC LIMIT ?').all(limit).map(decodePerformanceReport);
  }

  upsertHapaCard(input = {}) {
    const cardKind = String(input.card_kind || input.cardKind || input.kind || 'avatar').trim() || 'avatar';
    const name = String(input.name || input.title || `${cardKind} card`).trim();
    const id = String(input.id || `card-${normalizeKey(cardKind)}-${normalizeKey(name)}`).trim();
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO hapa_cards (
        id, card_kind, name, owner_identity_id, organization_id, source_node, card_ref,
        skills, context, tags, status, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        card_kind = excluded.card_kind,
        name = excluded.name,
        owner_identity_id = excluded.owner_identity_id,
        organization_id = excluded.organization_id,
        source_node = excluded.source_node,
        card_ref = excluded.card_ref,
        skills = excluded.skills,
        context = excluded.context,
        tags = excluded.tags,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(
      id,
      cardKind,
      name,
      input.owner_identity_id || input.ownerIdentityId || input.owner || null,
      input.organization_id || input.organizationId || 'hapa-local',
      input.source_node || input.sourceNode || null,
      input.card_ref || input.cardRef || null,
      encode(coerceArray(input.skills)),
      encode(coerceObject(input.context)),
      encode(coerceArray(input.tags)),
      input.status || 'active',
      ts,
      ts
    );
    return this.getHapaCard(id);
  }

  getHapaCard(id) {
    const row = this.db.prepare('SELECT * FROM hapa_cards WHERE id = ?').get(id);
    return row ? decodeHapaCard(row) : null;
  }

  listHapaCards({ kind = '', status = '', q = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT *
      FROM hapa_cards
      WHERE (? = '' OR card_kind = ?)
        AND (? = '' OR status = ?)
        AND (? = '' OR lower(id || ' ' || name || ' ' || card_kind || ' ' || source_node || ' ' || card_ref || ' ' || tags) LIKE '%' || lower(?) || '%')
      ORDER BY updated_at DESC, name
      LIMIT ?
    `).all(kind, kind, status, status, q, q, limit).map(decodeHapaCard);
  }

  upsertHapaCardPlacement(input = {}) {
    const cardId = String(input.card_id || input.cardId || '').trim();
    const placementType = String(input.placement_type || input.placementType || 'catalog_domain').trim();
    const targetType = String(input.target_type || input.targetType || placementType).trim();
    const targetId = String(input.target_id || input.targetId || '').trim();
    const role = String(input.role || 'advisor').trim();
    const id = String(input.id || `placement-${normalizeKey(cardId)}-${normalizeKey(placementType)}-${normalizeKey(targetType)}-${normalizeKey(targetId)}-${normalizeKey(role)}`).trim();
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO hapa_card_placements (
        id, card_id, placement_type, target_type, target_id, role, decision_mode,
        priority, cadence, active, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(card_id, placement_type, target_type, target_id, role) DO UPDATE SET
        decision_mode = excluded.decision_mode,
        priority = excluded.priority,
        cadence = excluded.cadence,
        active = excluded.active,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `).run(
      id,
      cardId,
      placementType,
      targetType,
      targetId,
      role,
      input.decision_mode || input.decisionMode || 'context',
      Number(input.priority ?? 50),
      input.cadence || null,
      input.active === false || input.active === 0 ? 0 : 1,
      encode(coerceObject(input.metadata)),
      ts,
      ts
    );
    const existing = this.getHapaCardPlacement(id);
    if (existing) return existing;
    const row = this.db.prepare(`
      SELECT p.*, c.id AS linked_card_id, c.card_kind AS linked_card_kind, c.name AS linked_card_name,
             c.owner_identity_id AS linked_owner_identity_id, c.organization_id AS linked_organization_id,
             c.source_node AS linked_source_node, c.card_ref AS linked_card_ref, c.skills AS linked_skills,
             c.context AS linked_context, c.tags AS linked_tags, c.status AS linked_status,
             c.created_at AS linked_created_at, c.updated_at AS linked_updated_at
      FROM hapa_card_placements p
      JOIN hapa_cards c ON c.id = p.card_id
      WHERE p.card_id = ? AND p.placement_type = ? AND p.target_type = ? AND p.target_id = ? AND p.role = ?
      LIMIT 1
    `).get(cardId, placementType, targetType, targetId, role);
    return row ? decodeHapaCardPlacement(row) : null;
  }

  getHapaCardPlacement(id) {
    const row = this.db.prepare(`
      SELECT p.*, c.id AS linked_card_id, c.card_kind AS linked_card_kind, c.name AS linked_card_name,
             c.owner_identity_id AS linked_owner_identity_id, c.organization_id AS linked_organization_id,
             c.source_node AS linked_source_node, c.card_ref AS linked_card_ref, c.skills AS linked_skills,
             c.context AS linked_context, c.tags AS linked_tags, c.status AS linked_status,
             c.created_at AS linked_created_at, c.updated_at AS linked_updated_at
      FROM hapa_card_placements p
      JOIN hapa_cards c ON c.id = p.card_id
      WHERE p.id = ?
    `).get(id);
    return row ? decodeHapaCardPlacement(row) : null;
  }

  listHapaCardPlacements({ card_id = '', cardId = '', target_type = '', targetType = '', target_id = '', targetId = '', placement_type = '', placementType = '', active = null, limit = 200 } = {}) {
    const cardFilter = card_id || cardId || '';
    const targetTypeFilter = target_type || targetType || '';
    const targetIdFilter = target_id || targetId || '';
    const placementTypeFilter = placement_type || placementType || '';
    const activeFilter = active === null || active === undefined || active === '' ? null : active === true || active === 1 || active === '1' || active === 'true' ? 1 : 0;
    return this.db.prepare(`
      SELECT p.*, c.id AS linked_card_id, c.card_kind AS linked_card_kind, c.name AS linked_card_name,
             c.owner_identity_id AS linked_owner_identity_id, c.organization_id AS linked_organization_id,
             c.source_node AS linked_source_node, c.card_ref AS linked_card_ref, c.skills AS linked_skills,
             c.context AS linked_context, c.tags AS linked_tags, c.status AS linked_status,
             c.created_at AS linked_created_at, c.updated_at AS linked_updated_at
      FROM hapa_card_placements p
      JOIN hapa_cards c ON c.id = p.card_id
      WHERE (? = '' OR p.card_id = ?)
        AND (? = '' OR p.target_type = ?)
        AND (? = '' OR p.target_id = ?)
        AND (? = '' OR p.placement_type = ?)
        AND (? IS NULL OR p.active = ?)
      ORDER BY p.active DESC, p.priority ASC, p.updated_at DESC
      LIMIT ?
    `).all(
      cardFilter,
      cardFilter,
      targetTypeFilter,
      targetTypeFilter,
      targetIdFilter,
      targetIdFilter,
      placementTypeFilter,
      placementTypeFilter,
      activeFilter,
      activeFilter,
      Number(limit)
    ).map(decodeHapaCardPlacement);
  }

  upsertHapaRepeatingProcess(input = {}) {
    const processKey = String(input.process_key || input.processKey || '').trim();
    const id = String(input.id || `process-${normalizeKey(processKey)}`).trim();
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO hapa_repeating_processes (
        id, process_key, name, cadence, target_domain, enabled, card_policy,
        last_run_at, next_run_at, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(process_key) DO UPDATE SET
        name = excluded.name,
        cadence = excluded.cadence,
        target_domain = excluded.target_domain,
        enabled = excluded.enabled,
        card_policy = excluded.card_policy,
        next_run_at = excluded.next_run_at,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `).run(
      id,
      processKey,
      input.name || processKey,
      input.cadence || 'manual',
      input.target_domain || input.targetDomain || 'catalog',
      input.enabled === false || input.enabled === 0 ? 0 : 1,
      encode(coerceObject(input.card_policy || input.cardPolicy)),
      input.last_run_at || input.lastRunAt || null,
      input.next_run_at || input.nextRunAt || null,
      encode(coerceObject(input.metadata)),
      ts,
      ts
    );
    return this.getHapaRepeatingProcess(processKey);
  }

  getHapaRepeatingProcess(processKeyOrId) {
    const row = this.db.prepare(`
      SELECT *
      FROM hapa_repeating_processes
      WHERE process_key = ? OR id = ?
      LIMIT 1
    `).get(processKeyOrId, processKeyOrId);
    return row ? decodeHapaRepeatingProcess(row) : null;
  }

  listHapaRepeatingProcesses({ enabled = null, limit = 100 } = {}) {
    const enabledFilter = enabled === null || enabled === undefined || enabled === '' ? null : enabled === true || enabled === 1 || enabled === '1' || enabled === 'true' ? 1 : 0;
    return this.db.prepare(`
      SELECT *
      FROM hapa_repeating_processes
      WHERE (? IS NULL OR enabled = ?)
      ORDER BY enabled DESC, cadence, process_key
      LIMIT ?
    `).all(enabledFilter, enabledFilter, Number(limit)).map(decodeHapaRepeatingProcess);
  }

  markHapaProcessRun(processKey, timestamp = nowIso()) {
    this.db.prepare('UPDATE hapa_repeating_processes SET last_run_at = ?, updated_at = ? WHERE process_key = ?').run(timestamp, timestamp, processKey);
    return this.getHapaRepeatingProcess(processKey);
  }

  createHapaDecisionRun(input = {}) {
    const id = input.id || makeId('decision');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO hapa_decision_runs (
        id, process_key, trigger_type, subject_type, subject_id, status, actor,
        input_context, card_context, result, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.process_key || input.processKey || 'manual',
      input.trigger_type || input.triggerType || 'manual',
      input.subject_type || input.subjectType || null,
      input.subject_id || input.subjectId || null,
      input.status || 'completed',
      input.actor || 'system',
      encode(coerceObject(input.input_context || input.inputContext)),
      encode(coerceObject(input.card_context || input.cardContext)),
      encode(coerceObject(input.result)),
      ts
    );
    return this.getHapaDecisionRun(id);
  }

  getHapaDecisionRun(id) {
    const row = this.db.prepare('SELECT * FROM hapa_decision_runs WHERE id = ?').get(id);
    return row ? decodeHapaDecisionRun(row) : null;
  }

  listHapaDecisionRuns({ process_key = '', processKey = '', subject_id = '', subjectId = '', limit = 100 } = {}) {
    const processFilter = process_key || processKey || '';
    const subjectFilter = subject_id || subjectId || '';
    return this.db.prepare(`
      SELECT *
      FROM hapa_decision_runs
      WHERE (? = '' OR process_key = ?)
        AND (? = '' OR subject_id = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(processFilter, processFilter, subjectFilter, subjectFilter, Number(limit)).map(decodeHapaDecisionRun);
  }

  listRoles() {
    return this.db.prepare('SELECT * FROM roles ORDER BY name').all().map(row => ({
      ...row,
      scopes: decode(row.scopes, [])
    }));
  }

  listIdentities() {
    return this.db.prepare(`
      SELECT i.*, r.name AS role_name
      FROM identities i
      JOIN roles r ON r.id = i.role_id
      ORDER BY i.name
    `).all().map(row => ({
      ...row,
      metadata: decode(row.metadata, {})
    }));
  }

  getIdentity(id) {
    const row = this.db.prepare(`
      SELECT i.*, r.name AS role_name, r.scopes
      FROM identities i
      JOIN roles r ON r.id = i.role_id
      WHERE i.id = ?
    `).get(id);
    return row ? { ...row, scopes: decode(row.scopes, []), metadata: decode(row.metadata, {}) } : null;
  }

  listPermissions() {
    return this.db.prepare('SELECT * FROM permissions ORDER BY role_id, action, scope').all();
  }

  listAuditEvents({ limit = 100 } = {}) {
    return this.db.prepare('SELECT * FROM audit_events ORDER BY created_at DESC LIMIT ?').all(limit).map(row => ({
      ...row,
      payload: decode(row.payload, {})
    }));
  }

  recordSchemaMigration({ version, name, status = 'applied', rollback_plan = {}, rollbackPlan = null, checksum = '', evidence = [] }) {
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO schema_migrations (id, version, name, status, applied_at, rollback_plan, checksum, evidence)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(version) DO UPDATE SET
        name = excluded.name,
        status = excluded.status,
        rollback_plan = excluded.rollback_plan,
        checksum = excluded.checksum,
        evidence = excluded.evidence
    `).run(makeId('mig'), version, name, status, ts, encode(rollbackPlan || rollback_plan), checksum || null, encode(evidence));
    return this.db.prepare('SELECT * FROM schema_migrations WHERE version = ?').get(version);
  }

  listSchemaMigrations({ limit = 50 } = {}) {
    return this.db.prepare('SELECT * FROM schema_migrations ORDER BY applied_at DESC LIMIT ?').all(limit).map(row => decodeJsonFields(row, ['rollback_plan', 'evidence']));
  }

  createImportReviewRows(batchId, rows = []) {
    const ts = nowIso();
    const insert = this.db.prepare(`
      INSERT INTO import_review_rows (
        id, batch_id, row_index, status, severity, errors, raw_record, canonical_preview, owner_role, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const row of rows) {
      insert.run(
        makeId('review'),
        batchId,
        Number(row.row_index ?? row.rowIndex ?? 0),
        row.status || 'pending',
        row.severity || 'info',
        encode(row.errors || []),
        encode(row.raw_record || row.rawRecord || {}),
        encode(row.canonical_preview || row.canonicalPreview || {}),
        row.owner_role || row.ownerRole || 'product_data_steward',
        ts,
        ts
      );
    }
    return this.listImportReviewRows({ batch_id: batchId, limit: rows.length || 100 });
  }

  listImportReviewRows({ batch_id = '', batchId = '', status = '', limit = 200 } = {}) {
    const batch = batch_id || batchId;
    return this.db.prepare(`
      SELECT irr.*, ib.source AS batch_source
      FROM import_review_rows irr
      JOIN import_batches ib ON ib.id = irr.batch_id
      WHERE (? = '' OR irr.batch_id = ?)
        AND (? = '' OR irr.status = ?)
      ORDER BY irr.created_at DESC, irr.row_index ASC
      LIMIT ?
    `).all(batch, batch, status, status, limit).map(row => decodeJsonFields(row, ['errors', 'raw_record', 'canonical_preview']));
  }

  updateImportReviewRowsStatus(batchId, fromStatus, toStatus) {
    const ts = nowIso();
    this.db.prepare(`
      UPDATE import_review_rows
      SET status = ?, updated_at = ?
      WHERE batch_id = ? AND (? = '' OR status = ?)
    `).run(toStatus, ts, batchId, fromStatus || '', fromStatus || '');
    return this.listImportReviewRows({ batch_id: batchId });
  }

  createConnectorRun({ connector_id, connectorId = '', mode = 'dry_run', status = 'completed', fetched_count = 0, fetchedCount = null, imported_batch_id = null, importedBatchId = null, preview = {}, errors = [], actor = 'system' }) {
    const id = makeId('connrun');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO connector_runs (id, connector_id, mode, status, fetched_count, imported_batch_id, preview, errors, actor, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, connector_id || connectorId, mode, status, Number(fetchedCount ?? fetched_count ?? 0), importedBatchId || imported_batch_id || null, encode(preview), encode(errors), actor, ts);
    return this.getConnectorRun(id);
  }

  getConnectorRun(id) {
    const row = this.db.prepare('SELECT * FROM connector_runs WHERE id = ?').get(id);
    return row ? decodeJsonFields(row, ['preview', 'errors']) : null;
  }

  listConnectorRuns({ connector_id = '', connectorId = '', limit = 50 } = {}) {
    const connector = connector_id || connectorId;
    return this.db.prepare(`
      SELECT cr.*, cc.name AS connector_name, cc.domain
      FROM connector_runs cr
      LEFT JOIN connector_contracts cc ON cc.id = cr.connector_id
      WHERE (? = '' OR cr.connector_id = ?)
      ORDER BY cr.created_at DESC
      LIMIT ?
    `).all(connector, connector, limit).map(row => decodeJsonFields(row, ['preview', 'errors']));
  }

  createIdentitySession({ identity_id, identityId = '', token_suffix, tokenSuffix = '', status = 'active', scopes = [], expires_at, expiresAt = '' }) {
    const id = makeId('sess');
    const ts = nowIso();
    const expiry = expiresAt || expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    this.db.prepare(`
      INSERT INTO identity_sessions (id, identity_id, token_suffix, status, scopes, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, identity_id || identityId, tokenSuffix || token_suffix || id.slice(-8), status, encode(scopes), expiry, ts);
    return this.getIdentitySession(id);
  }

  getIdentitySession(id) {
    const row = this.db.prepare(`
      SELECT ids.*, i.name AS identity_name, i.role_id
      FROM identity_sessions ids
      JOIN identities i ON i.id = ids.identity_id
      WHERE ids.id = ?
    `).get(id);
    return row ? decodeJsonFields(row, ['scopes']) : null;
  }

  updateIdentitySession({ id, status = '', token_suffix = '', tokenSuffix = '', rotated = false, revoked = false }) {
    const current = this.getIdentitySession(id);
    if (!current) return null;
    const ts = nowIso();
    this.db.prepare(`
      UPDATE identity_sessions
      SET status = ?, token_suffix = ?, rotated_at = ?, revoked_at = ?
      WHERE id = ?
    `).run(
      status || current.status,
      tokenSuffix || token_suffix || current.token_suffix,
      rotated ? ts : current.rotated_at,
      revoked ? ts : current.revoked_at,
      id
    );
    return this.getIdentitySession(id);
  }

  listIdentitySessions({ identity_id = '', identityId = '', status = '', limit = 100 } = {}) {
    const identity = identity_id || identityId;
    return this.db.prepare(`
      SELECT ids.*, i.name AS identity_name, i.role_id
      FROM identity_sessions ids
      JOIN identities i ON i.id = ids.identity_id
      WHERE (? = '' OR ids.identity_id = ?)
        AND (? = '' OR ids.status = ?)
      ORDER BY ids.created_at DESC
      LIMIT ?
    `).all(identity, identity, status, status, limit).map(row => decodeJsonFields(row, ['scopes']));
  }

  createForecastModelComparison({ sku_id, location, channel, baseline_run_id = null, models = [], winner = {}, metrics = {} }) {
    const id = makeId('fcompare');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO forecast_model_comparisons (id, sku_id, location, channel, baseline_run_id, models, winner, metrics, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, sku_id, location, channel, baseline_run_id, encode(models), encode(winner), encode(metrics), ts);
    return this.getForecastModelComparison(id);
  }

  getForecastModelComparison(id) {
    const row = this.db.prepare(`
      SELECT fmc.*, s.sku, s.name AS sku_name
      FROM forecast_model_comparisons fmc
      JOIN skus s ON s.id = fmc.sku_id
      WHERE fmc.id = ?
    `).get(id);
    return row ? decodeJsonFields(row, ['models', 'winner', 'metrics']) : null;
  }

  listForecastModelComparisons({ sku = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT fmc.*, s.sku, s.name AS sku_name
      FROM forecast_model_comparisons fmc
      JOIN skus s ON s.id = fmc.sku_id
      WHERE (? = '' OR s.sku = ? OR s.id = ?)
      ORDER BY fmc.created_at DESC
      LIMIT ?
    `).all(sku, sku, sku, limit).map(row => decodeJsonFields(row, ['models', 'winner', 'metrics']));
  }

  createMarketProviderRun({ provider, lookup, status, cache_key = '', cacheKey = '', retry_after = null, retryAfter = null, warnings = [], metadata = {} }) {
    const id = makeId('provider');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO market_provider_runs (id, provider, lookup, status, cache_key, retry_after, warnings, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, provider, lookup, status, cacheKey || cache_key || null, retryAfter || retry_after || null, encode(warnings), encode(metadata), ts);
    return this.db.prepare('SELECT * FROM market_provider_runs WHERE id = ?').get(id);
  }

  listMarketProviderRuns({ provider = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT * FROM market_provider_runs
      WHERE (? = '' OR provider = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(provider, provider, limit).map(row => decodeJsonFields(row, ['warnings', 'metadata']));
  }

  createProjectionExport({ target, dataset, schema_version, schemaVersion = '', watermark, row_count = 0, rowCount = null, status = 'exported', payload = {} }) {
    const id = makeId('projection');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO projection_exports (id, target, dataset, schema_version, watermark, row_count, status, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, target, dataset, schemaVersion || schema_version, String(watermark), Number(rowCount ?? row_count ?? 0), status, encode(payload), ts);
    return this.db.prepare('SELECT * FROM projection_exports WHERE id = ?').get(id);
  }

  listProjectionExports({ target = '', dataset = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT * FROM projection_exports
      WHERE (? = '' OR target = ?)
        AND (? = '' OR dataset = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(target, target, dataset, dataset, limit).map(row => decodeJsonFields(row, ['payload']));
  }

  createPricingScenario({ sku_id, current_price = 0, cost = 0, target_margin = 0.35, recommended_price = 0, markdown = 0, constraints = {}, status = 'draft' }) {
    const id = makeId('priceplan');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO pricing_scenarios (id, sku_id, current_price, cost, target_margin, recommended_price, markdown, constraints, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, sku_id, Number(current_price || 0), Number(cost || 0), Number(target_margin || 0), Number(recommended_price || 0), Number(markdown || 0), encode(constraints), status, ts);
    return this.getPricingScenario(id);
  }

  getPricingScenario(id) {
    const row = this.db.prepare(`
      SELECT ps.*, s.sku, s.name AS sku_name
      FROM pricing_scenarios ps
      JOIN skus s ON s.id = ps.sku_id
      WHERE ps.id = ?
    `).get(id);
    return row ? decodeJsonFields(row, ['constraints']) : null;
  }

  listPricingScenarios({ sku = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT ps.*, s.sku, s.name AS sku_name
      FROM pricing_scenarios ps
      JOIN skus s ON s.id = ps.sku_id
      WHERE (? = '' OR s.sku = ? OR s.id = ?)
      ORDER BY ps.created_at DESC
      LIMIT ?
    `).all(sku, sku, sku, limit).map(row => decodeJsonFields(row, ['constraints']));
  }

  updateSkuStatus(skuId, status) {
    const ts = nowIso();
    this.db.prepare('UPDATE skus SET status = ?, updated_at = ? WHERE id = ? OR sku = ?').run(status, ts, skuId, skuId);
  }

  createLifecycleEvent({ sku_id, from_state, to_state, actor = 'system', reason = '', status = 'applied' }) {
    const id = makeId('life');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO lifecycle_events (id, sku_id, from_state, to_state, actor, reason, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, sku_id, from_state, to_state, actor, reason, status, ts);
    return this.getLifecycleEvent(id);
  }

  getLifecycleEvent(id) {
    const row = this.db.prepare(`
      SELECT le.*, s.sku, s.name AS sku_name
      FROM lifecycle_events le
      JOIN skus s ON s.id = le.sku_id
      WHERE le.id = ?
    `).get(id);
    return row || null;
  }

  listLifecycleEvents({ sku = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT le.*, s.sku, s.name AS sku_name
      FROM lifecycle_events le
      JOIN skus s ON s.id = le.sku_id
      WHERE (? = '' OR s.sku = ? OR s.id = ?)
      ORDER BY le.created_at DESC
      LIMIT ?
    `).all(sku, sku, sku, limit);
  }

  createPublishingRun({ channel, status, sku_count = 0, skuCount = null, readiness = {}, payload_preview = {}, payloadPreview = null, external_refs = [], externalRefs = null, actor = 'system' }) {
    const id = makeId('publish');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO publishing_runs (id, channel, status, sku_count, readiness, payload_preview, external_refs, actor, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, channel, status, Number(skuCount ?? sku_count ?? 0), encode(readiness), encode(payloadPreview || payload_preview), encode(externalRefs || external_refs), actor, ts);
    return this.db.prepare('SELECT * FROM publishing_runs WHERE id = ?').get(id);
  }

  listPublishingRuns({ channel = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT * FROM publishing_runs
      WHERE (? = '' OR channel = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(channel, channel, limit).map(row => decodeJsonFields(row, ['readiness', 'payload_preview', 'external_refs']));
  }

  upsertTelemetryRegistration({ endpoint, status = 'registered', payload = {} }) {
    const id = makeId('telreg');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO telemetry_registrations (id, endpoint, status, heartbeat_at, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        status = excluded.status,
        heartbeat_at = excluded.heartbeat_at,
        payload = excluded.payload
    `).run(id, endpoint, status, ts, encode(payload), ts);
    return this.db.prepare('SELECT * FROM telemetry_registrations WHERE endpoint = ?').get(endpoint);
  }

  listTelemetryRegistrations({ limit = 100 } = {}) {
    return this.db.prepare('SELECT * FROM telemetry_registrations ORDER BY heartbeat_at DESC LIMIT ?').all(limit).map(row => decodeJsonFields(row, ['payload']));
  }

  upsertOrganization({ id = '', name, kind = 'organization', external_keys = {}, externalKeys = null, metadata = {} }) {
    const orgId = id || `org-${normalizeKey(name)}`;
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO organizations (id, name, kind, external_keys, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        kind = excluded.kind,
        external_keys = excluded.external_keys,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `).run(orgId, name, kind, encode(externalKeys || external_keys), encode(metadata), ts, ts);
    return this.db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
  }

  listOrganizations({ limit = 100 } = {}) {
    return this.db.prepare('SELECT * FROM organizations ORDER BY name LIMIT ?').all(limit).map(row => decodeJsonFields(row, ['external_keys', 'metadata']));
  }

  upsertIdentityTenant({ identity_id, identityId = '', organization_id, organizationId = '', role = 'member', status = 'active' }) {
    const id = makeId('tenant');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO identity_tenants (id, identity_id, organization_id, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(identity_id, organization_id, role) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(id, identity_id || identityId, organization_id || organizationId, role, status, ts, ts);
    return this.listIdentityTenants({ identity_id: identity_id || identityId, organization_id: organization_id || organizationId }).at(0);
  }

  listIdentityTenants({ identity_id = '', identityId = '', organization_id = '', organizationId = '', limit = 100 } = {}) {
    const identity = identity_id || identityId;
    const org = organization_id || organizationId;
    return this.db.prepare(`
      SELECT it.*, i.name AS identity_name, o.name AS organization_name, o.kind AS organization_kind
      FROM identity_tenants it
      JOIN identities i ON i.id = it.identity_id
      JOIN organizations o ON o.id = it.organization_id
      WHERE (? = '' OR it.identity_id = ?)
        AND (? = '' OR it.organization_id = ?)
      ORDER BY o.name, i.name
      LIMIT ?
    `).all(identity, identity, org, org, limit);
  }

  appendInventoryLedgerEvent({ sku_id, facility, location, event_type = 'adjustment', quantity = 0, balance_after = 0, ref = '', metadata = {}, occurred_at = '' }) {
    const id = makeId('ledger');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO inventory_ledger_events (id, sku_id, facility, location, event_type, quantity, balance_after, ref, metadata, occurred_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, sku_id, facility, location, event_type, Number(quantity || 0), Number(balance_after || 0), ref || null, encode(metadata), occurred_at || ts, ts);
    return this.getInventoryLedgerEvent(id);
  }

  getInventoryLedgerEvent(id) {
    const row = this.db.prepare(`
      SELECT ile.*, s.sku, s.name AS sku_name
      FROM inventory_ledger_events ile
      JOIN skus s ON s.id = ile.sku_id
      WHERE ile.id = ?
    `).get(id);
    return row ? decodeJsonFields(row, ['metadata']) : null;
  }

  listInventoryLedgerEvents({ sku = '', facility = '', limit = 200 } = {}) {
    return this.db.prepare(`
      SELECT ile.*, s.sku, s.name AS sku_name
      FROM inventory_ledger_events ile
      JOIN skus s ON s.id = ile.sku_id
      WHERE (? = '' OR s.sku = ? OR s.id = ?)
        AND (? = '' OR ile.facility = ?)
      ORDER BY ile.occurred_at DESC, ile.created_at DESC
      LIMIT ?
    `).all(sku, sku, sku, facility, facility, limit).map(row => decodeJsonFields(row, ['metadata']));
  }

  createInventoryReconciliation({ facility, status = 'completed', discrepancy_count = 0, discrepancyCount = null, adjustments = [], metadata = {}, actor = 'system' }) {
    const id = makeId('reconcile');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO inventory_reconciliations (id, facility, status, discrepancy_count, adjustments, metadata, actor, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, facility, status, Number(discrepancyCount ?? discrepancy_count ?? 0), encode(adjustments), encode(metadata), actor, ts);
    return this.db.prepare('SELECT * FROM inventory_reconciliations WHERE id = ?').get(id);
  }

  listInventoryReconciliations({ facility = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT * FROM inventory_reconciliations
      WHERE (? = '' OR facility = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(facility, facility, limit).map(row => decodeJsonFields(row, ['adjustments', 'metadata']));
  }

  upsertQualityRule({ id = '', name, object_type = 'sku', objectType = '', severity = 'warning', expression = {}, owner_role = 'product_data_steward', ownerRole = '', enabled = true, remediation = '' }) {
    const ruleId = id || `qr-${normalizeKey(name)}`;
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO quality_rules (id, name, object_type, severity, expression, owner_role, enabled, remediation, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        object_type = excluded.object_type,
        severity = excluded.severity,
        expression = excluded.expression,
        owner_role = excluded.owner_role,
        enabled = excluded.enabled,
        remediation = excluded.remediation,
        updated_at = excluded.updated_at
    `).run(ruleId, name, objectType || object_type, severity, encode(expression), ownerRole || owner_role, enabled ? 1 : 0, remediation, ts, ts);
    return this.db.prepare('SELECT * FROM quality_rules WHERE id = ?').get(ruleId);
  }

  listQualityRules({ enabled = null, limit = 100 } = {}) {
    const enabledFilter = enabled === null || enabled === '' ? null : (enabled === true || enabled === 'true' || enabled === 1 ? 1 : 0);
    return this.db.prepare(`
      SELECT * FROM quality_rules
      WHERE (? IS NULL OR enabled = ?)
      ORDER BY severity DESC, name
      LIMIT ?
    `).all(enabledFilter, enabledFilter, limit).map(row => decodeJsonFields(row, ['expression'], ['enabled']));
  }

  createQualityWorkOrder({ rule_id, object_type, object_id = null, status = 'open', severity, owner_role, message, remediation, evidence = {} }) {
    const id = makeId('qwo');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO quality_work_orders (id, rule_id, object_type, object_id, status, severity, owner_role, message, remediation, evidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, rule_id, object_type, object_id, status, severity, owner_role, message, remediation, encode(evidence), ts, ts);
    return this.db.prepare('SELECT * FROM quality_work_orders WHERE id = ?').get(id);
  }

  listQualityWorkOrders({ status = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT qwo.*, qr.name AS rule_name
      FROM quality_work_orders qwo
      JOIN quality_rules qr ON qr.id = qwo.rule_id
      WHERE (? = '' OR qwo.status = ?)
      ORDER BY qwo.created_at DESC
      LIMIT ?
    `).all(status, status, limit).map(row => decodeJsonFields(row, ['evidence']));
  }

  createDesktopPackage({ platform = process.platform, status = 'planned', artifact_ref = '', artifactRef = '', updater_policy = {}, updaterPolicy = null, offline_mode = true, offlineMode = null, smoke_result = {}, smokeResult = null }) {
    const id = makeId('desktop');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO desktop_packages (id, platform, status, artifact_ref, updater_policy, offline_mode, smoke_result, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, platform, status, artifactRef || artifact_ref || `artifacts/desktop/${platform}/hapa-catalog`, encode(updaterPolicy || updater_policy), (offlineMode ?? offline_mode) ? 1 : 0, encode(smokeResult || smoke_result), ts);
    return this.db.prepare('SELECT * FROM desktop_packages WHERE id = ?').get(id);
  }

  listDesktopPackages({ limit = 100 } = {}) {
    return this.db.prepare('SELECT * FROM desktop_packages ORDER BY created_at DESC LIMIT ?').all(limit).map(row => decodeJsonFields(row, ['updater_policy', 'smoke_result'], ['offline_mode']));
  }

  createLineageExport({ dataset, format = 'json', status = 'exported', row_count = 0, rowCount = null, payload = {} }) {
    const id = makeId('lineage');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO lineage_exports (id, dataset, format, status, row_count, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, dataset, format, status, Number(rowCount ?? row_count ?? 0), encode(payload), ts);
    return this.db.prepare('SELECT * FROM lineage_exports WHERE id = ?').get(id);
  }

  listLineageExports({ dataset = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT * FROM lineage_exports
      WHERE (? = '' OR dataset = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(dataset, dataset, limit).map(row => decodeJsonFields(row, ['payload']));
  }

  upsertRetentionPolicy({ id = '', name, dataset, policy = {}, status = 'active' }) {
    const policyId = id || `retention-${normalizeKey(dataset || name)}`;
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO retention_policies (id, name, dataset, policy, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        dataset = excluded.dataset,
        policy = excluded.policy,
        status = excluded.status,
        updated_at = excluded.updated_at
    `).run(policyId, name, dataset, encode(policy), status, ts, ts);
    return this.db.prepare('SELECT * FROM retention_policies WHERE id = ?').get(policyId);
  }

  listRetentionPolicies({ dataset = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT * FROM retention_policies
      WHERE (? = '' OR dataset = ?)
      ORDER BY dataset, name
      LIMIT ?
    `).all(dataset, dataset, limit).map(row => decodeJsonFields(row, ['policy']));
  }

  createBackupRun({ backup_type = 'sqlite-wal', backupType = '', status = 'completed', artifact_ref = '', artifactRef = '', retention_policy_id = null, retentionPolicyId = null, recovery_drill_result = {}, recoveryDrillResult = null }) {
    const id = makeId('backup');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO backup_runs (id, backup_type, status, artifact_ref, retention_policy_id, recovery_drill_result, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, backupType || backup_type, status, artifactRef || artifact_ref || `artifacts/backups/${id}.sqlite`, retentionPolicyId || retention_policy_id || null, encode(recoveryDrillResult || recovery_drill_result), ts);
    return this.db.prepare('SELECT * FROM backup_runs WHERE id = ?').get(id);
  }

  listBackupRuns({ limit = 100 } = {}) {
    return this.db.prepare('SELECT * FROM backup_runs ORDER BY created_at DESC LIMIT ?').all(limit).map(row => decodeJsonFields(row, ['recovery_drill_result']));
  }

  createNextCycleArtifact({ artifact_type, artifactType = '', phase, subject, status = 'ready', payload = {}, evidence = [], actor = 'system' }) {
    const id = makeId('cycle');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO next_cycle_artifacts (id, artifact_type, phase, subject, status, payload, evidence, actor, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, artifactType || artifact_type, phase, subject, status, encode(payload), encode(evidence), actor, ts, ts);
    return this.getNextCycleArtifact(id);
  }

  getNextCycleArtifact(id) {
    const row = this.db.prepare('SELECT * FROM next_cycle_artifacts WHERE id = ?').get(id);
    return row ? decodeJsonFields(row, ['payload', 'evidence']) : null;
  }

  listNextCycleArtifacts({ phase = '', artifact_type = '', artifactType = '', status = '', limit = 500 } = {}) {
    const type = artifactType || artifact_type;
    return this.db.prepare(`
      SELECT * FROM next_cycle_artifacts
      WHERE (? = '' OR phase LIKE '%' || ? || '%')
        AND (? = '' OR artifact_type = ?)
        AND (? = '' OR status = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(phase, phase, type, type, status, status, limit).map(row => decodeJsonFields(row, ['payload', 'evidence']));
  }

  createNextCycleTestRun({ test_type, testType = '', status = 'passed', target, assertions = [], evidence = {} }) {
    const id = makeId('testrun');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO next_cycle_test_runs (id, test_type, status, target, assertions, evidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, testType || test_type, status, target, encode(assertions), encode(evidence), ts);
    return decodeJsonFields(this.db.prepare('SELECT * FROM next_cycle_test_runs WHERE id = ?').get(id), ['assertions', 'evidence']);
  }

  listNextCycleTestRuns({ test_type = '', testType = '', status = '', limit = 100 } = {}) {
    const type = testType || test_type;
    return this.db.prepare(`
      SELECT * FROM next_cycle_test_runs
      WHERE (? = '' OR test_type = ?)
        AND (? = '' OR status = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(type, type, status, status, limit).map(row => decodeJsonFields(row, ['assertions', 'evidence']));
  }

  createReviewEvidenceBundle({ bundle_type = 'review-room', bundleType = '', status = 'ready', manifest = {}, redaction_manifest = {}, redactionManifest = null, sources = [], board_checkpoint_id = null, boardCheckpointId = null, board_checkpoint_title = null, boardCheckpointTitle = null, artifact_count = 0, artifactCount = null, test_run_count = 0, testRunCount = null, actor = 'system' } = {}) {
    const id = makeId('bundle');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO review_evidence_bundles (id, bundle_type, status, manifest, redaction_manifest, sources, board_checkpoint_id, board_checkpoint_title, artifact_count, test_run_count, actor, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      bundleType || bundle_type,
      status,
      encode(manifest),
      encode(redactionManifest || redaction_manifest),
      encode(sources),
      boardCheckpointId || board_checkpoint_id || null,
      boardCheckpointTitle || board_checkpoint_title || null,
      Number(artifactCount ?? artifact_count ?? 0),
      Number(testRunCount ?? test_run_count ?? 0),
      actor,
      ts
    );
    return this.getReviewEvidenceBundle(id);
  }

  getReviewEvidenceBundle(id) {
    const row = this.db.prepare('SELECT * FROM review_evidence_bundles WHERE id = ?').get(id);
    return row ? decodeJsonFields(row, ['manifest', 'redaction_manifest', 'sources']) : null;
  }

  listReviewEvidenceBundles({ bundle_type = '', bundleType = '', status = '', limit = 100 } = {}) {
    const type = bundleType || bundle_type;
    return this.db.prepare(`
      SELECT * FROM review_evidence_bundles
      WHERE (? = '' OR bundle_type = ?)
        AND (? = '' OR status = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(type, type, status, status, limit).map(row => decodeJsonFields(row, ['manifest', 'redaction_manifest', 'sources']));
  }

  appendEventEnvelope({ event_type = '', eventType = '', object_type = '', objectType = '', object_id = '', objectId = '', idempotency_key = '', idempotencyKey = '', payload = {}, producer = 'hapa-catalog-node', actor = 'system', occurred_at = '', occurredAt = '' } = {}) {
    const eventTypeValue = eventType || event_type || 'catalog.event';
    const objectTypeValue = objectType || object_type || 'catalog';
    const objectIdValue = objectId || object_id || 'system';
    const key = idempotencyKey || idempotency_key || `${eventTypeValue}:${objectTypeValue}:${objectIdValue}:${makeId('idem')}`;
    const id = makeId('event');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO event_envelopes (id, event_type, object_type, object_id, idempotency_key, payload, producer, actor, occurred_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(idempotency_key) DO UPDATE SET idempotency_key = excluded.idempotency_key
    `).run(id, eventTypeValue, objectTypeValue, objectIdValue, key, encode(payload), producer, actor, occurredAt || occurred_at || ts, ts);
    const row = this.db.prepare('SELECT * FROM event_envelopes WHERE idempotency_key = ?').get(key);
    return decodeJsonFields(row, ['payload']);
  }

  listEventEnvelopes({ event_type = '', eventType = '', object_type = '', objectType = '', limit = 100 } = {}) {
    const eventTypeValue = eventType || event_type;
    const objectTypeValue = objectType || object_type;
    return this.db.prepare(`
      SELECT * FROM event_envelopes
      WHERE (? = '' OR event_type = ?)
        AND (? = '' OR object_type = ?)
      ORDER BY occurred_at DESC, created_at DESC
      LIMIT ?
    `).all(eventTypeValue, eventTypeValue, objectTypeValue, objectTypeValue, limit).map(row => decodeJsonFields(row, ['payload']));
  }

  upsertProjectionCheckpoint({ id = '', consumer, source = 'event_envelopes', checkpoint_key = '', checkpointKey = '', watermark = '', status = 'current', row_count = 0, rowCount = null, last_event_id = null, lastEventId = null, metadata = {} } = {}) {
    const checkpointId = id || makeId('checkpoint');
    const key = checkpointKey || checkpoint_key || `${consumer}:${source}`;
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO projection_checkpoints (id, consumer, source, checkpoint_key, watermark, status, row_count, last_event_id, metadata, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(checkpoint_key) DO UPDATE SET
        consumer = excluded.consumer,
        source = excluded.source,
        watermark = excluded.watermark,
        status = excluded.status,
        row_count = excluded.row_count,
        last_event_id = excluded.last_event_id,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at
    `).run(checkpointId, consumer, source, key, watermark || ts, status, Number(rowCount ?? row_count ?? 0), lastEventId || last_event_id || null, encode(metadata), ts);
    return decodeJsonFields(this.db.prepare('SELECT * FROM projection_checkpoints WHERE checkpoint_key = ?').get(key), ['metadata']);
  }

  listProjectionCheckpoints({ consumer = '', source = '', status = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT * FROM projection_checkpoints
      WHERE (? = '' OR consumer = ?)
        AND (? = '' OR source = ?)
        AND (? = '' OR status = ?)
      ORDER BY updated_at DESC
      LIMIT ?
    `).all(consumer, consumer, source, source, status, status, limit).map(row => decodeJsonFields(row, ['metadata']));
  }

  createCredentialRef({ provider, label, status = 'active', storage = 'reference_only', secret_ref = '', secretRef = '', scopes = [], metadata = {} } = {}) {
    const id = makeId('credref');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO credential_refs (id, provider, label, status, storage, secret_ref, scopes, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, provider, label, status, storage, secretRef || secret_ref || `hapa://credentials/${provider}/${normalizeStoreKey(label)}`, encode(scopes), encode(metadata), ts, ts);
    return decodeJsonFields(this.db.prepare('SELECT * FROM credential_refs WHERE id = ?').get(id), ['scopes', 'metadata']);
  }

  listCredentialRefs({ provider = '', status = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT * FROM credential_refs
      WHERE (? = '' OR provider = ?)
        AND (? = '' OR status = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(provider, provider, status, status, limit).map(row => decodeJsonFields(row, ['scopes', 'metadata']));
  }

  createDecisionQueueItem({ process_key = '', processKey = '', subject_type = '', subjectType = '', subject_id = '', subjectId = '', status = 'open', owner_identity_id = null, ownerIdentityId = null, severity = 'medium', sla_due_at = null, slaDueAt = null, required_review_mode = 'review_required', requiredReviewMode = '', card_context = {}, cardContext = null, evidence = {}, audit_event_id = null, auditEventId = null } = {}) {
    const id = makeId('decision');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO decision_queue_items (id, process_key, subject_type, subject_id, status, owner_identity_id, severity, sla_due_at, required_review_mode, card_context, evidence, audit_event_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      processKey || process_key || 'catalog.decision',
      subjectType || subject_type || 'catalog',
      subjectId || subject_id || 'system',
      status,
      ownerIdentityId || owner_identity_id || null,
      severity,
      slaDueAt || sla_due_at || null,
      requiredReviewMode || required_review_mode,
      encode(cardContext || card_context),
      encode(evidence),
      auditEventId || audit_event_id || null,
      ts,
      ts
    );
    return this.getDecisionQueueItem(id);
  }

  getDecisionQueueItem(id) {
    const row = this.db.prepare('SELECT * FROM decision_queue_items WHERE id = ?').get(id);
    return row ? decodeJsonFields(row, ['card_context', 'evidence']) : null;
  }

  updateDecisionQueueItem({ id, status, owner_identity_id = null, ownerIdentityId = null, evidence = null }) {
    const existing = this.getDecisionQueueItem(id);
    if (!existing) return null;
    const nextEvidence = evidence ? { ...existing.evidence, ...evidence } : existing.evidence;
    const ts = nowIso();
    this.db.prepare(`
      UPDATE decision_queue_items
      SET status = ?, owner_identity_id = ?, evidence = ?, updated_at = ?
      WHERE id = ?
    `).run(status || existing.status, ownerIdentityId || owner_identity_id || existing.owner_identity_id, encode(nextEvidence), ts, id);
    return this.getDecisionQueueItem(id);
  }

  listDecisionQueueItems({ status = '', process_key = '', processKey = '', severity = '', limit = 100 } = {}) {
    const processKeyValue = processKey || process_key;
    return this.db.prepare(`
      SELECT * FROM decision_queue_items
      WHERE (? = '' OR status = ?)
        AND (? = '' OR process_key = ?)
        AND (? = '' OR severity = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(status, status, processKeyValue, processKeyValue, severity, severity, limit).map(row => decodeJsonFields(row, ['card_context', 'evidence']));
  }

  createTrustAttestation({ attestation_type = '', attestationType = '', subject = '', status = 'passed', checks = [], evidence = {}, actor = 'system' } = {}) {
    const id = makeId('trust');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO trust_attestations (id, attestation_type, subject, status, checks, evidence, actor, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, attestationType || attestation_type || 'trust.attestation', subject || 'catalog', status, encode(checks), encode(evidence), actor, ts);
    return decodeJsonFields(this.db.prepare('SELECT * FROM trust_attestations WHERE id = ?').get(id), ['checks', 'evidence']);
  }

  listTrustAttestations({ attestation_type = '', attestationType = '', status = '', limit = 100 } = {}) {
    const type = attestationType || attestation_type;
    return this.db.prepare(`
      SELECT * FROM trust_attestations
      WHERE (? = '' OR attestation_type = ?)
        AND (? = '' OR status = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(type, type, status, status, limit).map(row => decodeJsonFields(row, ['checks', 'evidence']));
  }

  createPilotRunbook({ name, status = 'scheduled', schedule = {}, gates = {}, packet = {}, metrics = {}, actor = 'system' } = {}) {
    const id = makeId('runbook');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO pilot_runbooks (id, name, status, schedule, gates, packet, metrics, actor, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, status, encode(schedule), encode(gates), encode(packet), encode(metrics), actor, ts, ts);
    return decodeJsonFields(this.db.prepare('SELECT * FROM pilot_runbooks WHERE id = ?').get(id), ['schedule', 'gates', 'packet', 'metrics']);
  }

  listPilotRunbooks({ status = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT * FROM pilot_runbooks
      WHERE (? = '' OR status = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(status, status, limit).map(row => decodeJsonFields(row, ['schedule', 'gates', 'packet', 'metrics']));
  }

  createReleaseGateEvaluation({ gate, status = 'pending', inputs = {}, findings = [], metrics = {}, decision = {}, actor = 'system' } = {}) {
    const id = makeId('gate');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO release_gate_evaluations (id, gate, status, inputs, findings, metrics, decision, actor, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, gate, status, encode(inputs), encode(findings), encode(metrics), encode(decision), actor, ts);
    return decodeJsonFields(this.db.prepare('SELECT * FROM release_gate_evaluations WHERE id = ?').get(id), ['inputs', 'findings', 'metrics', 'decision']);
  }

  listReleaseGateEvaluations({ gate = '', status = '', limit = 100 } = {}) {
    return this.db.prepare(`
      SELECT * FROM release_gate_evaluations
      WHERE (? = '' OR gate = ?)
        AND (? = '' OR status = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(gate, gate, status, status, limit).map(row => decodeJsonFields(row, ['inputs', 'findings', 'metrics', 'decision']));
  }

  createReviewDecisionRecord({ record_type = '', recordType = '', status = 'open', subject = '', owner = 'local_operator', payload = {}, evidence = {}, actor = 'system' } = {}) {
    const id = makeId('reviewrec');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO review_decision_records (id, record_type, status, subject, owner, payload, evidence, actor, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, recordType || record_type || 'review_decision', status, subject || 'review room', owner, encode(payload), encode(evidence), actor, ts, ts);
    return decodeJsonFields(this.db.prepare('SELECT * FROM review_decision_records WHERE id = ?').get(id), ['payload', 'evidence']);
  }

  listReviewDecisionRecords({ record_type = '', recordType = '', status = '', owner = '', limit = 100 } = {}) {
    const type = recordType || record_type;
    return this.db.prepare(`
      SELECT * FROM review_decision_records
      WHERE (? = '' OR record_type = ?)
        AND (? = '' OR status = ?)
        AND (? = '' OR owner = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(type, type, status, status, owner, owner, limit).map(row => decodeJsonFields(row, ['payload', 'evidence']));
  }

  createPilotOperationRecord({ operation_type = '', operationType = '', status = 'planned', tenant_id = '', tenantId = '', payload = {}, evidence = {}, actor = 'system' } = {}) {
    const id = makeId('pilotop');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO pilot_operation_records (id, operation_type, status, tenant_id, payload, evidence, actor, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, operationType || operation_type || 'pilot_operation', status, tenantId || tenant_id || 'pilot-tenant', encode(payload), encode(evidence), actor, ts, ts);
    return decodeJsonFields(this.db.prepare('SELECT * FROM pilot_operation_records WHERE id = ?').get(id), ['payload', 'evidence']);
  }

  listPilotOperationRecords({ operation_type = '', operationType = '', status = '', tenant_id = '', tenantId = '', limit = 100 } = {}) {
    const type = operationType || operation_type;
    const tenant = tenantId || tenant_id;
    return this.db.prepare(`
      SELECT * FROM pilot_operation_records
      WHERE (? = '' OR operation_type = ?)
        AND (? = '' OR status = ?)
        AND (? = '' OR tenant_id = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(type, type, status, status, tenant, tenant, limit).map(row => decodeJsonFields(row, ['payload', 'evidence']));
  }

  createPlatformHardeningRecord({ check_type = '', checkType = '', status = 'planned', target = '', metrics = {}, evidence = {}, actor = 'system' } = {}) {
    const id = makeId('hardening');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO platform_hardening_records (id, check_type, status, target, metrics, evidence, actor, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, checkType || check_type || 'hardening_check', status, target || 'hapa-catalog-node', encode(metrics), encode(evidence), actor, ts);
    return decodeJsonFields(this.db.prepare('SELECT * FROM platform_hardening_records WHERE id = ?').get(id), ['metrics', 'evidence']);
  }

  listPlatformHardeningRecords({ check_type = '', checkType = '', status = '', target = '', limit = 100 } = {}) {
    const type = checkType || check_type;
    return this.db.prepare(`
      SELECT * FROM platform_hardening_records
      WHERE (? = '' OR check_type = ?)
        AND (? = '' OR status = ?)
        AND (? = '' OR target = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(type, type, status, status, target, target, limit).map(row => decodeJsonFields(row, ['metrics', 'evidence']));
  }

  createAgentGovernanceRecord({ governance_type = '', governanceType = '', status = 'planned', process_key = '', processKey = '', payload = {}, evidence = {}, actor = 'system' } = {}) {
    const id = makeId('agentgov');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO agent_governance_records (id, governance_type, status, process_key, payload, evidence, actor, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, governanceType || governance_type || 'agent_governance', status, processKey || process_key || 'catalog.sku.review', encode(payload), encode(evidence), actor, ts);
    return decodeJsonFields(this.db.prepare('SELECT * FROM agent_governance_records WHERE id = ?').get(id), ['payload', 'evidence']);
  }

  listAgentGovernanceRecords({ governance_type = '', governanceType = '', status = '', process_key = '', processKey = '', limit = 100 } = {}) {
    const type = governanceType || governance_type;
    const processKeyValue = processKey || process_key;
    return this.db.prepare(`
      SELECT * FROM agent_governance_records
      WHERE (? = '' OR governance_type = ?)
        AND (? = '' OR status = ?)
        AND (? = '' OR process_key = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(type, type, status, status, processKeyValue, processKeyValue, limit).map(row => decodeJsonFields(row, ['payload', 'evidence']));
  }

  createCommercialReadinessRecord({ record_type = '', recordType = '', status = 'planned', audience = 'design_partner', payload = {}, evidence = {}, actor = 'system' } = {}) {
    const id = makeId('commercial');
    const ts = nowIso();
    this.db.prepare(`
      INSERT INTO commercial_readiness_records (id, record_type, status, audience, payload, evidence, actor, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, recordType || record_type || 'commercial_readiness', status, audience, encode(payload), encode(evidence), actor, ts);
    return decodeJsonFields(this.db.prepare('SELECT * FROM commercial_readiness_records WHERE id = ?').get(id), ['payload', 'evidence']);
  }

  listCommercialReadinessRecords({ record_type = '', recordType = '', status = '', audience = '', limit = 100 } = {}) {
    const type = recordType || record_type;
    return this.db.prepare(`
      SELECT * FROM commercial_readiness_records
      WHERE (? = '' OR record_type = ?)
        AND (? = '' OR status = ?)
        AND (? = '' OR audience = ?)
      ORDER BY created_at DESC
      LIMIT ?
    `).all(type, type, status, status, audience, audience, limit).map(row => decodeJsonFields(row, ['payload', 'evidence']));
  }

  summary() {
    const tableCount = table => this.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;
    const inventory = this.db.prepare(`
      SELECT
        COALESCE(SUM(on_hand), 0) AS on_hand,
        COALESCE(SUM(reserved), 0) AS reserved,
        COALESCE(SUM(in_transit), 0) AS in_transit,
        COALESCE(SUM(on_hand - reserved), 0) AS available
      FROM inventory_positions
    `).get();
    return {
      products: tableCount('products'),
      skus: tableCount('skus'),
      suppliers: tableCount('suppliers'),
      inventory_positions: tableCount('inventory_positions'),
      import_batches: tableCount('import_batches'),
      forecast_runs: tableCount('forecast_runs'),
      forecast_actuals: tableCount('forecast_actuals'),
      forecast_quality_events: tableCount('forecast_quality_events'),
      market_price_snapshots: tableCount('market_price_snapshots'),
      market_price_points: tableCount('market_price_points'),
      market_listing_snapshots: tableCount('market_listing_snapshots'),
      media_assets: tableCount('media_assets'),
      import_mappings: tableCount('import_mappings'),
      duplicate_candidates: tableCount('duplicate_candidates'),
      merge_events: tableCount('merge_events'),
      digital_products: tableCount('digital_products'),
      connector_contracts: tableCount('connector_contracts'),
      performance_reports: tableCount('performance_reports'),
      item_identifiers: tableCount('item_identifiers'),
      hapa_cards: tableCount('hapa_cards'),
      hapa_card_placements: tableCount('hapa_card_placements'),
      hapa_decision_runs: tableCount('hapa_decision_runs'),
      hapa_repeating_processes: tableCount('hapa_repeating_processes'),
      schema_migrations: tableCount('schema_migrations'),
      import_review_rows: tableCount('import_review_rows'),
      connector_runs: tableCount('connector_runs'),
      identity_sessions: tableCount('identity_sessions'),
      forecast_model_comparisons: tableCount('forecast_model_comparisons'),
      market_provider_runs: tableCount('market_provider_runs'),
      projection_exports: tableCount('projection_exports'),
      pricing_scenarios: tableCount('pricing_scenarios'),
      lifecycle_events: tableCount('lifecycle_events'),
      publishing_runs: tableCount('publishing_runs'),
      telemetry_registrations: tableCount('telemetry_registrations'),
      organizations: tableCount('organizations'),
      identity_tenants: tableCount('identity_tenants'),
      inventory_ledger_events: tableCount('inventory_ledger_events'),
      inventory_reconciliations: tableCount('inventory_reconciliations'),
      quality_rules: tableCount('quality_rules'),
      quality_work_orders: tableCount('quality_work_orders'),
      desktop_packages: tableCount('desktop_packages'),
      lineage_exports: tableCount('lineage_exports'),
      retention_policies: tableCount('retention_policies'),
      backup_runs: tableCount('backup_runs'),
      next_cycle_artifacts: tableCount('next_cycle_artifacts'),
      next_cycle_test_runs: tableCount('next_cycle_test_runs'),
      review_evidence_bundles: tableCount('review_evidence_bundles'),
      event_envelopes: tableCount('event_envelopes'),
      projection_checkpoints: tableCount('projection_checkpoints'),
      credential_refs: tableCount('credential_refs'),
      decision_queue_items: tableCount('decision_queue_items'),
      trust_attestations: tableCount('trust_attestations'),
      pilot_runbooks: tableCount('pilot_runbooks'),
      release_gate_evaluations: tableCount('release_gate_evaluations'),
      review_decision_records: tableCount('review_decision_records'),
      pilot_operation_records: tableCount('pilot_operation_records'),
      platform_hardening_records: tableCount('platform_hardening_records'),
      agent_governance_records: tableCount('agent_governance_records'),
      commercial_readiness_records: tableCount('commercial_readiness_records'),
      audit_events: tableCount('audit_events'),
      roles: tableCount('roles'),
      identities: tableCount('identities'),
      inventory
    };
  }
}

function normalizeStoreKey(value) {
  return String(value || 'default')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'default';
}

function decodeJsonFields(row, jsonFields = [], booleanFields = []) {
  if (!row) return null;
  const decoded = { ...row };
  for (const field of jsonFields) decoded[field] = decode(row[field], Array.isArray(row[field]) ? [] : {});
  for (const field of booleanFields) decoded[field] = Boolean(row[field]);
  return decoded;
}

function decodeMarketSnapshot(row) {
  return {
    ...row,
    identifiers: decode(row.identifiers, {}),
    price_summary: decode(row.price_summary, {}),
    warnings: decode(row.warnings, [])
  };
}

function decodeListingSnapshot(row) {
  return {
    ...row,
    price: row.price == null ? null : Number(row.price),
    list_price: row.list_price == null ? null : Number(row.list_price),
    rating: row.rating == null ? null : Number(row.rating),
    review_count: row.review_count == null ? null : Number(row.review_count),
    feature_bullets: decode(row.feature_bullets, []),
    details: decode(row.details, {}),
    documents: decode(row.documents, []),
    warnings: decode(row.warnings, [])
  };
}

function decodeMediaAsset(row) {
  return {
    ...row,
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    metadata: decode(row.metadata, {})
  };
}

function decodeImportMapping(row) {
  return {
    ...row,
    field_map: decode(row.field_map, {}),
    defaults: decode(row.defaults, {}),
    conversions: decode(row.conversions, {})
  };
}

function decodeDigitalProduct(row) {
  return {
    ...row,
    rights: decode(row.rights, {}),
    attributes: decode(row.attributes, {})
  };
}

function decodeDuplicateCandidate(row) {
  return {
    ...row,
    confidence: Number(row.confidence || 0),
    reasons: decode(row.reasons, [])
  };
}

function decodeMergeEvent(row) {
  return {
    ...row,
    survivorship: decode(row.survivorship, {}),
    metadata: decode(row.metadata, {})
  };
}

function decodeForecastActual(row) {
  return {
    ...row,
    actual: Number(row.actual || 0),
    stockout_days: Number(row.stockout_days || 0)
  };
}

function decodeForecastQualityEvent(row) {
  return {
    ...row,
    error: Number(row.error || 0),
    absolute_error: Number(row.absolute_error || 0),
    bias: Number(row.bias || 0),
    percent_error: Number(row.percent_error || 0),
    stockout_impact: Number(row.stockout_impact || 0)
  };
}

function decodeConnectorContract(row) {
  return {
    ...row,
    schema: decode(row.schema, {})
  };
}

function decodePerformanceReport(row) {
  return {
    ...row,
    sku_target: Number(row.sku_target || 0),
    inventory_event_target: Number(row.inventory_event_target || 0),
    measured_skus: Number(row.measured_skus || 0),
    measured_inventory_events: Number(row.measured_inventory_events || 0),
    duration_ms: Number(row.duration_ms || 0),
    search_ms: Number(row.search_ms || 0),
    import_preview_ms: Number(row.import_preview_ms || 0),
    notes: decode(row.notes, [])
  };
}

function decodeHapaCard(row) {
  return {
    ...row,
    skills: decode(row.skills, []),
    context: decode(row.context, {}),
    tags: decode(row.tags, [])
  };
}

function decodeHapaCardPlacement(row) {
  const decoded = {
    ...row,
    priority: Number(row.priority || 0),
    active: Boolean(row.active),
    metadata: decode(row.metadata, {})
  };
  if (row.linked_card_id) {
    decoded.card = decodeHapaCard({
      id: row.linked_card_id,
      card_kind: row.linked_card_kind,
      name: row.linked_card_name,
      owner_identity_id: row.linked_owner_identity_id,
      organization_id: row.linked_organization_id,
      source_node: row.linked_source_node,
      card_ref: row.linked_card_ref,
      skills: row.linked_skills,
      context: row.linked_context,
      tags: row.linked_tags,
      status: row.linked_status,
      created_at: row.linked_created_at,
      updated_at: row.linked_updated_at
    });
    for (const key of Object.keys(decoded)) {
      if (key.startsWith('linked_')) delete decoded[key];
    }
  }
  return decoded;
}

function decodeHapaRepeatingProcess(row) {
  return {
    ...row,
    enabled: Boolean(row.enabled),
    card_policy: decode(row.card_policy, {}),
    metadata: decode(row.metadata, {})
  };
}

function decodeHapaDecisionRun(row) {
  return {
    ...row,
    input_context: decode(row.input_context, {}),
    card_context: decode(row.card_context, {}),
    result: decode(row.result, {})
  };
}

function coerceArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map(item => item.trim()).filter(Boolean);
  return [];
}

function coerceObject(value) {
  if (!value) return {};
  if (typeof value === 'string') return decode(value, {});
  return typeof value === 'object' ? value : {};
}

function normalizeIdentifierValue(scheme, value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (['upc', 'ean', 'gtin', 'isbn'].includes(scheme)) return raw.replace(/\D+/g, '');
  if (scheme === 'asin') return raw.toUpperCase();
  return raw;
}

function normalizeKey(value) {
  return String(value || 'default')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'default';
}
