import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCore } from '../src/catalog-core.mjs';
import { parseAmazonListingHtml, parseCamelCamelCamelHtml } from '../src/market-price.mjs';

function makeCore() {
  const temp = mkdtempSync(join(tmpdir(), 'hapa-catalog-core-'));
  const boardLogPath = join(temp, 'events.ndjson');
  writeFileSync(boardLogPath, sampleBoardLog());
  return createCore({
    root: process.cwd(),
    dataDir: temp,
    artifactDir: join(temp, 'artifacts'),
    token: 'test-token',
    boardLogPath
  });
}

function sampleBoardLog() {
  return [
    {
      project_id: 'hapa-app-hapa-catalog-node',
      id: 'created-1',
      ts: '2026-06-05T21:00:00.000Z',
      actor: 'Test',
      type: 'task_created',
      task_id: 'HCAT-001',
      links: [],
      payload: {
        taskId: 'HCAT-001',
        title: 'Wire board view',
        description: 'Expose board state in the app.',
        column: 'ready',
        lane: 'Web',
        owner: 'Blue',
        priority: 'P0',
        tags: ['board'],
        requirements: ['HAPA-006'],
        acceptance: ['Board renders']
      }
    },
    {
      project_id: 'hapa-app-hapa-catalog-node',
      id: 'created-2',
      ts: '2026-06-05T21:01:00.000Z',
      actor: 'Test',
      type: 'task_created',
      task_id: 'HCAT-002',
      links: [],
      payload: {
        taskId: 'HCAT-002',
        title: 'Future connector',
        description: 'Connector backlog.',
        column: 'backlog',
        lane: 'Connectors',
        owner: 'Green',
        priority: 'P2',
        tags: ['future'],
        requirements: ['CONN-001'],
        acceptance: ['Deferred']
      }
    },
    {
      project_id: 'hapa-app-hapa-catalog-node',
      id: 'moved-1',
      ts: '2026-06-05T21:02:00.000Z',
      actor: 'Test',
      type: 'task_moved',
      task_id: 'HCAT-001',
      links: [],
      payload: {
        from: 'ready',
        to: 'done',
        reason: 'Verified in test.',
        evidence: ['Unit parser passed']
      }
    },
    {
      project_id: 'hapa-app-hapa-catalog-node',
      id: 'checkpoint-1',
      ts: '2026-06-05T21:03:00.000Z',
      actor: 'Test',
      type: 'checkpoint',
      task_id: null,
      links: [],
      payload: {
        title: 'Board checkpoint',
        summary: 'Parser fixture checkpoint.',
        verified: ['done card counted'],
        future_backlog: ['HCAT-002']
      }
    }
  ].map(event => JSON.stringify(event)).join('\n');
}

function sampleCamelHtml() {
  return `
    <html>
      <head><title>Garmin Approach R10 | Amazon price tracker</title></head>
      <body>
        <h1>Garmin Approach R10, Portable Golf Launch Monitor</h1>
        <p>ASIN: B095QX1FSR UPC: 075375927016 EAN: 0753759270162 PRODUCT GROUP: Sports CATEGORY: Golf Swing Trainers MANUFACTURER: Garmin MODEL: 010-02356-00</p>
        <table>
          <tr><th>Price Type</th><th>Lowest Ever</th><th>Highest Ever</th><th>Current +</th><th>Average</th></tr>
          <tr><td>Amazon</td><td>$399.99 (Mar 15, 2026)</td><td>$599.99 (Jun 01, 2024)</td><td>$468.95 (Jan 06, 2026)</td><td>$510.55</td></tr>
          <tr><td>3rd Party New</td><td>$410.00 (Jan 10, 2026)</td><td>$650.00 (May 01, 2024)</td><td>-</td><td>$544.20</td></tr>
          <tr><td>3rd Party Used</td><td>$320.00 (Feb 05, 2026)</td><td>$500.00 (Apr 02, 2024)</td><td>$350.00 (Mar 04, 2026)</td><td>$405.10</td></tr>
        </table>
        <script>
          window.__camel = {
            "price_amazon": [["2026-01-01T00:00:00.000Z", 468.95], ["2026-02-01T00:00:00.000Z", 399.99]],
            "price_new": [["2026-01-01T00:00:00.000Z", 455.00]],
            "price_used": [["2026-01-01T00:00:00.000Z", 350.00]]
          };
        </script>
      </body>
    </html>
  `;
}

function sampleAmazonHtml() {
  return `
    <html>
      <head>
        <link rel="canonical" href="https://www.amazon.com/Garmin-Approach-Portable-Monitor-Indoors/dp/B095QX1FSR">
        <meta property="og:image" content="https://m.media-amazon.com/images/I/31R1XdujCjS._AC_.jpg">
      </head>
      <body>
        <h1 id="pqv-title">Product Summary: Garmin Approach R10, Portable Golf Launch Monitor, Take Your Game Home, Indoors or to The Driving Range, Up to 10 Hours Battery Life - 010-02356-00</h1>
        <p id="pqv-byline">From Garmin</p>
        <p id="pqv-ratings">4.2 out of 5 stars, 1,112 ratings</p>
        <p id="pqv-bought-in-last-month">1K+ bought in past month</p>
        <div class="a-section a-spacing-medium">
          <h2 id="pqv-price">Price</h2>
          <p><span class="a-text-bold">One-time purchase: $399.98</span> 33% Savings</p>
          <p id="pqv-price-list-price">List Price: <span>$599.99</span></p>
        </div>
        <div id="pqv-feature-bullets">
          <ul>
            <li><span>Track key metrics when paired with a compatible smartphone.</span></li>
            <li><span>Enjoy more time on the range with up to 10 hours of battery life.</span></li>
          </ul>
        </div>
        <div id="pqv-description"><h2>Product Description</h2><div>Get more from your game with the Approach R10 portable launch monitor.</div></div>
        <div id="pqv-options-available"><h2>Options Available</h2><h3>Style</h3><ul><li><span>Golf Launch Monitor</span></li></ul></div>
        <div id="pqv-documents"><a href="https://m.media-amazon.com/images/I/B172-Jc1w0L.pdf?ref=dp_product_quick_view">User Manual (PDF)</a></div>
        <img id="landingImage"
          alt="Garmin Approach R10, Portable Golf Launch Monitor"
          src="https://m.media-amazon.com/images/I/61POLvv99xS._AC_SY300_SX300_QL70_ML2_.jpg"
          data-old-hires="https://m.media-amazon.com/images/I/61POLvv99xS._AC_SL1500_.jpg"
          data-a-dynamic-image="{&quot;https://m.media-amazon.com/images/I/61POLvv99xS._AC_SX342_.jpg&quot;:[342,342]}">
        <script>
          var data = {
            'asin': 'B095QX1FSR',
            'colorImages': { 'initial': [
              {"hiRes":"https://m.media-amazon.com/images/I/61POLvv99xS._AC_SL1500_.jpg","thumb":"https://m.media-amazon.com/images/I/31R1XdujCjS._AC_SR38,50_.jpg","large":"https://m.media-amazon.com/images/I/31R1XdujCjS._AC_.jpg","main":{"https://m.media-amazon.com/images/I/61POLvv99xS._AC_SX679_.jpg":[679,679]},"variant":"MAIN"}
            ] }
          };
        </script>
        <img alt="Garmin Approach R10" data-src="https://m.media-amazon.com/images/S/aplus-media-library-service-media/example.__CR0,0,2928,1200_PT0_SX1464_V1___.jpg">
      </body>
    </html>
  `;
}

test('imports sample catalog into a typed item master', () => {
  const core = makeCore();
  try {
    const result = core.importFile('data/fixtures/sample_catalog.csv', { actor: 'test' });
    assert.equal(result.ok, true);
    assert.equal(result.totals.valid, 3);

    const items = core.listItems().items;
    assert.equal(items.length, 3);
    assert.equal(items[0].product_id.startsWith('PG-'), true);

    const item = core.getItem('ALPHA-RING-9').item;
    assert.equal(item.sku, 'ALPHA-RING-9');
    assert.equal(item.packaging.length, 1);
    assert.equal(item.inventory.length, 1);
    assert.equal(item.identifiers.gtin, '0001112223331');
  } finally {
    core.close();
  }
});

test('reads and imports the 100 SKU demo catalog fixture', () => {
  const core = makeCore();
  try {
    const fixture = core.demoCatalogRecords();
    assert.equal(fixture.ok, true);
    assert.equal(fixture.count, 100);
    assert.equal(fixture.schema.includes('sku'), true);

    const imported = core.importDemoCatalog({ actor: 'test' });
    assert.equal(imported.ok, true);
    assert.equal(imported.totals.valid, 100);
    assert.equal(imported.fixture.count, 100);
    assert.equal(core.listItems({ limit: 150 }).items.length, 100);

    const item = core.getItem('DEMO-WEAR-001').item;
    assert.equal(item.brand, 'Hapa Forge');
    assert.equal(item.inventory.length, 1);
  } finally {
    core.close();
  }
});

test('dry-run import records validation without committing items', () => {
  const core = makeCore();
  try {
    const result = core.importRecords([{ sku: '', name: 'No SKU' }], { source: 'bad-file', dryRun: true });
    assert.equal(result.ok, false);
    assert.equal(result.errors.length, 1);
    assert.equal(core.listItems().items.length, 0);
  } finally {
    core.close();
  }
});

test('runs explainable demand forecast and stores audit evidence', () => {
  const core = makeCore();
  try {
    core.importFile('data/fixtures/sample_catalog.csv', { actor: 'test' });
    const forecast = core.runForecast({ sku: 'ALPHA-RING-9', location: 'main-bin', actor: 'test' });
    assert.equal(forecast.ok, true);
    assert.equal(forecast.run.sku, 'ALPHA-RING-9');
    assert.equal(forecast.run.series.length, 1);
    assert.equal(forecast.run.explanation.model, 'hapa-deterministic-baseline-v2');
    assert.ok(forecast.run.explanation.top_drivers.some(driver => driver.driver === 'seasonality_factor'));
    assert.ok(forecast.run.explanation.confidence > 0);

    const audit = core.auditEvents().audit_events;
    assert.ok(audit.some(event => event.action === 'forecast.run'));
  } finally {
    core.close();
  }
});

test('drains post-MVP operations scaffolds through the core API', () => {
  const core = makeCore();
  try {
    core.importFile('data/fixtures/sample_catalog.csv', { actor: 'test' });

    assert.equal(core.applySchemaMigration({ version: 'core-ops-v1', actor: 'test' }).ok, true);
    assert.equal(core.schemaMigrations().migrations.some(row => row.version === 'core-ops-v1'), true);

    const review = core.createBulkImportReview({
      source: 'core-review',
      actor: 'test',
      records: [{ sku: 'CORE-OPS-1', name: 'Core Ops Item', gtin: '7100000000001' }]
    });
    assert.equal(review.rows.length, 1);
    assert.equal(core.importReviewRows({ batch_id: review.batch.id }).rows.length, 1);

    const connector = core.runConnectorAdapter({ connector_id: 'connector-erp-plm', actor: 'test' });
    assert.equal(connector.ok, true);
    assert.equal(core.connectorRuns().runs.length >= 1, true);

    const session = core.createIdentitySession({ identity_id: 'local_operator', actor: 'test' });
    assert.equal(session.ok, true);
    assert.equal(core.rotateIdentitySession({ session_id: session.session.id, actor: 'test' }).session.status, 'active');

    const comparison = core.compareForecastModels({ sku: 'ALPHA-RING-9', actor: 'test' });
    assert.equal(comparison.ok, true);
    assert.equal(core.forecastComparisons({ sku: 'ALPHA-RING-9' }).comparisons.length, 1);

    const projection = core.syncProjection({ target: 'hapa-lance-node', actor: 'test' });
    assert.equal(projection.exports.length, 3);

    const pricing = core.createPricingScenario({ sku: 'ALPHA-RING-9', actor: 'test' });
    assert.equal(pricing.scenario.sku, 'ALPHA-RING-9');

    const lifecycle = core.transitionLifecycle({ sku: 'ALPHA-RING-9', to_state: 'published', actor: 'test' });
    assert.equal(lifecycle.event.to_state, 'published');

    const publishing = core.runPublishing({ channel: 'storefront', actor: 'test' });
    assert.equal(publishing.run.channel, 'storefront');

    assert.equal(core.registerTelemetry({ endpoint: 'hapa-telemetry-node://core-test', actor: 'test' }).registration.status, 'registered');
    assert.equal(core.createOrganization({ name: 'Core Ops Org', identity_id: 'local_operator', actor: 'test' }).ok, true);

    const ledger = core.appendInventoryLedger({
      sku: 'ALPHA-RING-9',
      facility: 'main',
      location: 'main-bin',
      quantity: 2,
      actor: 'test'
    });
    assert.equal(ledger.event.sku, 'ALPHA-RING-9');
    assert.equal(core.reconcileInventory({ facility: 'main', actor: 'test' }).ok, true);

    assert.equal(core.qualityRules().rules.length >= 2, true);
    assert.equal(core.evaluateQualityRules({ actor: 'test' }).ok, true);

    assert.equal(core.createDesktopPackage({ platform: 'core-desktop', actor: 'test' }).package.platform, 'core-desktop');
    assert.equal(core.createLineageExport({ dataset: 'catalog_items', actor: 'test' }).export.dataset, 'catalog_items');
    assert.equal(core.retentionPolicies().policies.length >= 2, true);
    assert.equal(core.runBackup({ actor: 'test' }).backup.status, 'completed');

    const ops = core.opsOverview();
    assert.equal(ops.ok, true);
    assert.equal(ops.summary.connector_runs >= 1, true);
    assert.equal(ops.summary.backup_runs >= 1, true);
  } finally {
    core.close();
  }
});

test('exposes governance roles and Hapa capabilities', () => {
  const core = makeCore();
  try {
    const roles = core.roles().roles;
    assert.ok(roles.some(role => role.id === 'supplier_contributor'));
    assert.ok(roles.some(role => role.id === 'demand_planner'));
    const capabilities = core.capabilities();
    assert.equal(capabilities.node_id, 'hapa-catalog-node');
    assert.equal(capabilities.parity.web, true);
    assert.equal(capabilities.parity.desktop, true);
  } finally {
    core.close();
  }
});

test('reconstructs Hapa Kanban board columns from append-only events', () => {
  const core = makeCore();
  try {
    const board = core.kanbanBoard().board;
    assert.equal(board.available, true);
    assert.equal(board.summary.total_tasks, 2);
    assert.equal(board.summary.done, 1);
    assert.equal(board.summary.future_backlog, 1);
    assert.equal(board.columns.find(column => column.id === 'done').tasks[0].id, 'HCAT-001');
    assert.equal(board.checkpoints[0].title, 'Board checkpoint');
  } finally {
    core.close();
  }
});

test('parses CamelCamelCamel identifiers and price history scaffold', () => {
  const parsed = parseCamelCamelCamelHtml(sampleCamelHtml(), 'https://camelcamelcamel.com/product/B095QX1FSR');
  assert.equal(parsed.identifiers.asin, 'B095QX1FSR');
  assert.equal(parsed.identifiers.upc, '075375927016');
  assert.equal(parsed.identifiers.ean, '0753759270162');
  assert.equal(parsed.identifiers.model, '010-02356-00');
  assert.equal(parsed.history.amazon.length, 2);
  assert.equal(parsed.history.new.length, 1);
  assert.equal(parsed.history.used.length, 1);
});

test('parses Amazon listing data and product media scaffold', () => {
  const parsed = parseAmazonListingHtml(sampleAmazonHtml(), 'https://www.amazon.com/dp/B095QX1FSR');
  assert.equal(parsed.asin, 'B095QX1FSR');
  assert.equal(parsed.title.startsWith('Garmin Approach R10'), true);
  assert.equal(parsed.brand, 'Garmin');
  assert.equal(parsed.rating, 4.2);
  assert.equal(parsed.review_count, 1112);
  assert.equal(parsed.price, 399.98);
  assert.equal(parsed.list_price, 599.99);
  assert.equal(parsed.feature_bullets.length, 2);
  assert.equal(parsed.documents.length, 1);
  assert.ok(parsed.media.length >= 4);
  assert.equal(parsed.identifiers.model, '010-02356-00');
});

test('retrieves market price scaffold and appends Amazon/New/Used points', async () => {
  const core = makeCore();
  try {
    const result = await core.retrieveMarketPrices({
      url: 'https://camelcamelcamel.com/product/B095QX1FSR?active=price_amazon&context=popular&cpf=amazon-new-used',
      html: sampleCamelHtml(),
      actor: 'test'
    });
    assert.equal(result.ok, true);
    assert.equal(result.item.sku, 'B095QX1FSR');
    assert.equal(result.inserted_points, 4);

    const resolved = core.resolveIdentifier({ scheme: 'upc', value: '075375927016' });
    assert.equal(resolved.found, true);
    assert.equal(resolved.item.sku, 'B095QX1FSR');

    const market = core.marketPrices({ sku: 'B095QX1FSR' });
    assert.equal(market.points.length, 4);
    assert.ok(market.summary.some(row => row.price_type === 'amazon' && row.points === 2));
  } finally {
    core.close();
  }
});

test('retrieves Amazon listing by UPC and appends media assets', async () => {
  const core = makeCore();
  try {
    await core.retrieveMarketPrices({
      url: 'https://camelcamelcamel.com/product/B095QX1FSR?active=price_amazon&context=popular&cpf=amazon-new-used',
      html: sampleCamelHtml(),
      actor: 'test'
    });
    const result = await core.retrieveAmazonListing({
      upc: '075375927016',
      html: sampleAmazonHtml(),
      actor: 'test'
    });
    assert.equal(result.ok, true);
    assert.equal(result.item.sku, 'B095QX1FSR');
    assert.equal(result.listing_snapshot.brand, 'Garmin');
    assert.ok(result.inserted_media >= 5);

    const listing = core.marketListingData({ sku: 'B095QX1FSR' });
    assert.equal(listing.listings.length, 1);
    assert.ok(listing.media.some(asset => asset.media_type === 'document'));

    const item = core.getItem('B095QX1FSR').item;
    assert.ok(item.market_listing.media.length >= 5);
    assert.equal(item.product_attributes.amazon_listing.rating, 4.2);
  } finally {
    core.close();
  }
});

test('saves source mappings, previews conversions, and imports mapped records', () => {
  const core = makeCore();
  try {
    const mapping = core.saveImportMapping({
      id: 'mapping-supplier-feed',
      name: 'Supplier feed mapping',
      source_type: 'supplier_portal',
      field_map: {
        sku: 'supplier_item',
        name: 'description',
        brand: 'brand_name',
        category: 'dept',
        gtin: 'barcode',
        supplier: 'supplier_name',
        pack_level: 'uom',
        units_per_pack: 'case_qty',
        weight: 'weight_oz'
      },
      defaults: { facility: 'mapped-main', location: 'mapped-bin', on_hand: 7 },
      conversions: { weight: { from: 'oz', to: 'lb', factor: 0.0625 } },
      actor: 'test'
    });
    assert.equal(mapping.ok, true);

    const records = [{
      supplier_item: 'MAP-ALPHA-1',
      description: 'Mapped Alpha Item',
      brand_name: 'Mapped Brand',
      dept: 'mapped',
      barcode: '123456789012',
      supplier_name: 'Mapped Supplier',
      uom: 'case',
      case_qty: '6',
      weight_oz: '32'
    }];
    const preview = core.previewImportMapping({ records, mappingId: 'mapping-supplier-feed' });
    assert.equal(preview.ok, true);
    assert.equal(preview.preview[0].weight, 2);
    assert.equal(preview.preview[0].weight_unit, 'lb');
    assert.ok(preview.cells.some(cell => cell.target === 'sku' && cell.mapped === 'MAP-ALPHA-1'));

    const imported = core.importRecords(records, { source: 'supplier-feed', mappingId: 'mapping-supplier-feed', actor: 'test' });
    assert.equal(imported.ok, true);
    assert.equal(core.getItem('MAP-ALPHA-1').item.packaging[0].weight, 2);
  } finally {
    core.close();
  }
});

test('tracks digital product objects in the item master', () => {
  const core = makeCore();
  try {
    const imported = core.importRecords([{
      sku: 'DIGI-COURSE-1',
      name: 'Digital Training Course',
      brand: 'Hapa Learning',
      category: 'training',
      gtin: '5000000000001',
      supplier: 'Digital Supplier',
      digital: 'true',
      version: '2026.1',
      file_ref: 's3://catalog/course.zip',
      download_url: 'https://example.test/course.zip',
      license: 'seat',
      entitlement: 'subscriber',
      rights_usage: 'internal',
      seats: '25',
      file_format: 'zip'
    }], { source: 'digital-test', actor: 'test' });
    assert.equal(imported.ok, true);
    const digital = core.digitalProducts({ sku: 'DIGI-COURSE-1' }).digital_products;
    assert.equal(digital.length, 1);
    assert.equal(digital[0].version, '2026.1');
    assert.equal(core.getItem('DIGI-COURSE-1').item.digital_product.license, 'seat');
  } finally {
    core.close();
  }
});

test('detects duplicate candidates and records merge survivorship', () => {
  const core = makeCore();
  try {
    core.importRecords([
      { sku: 'DUP-ALPHA-1', name: 'Alpha Watch Black', brand: 'Northstar', category: 'wearables', gtin: '7000000000001', supplier: 'A' },
      { sku: 'DUP-ALPHA-2', name: 'Alpha Watch Black', brand: 'Northstar', category: 'wearables', gtin: '7000000000001', supplier: 'B' }
    ], { source: 'dup-test', actor: 'test' });
    const detected = core.detectDuplicates({ threshold: 0.5, actor: 'test' });
    assert.equal(detected.ok, true);
    assert.equal(detected.candidates.length, 1);
    assert.ok(detected.candidates[0].reasons.includes('same_gtin'));

    const merged = core.mergeDuplicate({
      candidate_id: detected.candidates[0].id,
      winner_sku: 'DUP-ALPHA-1',
      merged_sku: 'DUP-ALPHA-2',
      survivorship: { identifiers: 'winner', content: 'winner', inventory: 'winner' },
      actor: 'test'
    });
    assert.equal(merged.ok, true);
    assert.equal(core.getItem('DUP-ALPHA-2').item.status, 'merged');
    assert.equal(core.duplicateQueue().merge_events.length, 1);
  } finally {
    core.close();
  }
});

test('imports forecast actuals and creates quality remediation events', () => {
  const core = makeCore();
  try {
    core.importFile('data/fixtures/sample_catalog.csv', { actor: 'test' });
    const forecast = core.runForecast({ sku: 'ALPHA-RING-9', location: 'main-bin', actor: 'test' });
    const actuals = core.importForecastActuals({
      records: [{
        sku: 'ALPHA-RING-9',
        location: 'main-bin',
        channel: 'default',
        bucket_start: forecast.run.series[0].bucket_start,
        bucket_end: forecast.run.series[0].bucket_end,
        actual: forecast.run.series[0].adjusted + 5,
        stockout_days: 1
      }],
      actor: 'test'
    });
    assert.equal(actuals.ok, true);
    assert.equal(actuals.quality_events.length, 1);
    assert.match(actuals.quality_events[0].remediation, /stockout/i);
    const quality = core.forecastQuality({ sku: 'ALPHA-RING-9' });
    assert.equal(quality.actuals.length, 1);
    assert.equal(quality.quality_events.length, 1);
  } finally {
    core.close();
  }
});

test('builds forecast dashboard overrides supply and experimentation contracts', () => {
  const core = makeCore();
  try {
    core.importDemoCatalog({ limit: 100, actor: 'test' });
    const dashboard = core.forecastDashboard({
      granularity: 'category',
      increment: 'weeks',
      sort_by: 'supply_time_units'
    });
    assert.equal(dashboard.ok, true);
    assert.equal(dashboard.table.buckets.length, 12);
    assert.equal(dashboard.table.buckets.filter(bucket => bucket.kind === 'actual').length, 6);
    assert.equal(dashboard.table.buckets.filter(bucket => bucket.kind === 'forecast').length, 6);
    assert.ok(dashboard.table.rows.length >= 8);
    assert.ok(dashboard.graph.series.some(point => point.inventory_on_hand >= 0));
    assert.ok(dashboard.purchase_orders.length >= 40);
    assert.ok(dashboard.subscriber_payload.rows[0].buckets.some(bucket => bucket.effective));

    const row = dashboard.table.rows[0];
    const bucket = row.buckets.find(item => item.kind === 'forecast');
    const override = core.createForecastOverride({
      scope_level: row.level,
      scope_key: row.key,
      bucket_start: bucket.bucket_start,
      bucket_end: bucket.bucket_end,
      field: 'projected_units',
      value: 77,
      reason_code: 'test_override',
      rationale: 'Testing override rationale capture.',
      actor: 'test'
    });
    assert.equal(override.ok, true);
    assert.equal(override.override.reason_code, 'test_override');

    const adjusted = core.forecastDashboard({ granularity: row.level, increment: 'weeks' });
    const adjustedBucket = adjusted.table.rows.find(item => item.key === row.key).buckets.find(item => item.bucket_start === bucket.bucket_start);
    assert.equal(adjustedBucket.effective.projected_units, 77);
    assert.equal(adjustedBucket.overrides.length, 1);

    const assumptions = core.forecastAssumptionSets();
    assert.ok(assumptions.assumption_sets.some(set => set.id === 'assume-promo-lift'));
    const custom = core.saveForecastAssumptionSet({
      id: 'assume-test-launch',
      name: 'Test Launch',
      assumptions: { launch_ramp: 0.2, seasonality_factor: 1.1 },
      actor: 'test'
    });
    assert.equal(custom.assumption_set.id, 'assume-test-launch');

    const purchaseOrder = core.saveForecastPurchaseOrder({
      sku: 'DEMO-WEAR-001',
      units: 44,
      expected_delivery_date: '2026-06-28T00:00:00.000Z',
      actor: 'test'
    });
    assert.equal(purchaseOrder.ok, true);
    assert.equal(purchaseOrder.purchase_order.units, 44);

    const experiment = core.runForecastExperiment({ sku: 'DEMO-WEAR-001', actor: 'test' });
    assert.equal(experiment.ok, true);
    assert.equal(experiment.runs.length, 4);
    assert.equal(experiment.comparison.models.length, 4);
    assert.ok(experiment.branches.length >= 3);

    const compare = core.compareForecastRuns({ run_ids: experiment.runs.slice(0, 2).map(run => run.id), actor: 'test' });
    assert.equal(compare.ok, true);
    assert.equal(compare.rows.length, 2);
    assert.ok(compare.diffs[1].metric_effects.delta_percent !== undefined);

    const plan = core.promoteForecastPlan({
      run_id: experiment.runs[0].id,
      rationale: 'Testing plan-of-record promotion.',
      actor: 'test'
    });
    assert.equal(plan.ok, true);
    assert.equal(plan.plan_record.status, 'active');
    assert.ok(plan.decision.result.routed_cards.length >= 1);

    const payload = core.forecastSubscriberPayload({ sku: 'DEMO-WEAR-001' });
    assert.equal(payload.ok, true);
    assert.equal(payload.payload.contract, 'forecast-effective-supply-subscriber-v1');
    assert.ok(payload.payload.plan_records.length >= 1);
  } finally {
    core.close();
  }
});

test('validates connector contracts, performance target evidence, and scoped authorization', () => {
  const core = makeCore();
  try {
    const contracts = core.connectorContracts();
    assert.equal(contracts.contracts.length >= 7, true);
    const validation = core.validateConnectorContracts();
    assert.equal(validation.ok, true);

    const performance = core.runPerformanceCheck({ measured_skus: 25, measured_inventory_events: 250 });
    assert.equal(performance.ok, true);
    assert.equal(performance.report.sku_target, 100000);
    assert.equal(core.performanceReports().reports.length, 1);

    assert.equal(core.authorize('local_operator', 'catalog:write').ok, true);
    assert.equal(core.authorize('supplier_demo', 'supplier:draft').ok, true);
    assert.equal(core.authorize('supplier_demo', 'catalog:write').ok, false);
    assert.equal(core.authorize('read_only_viewer', 'forecast:write').ok, false);
  } finally {
    core.close();
  }
});

test('routes Hapa cards into governance roles, SKU domains, and repeating process decisions', () => {
  const core = makeCore();
  try {
    const cards = core.hapaCards().cards;
    assert.ok(cards.some(card => card.id === 'card-avatar-inventory-governor'));
    assert.ok(cards.some(card => card.id === 'card-avatar-forecast-friend'));
    assert.ok(cards.some(card => card.id === 'card-protocol-source-truth'));

    const forecastContext = core.decisionContext({ process_key: 'forecast.cycle' });
    assert.equal(forecastContext.ok, true);
    assert.ok(forecastContext.cards.some(card => card.id === 'card-avatar-forecast-friend'));
    assert.ok(forecastContext.cards.some(card => card.id === 'card-protocol-source-truth'));
    assert.ok(forecastContext.context_bundle.required_reviews.length >= 1);

    const inventoryContext = core.decisionContext({ process_key: 'inventory.instock.cycle' });
    assert.ok(inventoryContext.cards.some(card => card.id === 'card-avatar-inventory-governor'));

    const created = core.createHapaCard({
      id: 'card-avatar-api-forecast-coach',
      card_kind: 'avatar',
      name: 'API Forecast Coach Avatar',
      owner_identity_id: 'local_operator',
      skills: ['forecast review', 'promotion planning'],
      context: { voice: 'Forecast coach context.', checks: ['actuals', 'uplift'] },
      tags: ['avatar', 'forecasting'],
      actor: 'test'
    });
    assert.equal(created.ok, true);

    const placed = core.placeHapaCard({
      card_id: 'card-avatar-api-forecast-coach',
      placement_type: 'catalog_domain',
      target_type: 'catalog_domain',
      target_id: 'forecasting',
      role: 'advisor',
      decision_mode: 'context',
      priority: 15,
      actor: 'test'
    });
    assert.equal(placed.ok, true);

    const decision = core.runHapaDecision({
      process_key: 'forecast.cycle',
      subject_type: 'sku',
      subject_id: 'B095QX1FSR',
      actor: 'test'
    });
    assert.equal(decision.ok, true);
    assert.ok(decision.result.routed_cards.some(card => card.card_id === 'card-avatar-api-forecast-coach'));
    assert.ok(decision.result.required_reviews.some(card => card.card_id === 'card-avatar-forecast-friend'));
    assert.equal(core.hapaDecisionRuns({ process_key: 'forecast.cycle' }).runs.length >= 1, true);

    const due = core.runDueHapaProcesses({ actor: 'test' });
    assert.equal(due.ok, true);
    assert.equal(due.ran >= 3, true);
  } finally {
    core.close();
  }
});

test('drains next-cycle phases into review, pilot, governance, intelligence, release, and test evidence', () => {
  const core = makeCore();
  try {
    const drained = core.runNextCycle({ phase: 'all', actor: 'test' });
    assert.equal(drained.ok, true);
    assert.deepEqual(drained.results.map(result => result.phase), ['review', 'connected', 'governance', 'intelligence', 'release']);
    assert.equal(drained.artifacts.length, 28);
    assert.equal(drained.test_runs.length, 5);

    const artifacts = core.nextCycleArtifacts().artifacts;
    const tests = core.nextCycleTestRuns().test_runs;
    assert.equal(artifacts.length, 28);
    assert.equal(tests.length, 5);
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-062')));
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-089')));
    assert.ok(tests.every(run => run.status === 'passed'));

    const connectorRuntime = artifacts.find(artifact => artifact.artifact_type === 'connector_plugin_runtime');
    assert.equal(connectorRuntime.payload.credential_policy.stores_plain_secret, false);
    assert.ok(connectorRuntime.payload.plugins.every(plugin => plugin.credential_ref.startsWith('credref://')));

    const e2ePlan = artifacts.find(artifact => artifact.artifact_type === 'web_desktop_e2e_tests');
    assert.equal(e2ePlan.payload.npm_script, 'web:e2e');

    const ops = core.opsOverview();
    assert.equal(ops.summary.next_cycle_artifacts, 28);
    assert.equal(ops.summary.next_cycle_test_runs, 5);
  } finally {
    core.close();
  }
});

test('drains continuation cycle into pilot operations and learning artifacts', () => {
  const core = makeCore();
  try {
    const drained = core.runNextCycle({ phase: 'continuation', actor: 'test' });
    assert.equal(drained.ok, true);
    assert.deepEqual(drained.results.map(result => result.phase), ['pilot_ops', 'agent_ops', 'compliance_admin', 'test_scale', 'pilot_learning']);
    assert.equal(drained.artifacts.length, 20);
    assert.equal(drained.test_runs.length, 5);

    const artifacts = core.nextCycleArtifacts().artifacts;
    const tests = core.nextCycleTestRuns().test_runs;
    assert.equal(artifacts.length, 20);
    assert.equal(tests.length, 5);
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-090')));
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-109')));

    const credentialHealth = artifacts.find(artifact => artifact.artifact_type === 'connector_credential_health');
    assert.ok(credentialHealth.payload.checks.every(check => check.stores_plain_secret === false));

    const policySimulation = artifacts.find(artifact => artifact.artifact_type === 'card_policy_simulation');
    assert.equal(policySimulation.payload.policy_effects.conflicts.length, 0);

    const loadMatrix = artifacts.find(artifact => artifact.artifact_type === 'load_test_matrix');
    assert.equal(loadMatrix.payload.matrix.length, 4);
  } finally {
    core.close();
  }
});

test('drains review-prep cycle into review room and productization artifacts', () => {
  const core = makeCore();
  try {
    const drained = core.runNextCycle({ phase: 'review-prep', actor: 'test' });
    assert.equal(drained.ok, true);
    assert.deepEqual(drained.results.map(result => result.phase), ['review_room', 'design_partner', 'agent_model', 'data_hardening', 'productization']);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);

    const artifacts = core.nextCycleArtifacts().artifacts;
    const tests = core.nextCycleTestRuns().test_runs;
    assert.equal(artifacts.length, 25);
    assert.equal(tests.length, 5);
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-110')));
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-134')));

    const narrative = artifacts.find(artifact => artifact.artifact_type === 'executive_review_narrative');
    assert.ok(narrative.payload.review_asks.includes('choose first connector activation'));

    const cardPolicy = artifacts.find(artifact => artifact.artifact_type === 'card_placement_policy_spec');
    assert.ok(cardPolicy.payload.placement_types.includes('process'));

    const rubric = artifacts.find(artifact => artifact.artifact_type === 'next_drain_acceptance_rubric');
    assert.equal(rubric.payload.done_criteria.length, 5);
  } finally {
    core.close();
  }
});

test('drains review-execution cycle into review, pilot, architecture, UX, and planning artifacts', () => {
  const core = makeCore();
  try {
    const drained = core.runNextCycle({ phase: 'review-execution', actor: 'test' });
    assert.equal(drained.ok, true);
    assert.deepEqual(drained.results.map(result => result.phase), ['review_execution', 'pilot_commitments', 'production_architecture', 'admin_governance_ux', 'next_cycle_planning']);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);

    const artifacts = core.nextCycleArtifacts().artifacts;
    const tests = core.nextCycleTestRuns().test_runs;
    assert.equal(artifacts.length, 25);
    assert.equal(tests.length, 5);
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-135')));
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-159')));

    const briefing = artifacts.find(artifact => artifact.artifact_type === 'review_room_briefing_deck_outline');
    assert.ok(briefing.payload.sections.some(section => section.slide === 'Decision asks'));

    const compliance = artifacts.find(artifact => artifact.artifact_type === 'marketplace_provider_compliance_architecture');
    assert.ok(compliance.payload.forbidden_paths.includes('challenge bypass'));

    const ux = artifacts.find(artifact => artifact.artifact_type === 'decision_review_queue_ux');
    assert.ok(ux.payload.actions.includes('append follow-up card'));

    const rubric = artifacts.find(artifact => artifact.artifact_type === 'next_cycle_board_fill_rubric');
    assert.ok(rubric.payload.rubric.some(item => item.criterion === 'append-only'));
  } finally {
    core.close();
  }
});

test('drains review-readout cycle into closure, pilot kickoff, alpha, trust, and automation artifacts', () => {
  const core = makeCore();
  try {
    const drained = core.runNextCycle({ phase: 'review-readout', actor: 'test' });
    assert.equal(drained.ok, true);
    assert.deepEqual(drained.results.map(result => result.phase), ['review_readout', 'pilot_kickoff', 'build_alpha_plan', 'enterprise_trust', 'review_automation']);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);

    const artifacts = core.nextCycleArtifacts().artifacts;
    const tests = core.nextCycleTestRuns().test_runs;
    assert.equal(artifacts.length, 25);
    assert.equal(tests.length, 5);
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-160')));
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-184')));

    const readout = artifacts.find(artifact => artifact.artifact_type === 'review_readout_packet');
    assert.ok(readout.payload.sections.includes('decisions made'));

    const adrQueue = artifacts.find(artifact => artifact.artifact_type === 'decision_register_adr_queue');
    assert.ok(adrQueue.payload.queue.some(item => item.adr_id === 'ADR-001'));

    const compliance = artifacts.find(artifact => artifact.artifact_type === 'provider_compliance_audit_checklist');
    assert.ok(compliance.payload.forbidden_paths.includes('challenge bypass'));

    const refill = artifacts.find(artifact => artifact.artifact_type === 'post_review_board_refill_procedure');
    assert.ok(refill.payload.procedure.some(step => step.includes('Append task_created events only')));
  } finally {
    core.close();
  }
});

test('drains review-alpha cycle into evidence, platform, decision, trust, and pilot features', () => {
  const core = makeCore();
  try {
    const drained = core.runNextCycle({ phase: 'review-alpha', actor: 'test' });
    assert.equal(drained.ok, true);
    assert.deepEqual(drained.results.map(result => result.phase), [
      'review_evidence_automation',
      'alpha_platform_foundations',
      'decision_quality_ops',
      'enterprise_trust_verification',
      'pilot_release_gate_readiness'
    ]);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);

    const artifacts = core.nextCycleArtifacts().artifacts;
    const tests = core.nextCycleTestRuns().test_runs;
    assert.equal(artifacts.length, 25);
    assert.equal(tests.length, 5);
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-185')));
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-209')));
    assert.ok(artifacts.some(artifact => artifact.artifact_type === 'evidence_bundle_runner'));
    assert.ok(artifacts.some(artifact => artifact.artifact_type === 'post_drain_refill_decision'));

    const ops = core.opsOverview();
    assert.ok(ops.summary.review_evidence_bundles >= 1);
    assert.ok(ops.summary.event_envelopes >= 1);
    assert.ok(ops.summary.projection_checkpoints >= 1);
    assert.ok(ops.summary.credential_refs >= 1);
    assert.ok(ops.summary.decision_queue_items >= 1);
    assert.ok(ops.summary.trust_attestations >= 1);
    assert.ok(ops.summary.pilot_runbooks >= 1);
    assert.ok(ops.summary.release_gate_evaluations >= 1);

    const credential = ops.credential_refs[0];
    assert.equal(credential.metadata.raw_secret, '[redacted]');

    const gate = artifacts.find(artifact => artifact.artifact_type === 'board_release_gate_evaluator');
    assert.equal(gate.payload.evaluation.gate, 'review-alpha-pilot-gate');
  } finally {
    core.close();
  }
});

test('drains review-next cycle into review room, pilot ops, hardening, governance, and commercialization features', () => {
  const core = makeCore();
  try {
    const drained = core.runNextCycle({ phase: 'review-next', actor: 'test' });
    assert.equal(drained.ok, true);
    assert.deepEqual(drained.results.map(result => result.phase), [
      'review_room_decision_readiness',
      'pilot_operations_activation',
      'production_platform_hardening',
      'agent_governance_operations',
      'commercialization_refill_gates'
    ]);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);

    const artifacts = core.nextCycleArtifacts({ limit: 30 }).artifacts;
    const tests = core.nextCycleTestRuns().test_runs;
    assert.equal(artifacts.length, 25);
    assert.equal(tests.length, 5);
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-210')));
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-234')));
    assert.ok(artifacts.some(artifact => artifact.artifact_type === 'review_evidence_binder_index'));
    assert.ok(artifacts.some(artifact => artifact.artifact_type === 'post_review_refill_goal_trigger'));

    const ops = core.opsOverview();
    assert.ok(ops.summary.review_decision_records >= 2);
    assert.ok(ops.summary.pilot_operation_records >= 1);
    assert.ok(ops.summary.platform_hardening_records >= 1);
    assert.ok(ops.summary.agent_governance_records >= 1);
    assert.ok(ops.summary.commercial_readiness_records >= 1);

    const governance = ops.agent_governance_records[0];
    assert.equal(governance.process_key, 'inventory.instock.cycle');

    const scorecard = artifacts.find(artifact => artifact.artifact_type === 'release_readiness_scorecard');
    assert.equal(scorecard.payload.evaluation.gate, 'review-next-readiness-scorecard');
  } finally {
    core.close();
  }
});

test('drains review-operating cycle into operating review, pilot entry, reliability, runtime, and signoff features', () => {
  const core = makeCore();
  try {
    const drained = core.runNextCycle({ phase: 'review-operating', actor: 'test' });
    assert.equal(drained.ok, true);
    assert.deepEqual(drained.results.map(result => result.phase), [
      'review_room_operating_session',
      'design_partner_pilot_entry',
      'production_reliability_slice',
      'governed_agent_runtime',
      'commercial_review_refill_signoff'
    ]);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);

    const artifacts = core.nextCycleArtifacts({ limit: 30 }).artifacts;
    const tests = core.nextCycleTestRuns().test_runs;
    assert.equal(artifacts.length, 25);
    assert.equal(tests.length, 5);
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-235')));
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-259')));
    assert.ok(artifacts.some(artifact => artifact.artifact_type === 'live_review_room_agenda'));
    assert.ok(artifacts.some(artifact => artifact.artifact_type === 'follow_on_drain_goal_criteria'));

    const ops = core.opsOverview();
    assert.ok(ops.summary.review_decision_records >= 5);
    assert.ok(ops.summary.pilot_operation_records >= 2);
    assert.ok(ops.summary.import_review_rows >= 2);
    assert.ok(ops.summary.platform_hardening_records >= 1);
    assert.ok(ops.summary.agent_governance_records >= 2);
    assert.ok(ops.summary.commercial_readiness_records >= 3);
    assert.ok(ops.summary.release_gate_evaluations >= 2);
    assert.ok(ops.summary.hapa_decision_runs >= 1);

    const runtime = ops.agent_governance_records.find(record => record.governance_type === 'governed_execution_runtime');
    assert.equal(runtime.process_key, 'inventory.instock.cycle');

    const signoff = artifacts.find(artifact => artifact.artifact_type === 'release_readiness_signoff');
    assert.equal(signoff.payload.evaluation.gate, 'commercial-review-refill-signoff');
  } finally {
    core.close();
  }
});

test('drains parity docs UI cycle into parity, docs, fixture, UI, and QA artifacts', () => {
  const core = makeCore();
  try {
    const drained = core.runNextCycle({ phase: 'parity-docs-ui', actor: 'test' });
    assert.equal(drained.ok, true);
    assert.deepEqual(drained.results.map(result => result.phase), [
      'surface_parity_audit',
      'documentation_completion',
      'demo_data_expansion',
      'operator_ui_enhancement',
      'review_rehearsal_refill_qa'
    ]);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);

    const artifacts = core.nextCycleArtifacts({ limit: 30 }).artifacts;
    const tests = core.nextCycleTestRuns().test_runs;
    assert.equal(artifacts.length, 25);
    assert.equal(tests.length, 5);
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-260')));
    assert.ok(artifacts.some(artifact => artifact.evidence.includes('HCAT-284')));
    assert.ok(artifacts.some(artifact => artifact.artifact_type === 'ui_cli_api_parity_matrix'));
    assert.ok(artifacts.some(artifact => artifact.artifact_type === 'demo_fixture_taxonomy_validation'));
    assert.ok(artifacts.some(artifact => artifact.artifact_type === 'ops_actions_by_parity_domain'));

    const matrix = artifacts.find(artifact => artifact.artifact_type === 'ui_cli_api_parity_matrix');
    assert.ok(matrix.payload.parity_rows.some(row => row.endpoint === '/v1/fixtures/demo-catalog-100/import'));

    const fixture = artifacts.find(artifact => artifact.artifact_type === 'demo_fixture_taxonomy_validation');
    assert.equal(fixture.payload.records, 100);
    assert.ok(fixture.payload.categories.length >= 10);
    assert.ok(fixture.payload.stock_states.includes('below_reorder'));

    const ops = core.opsOverview();
    assert.ok(ops.summary.skus >= 100);
    assert.equal(ops.summary.next_cycle_artifacts, 25);
    assert.equal(ops.summary.next_cycle_test_runs, 5);
    assert.ok(ops.summary.release_gate_evaluations >= 1);
  } finally {
    core.close();
  }
});
