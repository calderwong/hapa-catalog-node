import { createReadStream, existsSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { createServer } from 'node:http';
import { createCore } from './catalog-core.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

export async function startServer(options = {}) {
  const core = createCore(options);
  const config = core.config;
  const server = createServer(async (req, res) => {
    try {
      await route(req, res, core);
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error_code: 'internal_error',
        message: error.message,
        stage: 'server.route',
        correlation_id: req.headers['x-correlation-id'] || null
      });
    }
  });
  await new Promise(resolve => server.listen(config.port, config.host, resolve));
  const address = server.address();
  const runtime = {
    node_id: 'hapa-catalog-node',
    display_name: '.hapaCatalog',
    host: config.host,
    port: address.port,
    pid: process.pid,
    token_source: process.env.HAPA_CATALOG_TOKEN ? 'env' : config.tokenFile,
    db_path: config.dbPath,
    started_at: new Date().toISOString()
  };
  writeFileSync(config.runtimeFile, JSON.stringify(runtime, null, 2));
  return { server, core, url: `http://${config.host}:${address.port}`, runtime };
}

async function route(req, res, core) {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const path = decodeURIComponent(url.pathname);

  if (req.method === 'GET' && path === '/') {
    return serveFile(res, join(core.config.root, 'web', 'index.html'));
  }
  if (req.method === 'GET' && path.startsWith('/web/')) {
    return serveFile(res, join(core.config.root, path.slice(1)));
  }
  if (req.method === 'GET' && path === '/health') {
    return sendJson(res, 200, core.health());
  }

  if ((path === '/capabilities' || path.startsWith('/v1/')) && !authorized(req, core.config.token)) {
    return sendJson(res, 401, {
      ok: false,
      error_code: 'unauthorized',
      message: 'Bearer token required.',
      stage: 'auth',
      correlation_id: req.headers['x-correlation-id'] || null
    });
  }

  if (req.method === 'GET' && (path === '/capabilities' || path === '/v1/capabilities')) return sendJson(res, 200, core.capabilities());
  if (req.method === 'GET' && path === '/v1/telemetry') return sendJson(res, 200, core.telemetry());
  if (req.method === 'POST' && path === '/v1/telemetry/ping') return sendJson(res, 200, { ok: true, received_at: new Date().toISOString() });
  if (req.method === 'GET' && path === '/v1/summary') return sendJson(res, 200, core.summary());
  if (req.method === 'GET' && path === '/v1/items') return sendJson(res, 200, core.listItems({ q: url.searchParams.get('q') || '', limit: Number(url.searchParams.get('limit') || 100) }));
  if (req.method === 'GET' && path.startsWith('/v1/items/')) return sendJson(res, 200, core.getItem(path.split('/').pop()));
  if (req.method === 'GET' && path === '/v1/search') return sendJson(res, 200, core.search(url.searchParams.get('q') || ''));
  if (req.method === 'GET' && path === '/v1/import-batches') return sendJson(res, 200, core.importBatches());
  if (req.method === 'GET' && path === '/v1/fixtures/demo-catalog-100') {
    return sendJson(res, 200, core.demoCatalogRecords({
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/fixtures/demo-catalog-100/import') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, body.dry_run || body.dryRun ? 'supplier:draft' : 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.importDemoCatalog({
      limit: Number(body.limit || 100),
      actor: body.actor || 'api_client',
      dryRun: Boolean(body.dry_run || body.dryRun)
    }));
  }
  if (req.method === 'POST' && path === '/v1/import-batches') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, body.dry_run || body.dryRun ? 'supplier:draft' : 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.importRecords(body.records || [], {
      source: body.source || 'api',
      actor: body.actor || 'api_client',
      dryRun: Boolean(body.dry_run || body.dryRun),
      mappingId: body.mapping_id || body.mappingId || '',
      mapping: body.mapping || null
    }));
  }
  if (req.method === 'GET' && path === '/v1/import-mappings') return sendJson(res, 200, core.importMappings());
  if (req.method === 'POST' && path === '/v1/import-mappings') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.saveImportMapping(body));
  }
  if (req.method === 'POST' && path === '/v1/import-mappings/preview') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'supplier:draft', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.previewImportMapping({
      records: body.records || [],
      mappingId: body.mapping_id || body.mappingId || '',
      mapping: body.mapping || null,
      source: body.source || 'mapping-preview'
    }));
  }
  if (req.method === 'GET' && path === '/v1/digital-products') {
    return sendJson(res, 200, core.digitalProducts({
      sku: url.searchParams.get('sku') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'GET' && path === '/v1/mdm/duplicates') {
    return sendJson(res, 200, core.duplicateQueue({
      status: url.searchParams.get('status') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/mdm/detect-duplicates') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'quality:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.detectDuplicates({
      threshold: body.threshold || 0.82,
      actor: body.actor || 'api_client'
    }));
  }
  if (req.method === 'POST' && path === '/v1/mdm/merge') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'quality:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.mergeDuplicate({
      candidate_id: body.candidate_id || body.candidateId || '',
      winner_sku: body.winner_sku || body.winnerSku || '',
      merged_sku: body.merged_sku || body.mergedSku || '',
      survivorship: body.survivorship || {},
      actor: body.actor || 'api_client'
    }));
  }
  if (req.method === 'GET' && path === '/v1/inventory/positions') return sendJson(res, 200, core.inventory({ sku: url.searchParams.get('sku') || '', limit: Number(url.searchParams.get('limit') || 100) }));
  if (req.method === 'GET' && path === '/v1/forecasts/runs') return sendJson(res, 200, { ok: true, forecast_runs: core.store.listForecastRuns() });
  if (req.method === 'POST' && path === '/v1/forecasts/runs') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'forecast:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.runForecast(body));
  }
  if (req.method === 'POST' && path === '/v1/forecasts/scenarios') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'forecast:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.runForecast({ ...body, dryRun: true }));
  }
  if (req.method === 'POST' && path === '/v1/forecasts/actuals') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'forecast:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.importForecastActuals({
      records: body.records || [],
      actor: body.actor || 'api_client'
    }));
  }
  if (req.method === 'GET' && path === '/v1/forecasts/quality') {
    return sendJson(res, 200, core.forecastQuality({
      sku: url.searchParams.get('sku') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'GET' && path === '/v1/roles') return sendJson(res, 200, core.roles());
  if (req.method === 'GET' && path === '/v1/identities') return sendJson(res, 200, core.identities());
  if (req.method === 'GET' && path === '/v1/permissions') return sendJson(res, 200, core.permissions());
  if (req.method === 'GET' && path === '/v1/audit-events') return sendJson(res, 200, core.auditEvents({ limit: Number(url.searchParams.get('limit') || 100) }));
  if (req.method === 'GET' && path === '/v1/kanban-board') return sendJson(res, 200, core.kanbanBoard());
  if (req.method === 'GET' && path === '/v1/hapa-cards') {
    return sendJson(res, 200, core.hapaCards({
      kind: url.searchParams.get('kind') || '',
      status: url.searchParams.get('status') || '',
      q: url.searchParams.get('q') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/hapa-cards') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createHapaCard(body));
  }
  if (req.method === 'GET' && path === '/v1/hapa-card-placements') {
    return sendJson(res, 200, core.cardPlacements({
      card_id: url.searchParams.get('card_id') || '',
      placement_type: url.searchParams.get('placement_type') || '',
      target_type: url.searchParams.get('target_type') || '',
      target_id: url.searchParams.get('target_id') || '',
      active: url.searchParams.get('active') ?? null,
      limit: Number(url.searchParams.get('limit') || 200)
    }));
  }
  if (req.method === 'POST' && path === '/v1/hapa-card-placements') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.placeHapaCard(body));
  }
  if (req.method === 'GET' && path === '/v1/hapa-processes') {
    return sendJson(res, 200, core.hapaProcesses({
      enabled: url.searchParams.get('enabled') ?? null,
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/hapa-processes') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.saveHapaProcess(body));
  }
  if (req.method === 'POST' && path === '/v1/hapa-processes/run-due') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.runDueHapaProcesses({
      actor: body.actor || 'api_client',
      force: Boolean(body.force)
    }));
  }
  if (req.method === 'GET' && path === '/v1/hapa-decision-context') {
    return sendJson(res, 200, core.decisionContext({
      process_key: url.searchParams.get('process_key') || '',
      subject_type: url.searchParams.get('subject_type') || '',
      subject_id: url.searchParams.get('subject_id') || '',
      role_id: url.searchParams.get('role_id') || '',
      target_domain: url.searchParams.get('target_domain') || ''
    }));
  }
  if (req.method === 'POST' && path === '/v1/hapa-decisions/run') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.runHapaDecision(body));
  }
  if (req.method === 'GET' && path === '/v1/hapa-decisions/runs') {
    return sendJson(res, 200, core.hapaDecisionRuns({
      process_key: url.searchParams.get('process_key') || '',
      subject_id: url.searchParams.get('subject_id') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'GET' && path === '/v1/identifiers/resolve') {
    return sendJson(res, 200, core.resolveIdentifier({
      scheme: url.searchParams.get('scheme') || '',
      value: url.searchParams.get('value') || ''
    }));
  }
  if (req.method === 'GET' && path === '/v1/market/prices') {
    return sendJson(res, 200, core.marketPrices({
      sku: url.searchParams.get('sku') || '',
      asin: url.searchParams.get('asin') || '',
      price_type: url.searchParams.get('price_type') || '',
      limit: Number(url.searchParams.get('limit') || 500)
    }));
  }
  if (req.method === 'GET' && (path === '/v1/market/listing' || path === '/v1/market/listings')) {
    return sendJson(res, 200, core.marketListingData({
      sku: url.searchParams.get('sku') || '',
      asin: url.searchParams.get('asin') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/market/retrieve') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, await core.retrieveMarketPrices(body));
  }
  if (req.method === 'POST' && path === '/v1/market/amazon-listing/retrieve') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, await core.retrieveAmazonListing(body));
  }
  if (req.method === 'GET' && path === '/v1/connectors/contracts') return sendJson(res, 200, core.connectorContracts());
  if (req.method === 'POST' && path === '/v1/connectors/validate') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.validateConnectorContracts());
  }
  if (req.method === 'GET' && path === '/v1/performance/reports') {
    return sendJson(res, 200, core.performanceReports({ limit: Number(url.searchParams.get('limit') || 20) }));
  }
  if (req.method === 'POST' && path === '/v1/performance/reports') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.runPerformanceCheck({
      sku_target: body.sku_target || body.skuTarget || 100000,
      inventory_event_target: body.inventory_event_target || body.inventoryEventTarget || 1000000,
      measured_skus: body.measured_skus || body.measuredSkus || 1000,
      measured_inventory_events: body.measured_inventory_events || body.measuredInventoryEvents || 5000
    }));
  }
  if (req.method === 'GET' && path === '/v1/schema/migrations') return sendJson(res, 200, core.schemaMigrations({ limit: Number(url.searchParams.get('limit') || 50) }));
  if (req.method === 'POST' && path === '/v1/schema/migrations') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.applySchemaMigration({ ...body, actor: body.actor || 'api_client' }));
  }
  if (req.method === 'GET' && path === '/v1/import-review/rows') {
    return sendJson(res, 200, core.importReviewRows({
      batch_id: url.searchParams.get('batch_id') || '',
      status: url.searchParams.get('status') || '',
      limit: Number(url.searchParams.get('limit') || 200)
    }));
  }
  if (req.method === 'POST' && path === '/v1/import-review') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'supplier:draft', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createBulkImportReview({
      records: body.records || [],
      mappingId: body.mapping_id || body.mappingId || '',
      mapping: body.mapping || null,
      source: body.source || 'api-review',
      actor: body.actor || 'api_client'
    }));
  }
  if (req.method === 'POST' && path === '/v1/import-review/commit') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.commitImportReview({
      batch_id: body.batch_id || body.batchId || '',
      actor: body.actor || 'api_client'
    }));
  }
  if (req.method === 'GET' && path === '/v1/connectors/runs') {
    return sendJson(res, 200, core.connectorRuns({
      connector_id: url.searchParams.get('connector_id') || '',
      limit: Number(url.searchParams.get('limit') || 50)
    }));
  }
  if (req.method === 'POST' && path === '/v1/connectors/run') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.runConnectorAdapter({
      connector_id: body.connector_id || body.connectorId || '',
      mode: body.mode || (body.commit ? 'commit' : 'dry_run'),
      actor: body.actor || 'api_client'
    }));
  }
  if (req.method === 'GET' && path === '/v1/identity-sessions') {
    return sendJson(res, 200, core.identitySessions({
      identity_id: url.searchParams.get('identity_id') || '',
      status: url.searchParams.get('status') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/identity-sessions') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createIdentitySession(body));
  }
  if (req.method === 'POST' && path === '/v1/identity-sessions/rotate') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.rotateIdentitySession(body));
  }
  if (req.method === 'GET' && path === '/v1/forecasts/model-comparisons') {
    return sendJson(res, 200, core.forecastComparisons({
      sku: url.searchParams.get('sku') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/forecasts/model-comparisons') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'forecast:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.compareForecastModels(body));
  }
  if (req.method === 'GET' && path === '/v1/market/provider-runs') {
    return sendJson(res, 200, core.marketProviderRuns({
      provider: url.searchParams.get('provider') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/projections/sync') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.syncProjection(body));
  }
  if (req.method === 'GET' && path === '/v1/pricing/scenarios') {
    return sendJson(res, 200, core.pricingScenarios({
      sku: url.searchParams.get('sku') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/pricing/scenarios') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createPricingScenario(body));
  }
  if (req.method === 'GET' && path === '/v1/lifecycle/events') {
    return sendJson(res, 200, core.lifecycleEvents({
      sku: url.searchParams.get('sku') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/lifecycle/events') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.transitionLifecycle(body));
  }
  if (req.method === 'GET' && path === '/v1/publishing/runs') {
    return sendJson(res, 200, core.publishingRuns({
      channel: url.searchParams.get('channel') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/publishing/runs') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.runPublishing(body));
  }
  if (req.method === 'GET' && path === '/v1/telemetry/registrations') return sendJson(res, 200, core.telemetryRegistrations({ limit: Number(url.searchParams.get('limit') || 100) }));
  if (req.method === 'POST' && path === '/v1/telemetry/registrations') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.registerTelemetry(body));
  }
  if (req.method === 'GET' && path === '/v1/organizations') return sendJson(res, 200, core.organizations({ limit: Number(url.searchParams.get('limit') || 100) }));
  if (req.method === 'POST' && path === '/v1/organizations') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createOrganization(body));
  }
  if (req.method === 'GET' && path === '/v1/inventory/ledger') {
    return sendJson(res, 200, core.inventoryLedger({
      sku: url.searchParams.get('sku') || '',
      facility: url.searchParams.get('facility') || '',
      limit: Number(url.searchParams.get('limit') || 200)
    }));
  }
  if (req.method === 'POST' && path === '/v1/inventory/ledger') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'inventory:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.appendInventoryLedger(body));
  }
  if (req.method === 'GET' && path === '/v1/inventory/reconciliations') {
    return sendJson(res, 200, core.inventoryReconciliations({
      facility: url.searchParams.get('facility') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/inventory/reconciliations') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'inventory:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.reconcileInventory(body));
  }
  if (req.method === 'GET' && path === '/v1/quality/rules') return sendJson(res, 200, core.qualityRules({ limit: Number(url.searchParams.get('limit') || 100) }));
  if (req.method === 'POST' && path === '/v1/quality/rules') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'quality:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.saveQualityRule(body));
  }
  if (req.method === 'POST' && path === '/v1/quality/evaluate') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'quality:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.evaluateQualityRules(body));
  }
  if (req.method === 'GET' && path === '/v1/quality/work-orders') return sendJson(res, 200, core.qualityWorkOrders({ status: url.searchParams.get('status') || '', limit: Number(url.searchParams.get('limit') || 100) }));
  if (req.method === 'GET' && path === '/v1/desktop/packages') return sendJson(res, 200, core.desktopPackages({ limit: Number(url.searchParams.get('limit') || 100) }));
  if (req.method === 'POST' && path === '/v1/desktop/packages') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createDesktopPackage(body));
  }
  if (req.method === 'GET' && path === '/v1/lineage/exports') return sendJson(res, 200, core.lineageExports({ dataset: url.searchParams.get('dataset') || '', limit: Number(url.searchParams.get('limit') || 100) }));
  if (req.method === 'POST' && path === '/v1/lineage/exports') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createLineageExport(body));
  }
  if (req.method === 'GET' && path === '/v1/retention/policies') return sendJson(res, 200, core.retentionPolicies({ dataset: url.searchParams.get('dataset') || '', limit: Number(url.searchParams.get('limit') || 100) }));
  if (req.method === 'POST' && path === '/v1/retention/policies') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.saveRetentionPolicy(body));
  }
  if (req.method === 'GET' && path === '/v1/backups') return sendJson(res, 200, core.backupRuns({ limit: Number(url.searchParams.get('limit') || 100) }));
  if (req.method === 'POST' && path === '/v1/backups') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.runBackup(body));
  }
  if (req.method === 'GET' && path === '/v1/review/evidence-bundles') {
    return sendJson(res, 200, core.reviewEvidenceBundles({
      bundle_type: url.searchParams.get('bundle_type') || '',
      status: url.searchParams.get('status') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/review/evidence-bundles') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createReviewEvidenceBundle(body));
  }
  if (req.method === 'GET' && path === '/v1/events') {
    return sendJson(res, 200, core.eventEnvelopes({
      event_type: url.searchParams.get('event_type') || '',
      object_type: url.searchParams.get('object_type') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/events') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.appendEventEnvelope(body));
  }
  if (req.method === 'GET' && path === '/v1/projection-checkpoints') {
    return sendJson(res, 200, core.projectionCheckpoints({
      consumer: url.searchParams.get('consumer') || '',
      source: url.searchParams.get('source') || '',
      status: url.searchParams.get('status') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/projection-checkpoints') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.saveProjectionCheckpoint(body));
  }
  if (req.method === 'GET' && path === '/v1/credential-refs') {
    return sendJson(res, 200, core.credentialRefs({
      provider: url.searchParams.get('provider') || '',
      status: url.searchParams.get('status') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/credential-refs') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createCredentialRef(body));
  }
  if (req.method === 'GET' && path === '/v1/decision-review-queue') {
    return sendJson(res, 200, core.decisionQueueItems({
      status: url.searchParams.get('status') || '',
      process_key: url.searchParams.get('process_key') || '',
      severity: url.searchParams.get('severity') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/decision-review-queue') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createDecisionQueueItem(body));
  }
  if (req.method === 'POST' && path === '/v1/decision-review-queue/actions') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.reviewDecisionQueueAction(body));
  }
  if (req.method === 'GET' && path === '/v1/trust/attestations') {
    return sendJson(res, 200, core.trustAttestations({
      attestation_type: url.searchParams.get('attestation_type') || '',
      status: url.searchParams.get('status') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/trust/attestations') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createTrustAttestation(body));
  }
  if (req.method === 'GET' && path === '/v1/pilot/runbooks') {
    return sendJson(res, 200, core.pilotRunbooks({
      status: url.searchParams.get('status') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/pilot/runbooks') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createPilotRunbook(body));
  }
  if (req.method === 'GET' && path === '/v1/release-gates/evaluations') {
    return sendJson(res, 200, core.releaseGateEvaluations({
      gate: url.searchParams.get('gate') || '',
      status: url.searchParams.get('status') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/release-gates/evaluations') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.evaluateReleaseGate(body));
  }
  if (req.method === 'GET' && path === '/v1/review/decision-records') {
    return sendJson(res, 200, core.reviewDecisionRecords({
      record_type: url.searchParams.get('record_type') || '',
      status: url.searchParams.get('status') || '',
      owner: url.searchParams.get('owner') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/review/decision-records') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createReviewDecisionRecord(body));
  }
  if (req.method === 'GET' && path === '/v1/pilot/operations') {
    return sendJson(res, 200, core.pilotOperationRecords({
      operation_type: url.searchParams.get('operation_type') || '',
      status: url.searchParams.get('status') || '',
      tenant_id: url.searchParams.get('tenant_id') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/pilot/operations') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createPilotOperationRecord(body));
  }
  if (req.method === 'GET' && path === '/v1/platform/hardening') {
    return sendJson(res, 200, core.platformHardeningRecords({
      check_type: url.searchParams.get('check_type') || '',
      status: url.searchParams.get('status') || '',
      target: url.searchParams.get('target') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/platform/hardening') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createPlatformHardeningRecord(body));
  }
  if (req.method === 'GET' && path === '/v1/agent-governance/records') {
    return sendJson(res, 200, core.agentGovernanceRecords({
      governance_type: url.searchParams.get('governance_type') || '',
      status: url.searchParams.get('status') || '',
      process_key: url.searchParams.get('process_key') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/agent-governance/records') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createAgentGovernanceRecord(body));
  }
  if (req.method === 'GET' && path === '/v1/commercial/readiness') {
    return sendJson(res, 200, core.commercialReadinessRecords({
      record_type: url.searchParams.get('record_type') || '',
      status: url.searchParams.get('status') || '',
      audience: url.searchParams.get('audience') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/commercial/readiness') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.createCommercialReadinessRecord(body));
  }
  if (req.method === 'GET' && path === '/v1/next-cycle/artifacts') {
    return sendJson(res, 200, core.nextCycleArtifacts({
      phase: url.searchParams.get('phase') || '',
      artifact_type: url.searchParams.get('artifact_type') || '',
      status: url.searchParams.get('status') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'GET' && path === '/v1/next-cycle/test-runs') {
    return sendJson(res, 200, core.nextCycleTestRuns({
      test_type: url.searchParams.get('test_type') || '',
      status: url.searchParams.get('status') || '',
      limit: Number(url.searchParams.get('limit') || 100)
    }));
  }
  if (req.method === 'POST' && path === '/v1/next-cycle/run') {
    const body = await parseBody(req);
    const authz = await enforceScope(req, res, core, 'catalog:write', body);
    if (!authz) return undefined;
    return sendJson(res, 200, core.runNextCycle({
      phase: body.phase || 'all',
      actor: body.actor || 'api_client'
    }));
  }
  if (req.method === 'GET' && path === '/v1/ops') return sendJson(res, 200, core.opsOverview());
  if (req.method === 'GET' && path === '/v1/projections') return sendJson(res, 200, core.projections());
  if (req.method === 'GET' && path === '/v1/docs') return sendJson(res, 200, core.docs());

  return sendJson(res, 404, {
    ok: false,
    error_code: 'not_found',
    message: `No route for ${req.method} ${path}`,
    stage: 'routing',
    correlation_id: req.headers['x-correlation-id'] || null
  });
}

function authorized(req, token) {
  const header = req.headers.authorization || '';
  return header === `Bearer ${token}`;
}

async function enforceScope(req, res, core, scope, body = {}) {
  const identity = identityFrom(req, body);
  const authz = core.authorize(identity, scope);
  if (authz.ok) return authz;
  core.store.audit({
    actor: identity,
    action: 'auth.denied',
    objectType: 'route',
    objectId: `${req.method} ${req.url}`,
    summary: `Denied ${identity} for ${scope}.`,
    payload: {
      method: req.method,
      path: req.url,
      scope,
      message: authz.message
    }
  });
  sendJson(res, 403, {
    ok: false,
    error_code: authz.error_code || 'forbidden',
    message: authz.message || `${identity} lacks ${scope}`,
    stage: 'authz',
    identity,
    scope,
    correlation_id: req.headers['x-correlation-id'] || null
  });
  return null;
}

function identityFrom(req, body = {}) {
  return String(
    req.headers['x-hapa-identity']
      || body.identity
      || 'local_operator'
  ).trim() || 'local_operator';
}

function serveFile(res, filePath) {
  if (!existsSync(filePath)) {
    return sendJson(res, 404, { ok: false, error_code: 'file_not_found', message: filePath });
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { url } = await startServer();
  console.log(JSON.stringify({ ok: true, url }, null, 2));
}
