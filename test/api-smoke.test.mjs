import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../src/server.mjs';
import { readRecordsFromFile } from '../src/catalog-core.mjs';

async function makeServer() {
  const temp = mkdtempSync(join(tmpdir(), 'hapa-catalog-api-'));
  const boardLogPath = join(temp, 'events.ndjson');
  writeFileSync(boardLogPath, [
    JSON.stringify({
      project_id: 'hapa-app-hapa-catalog-node',
      id: 'created-1',
      ts: '2026-06-05T21:00:00.000Z',
      actor: 'Test',
      type: 'task_created',
      task_id: 'HCAT-001',
      links: [],
      payload: {
        taskId: 'HCAT-001',
        title: 'Expose board endpoint',
        description: 'Serve board cards to the frontend.',
        column: 'ready',
        lane: 'API',
        owner: 'Blue',
        priority: 'P0',
        tags: ['board'],
        requirements: ['HAPA-006'],
        acceptance: ['Endpoint returns columns']
      }
    }),
    JSON.stringify({
      project_id: 'hapa-app-hapa-catalog-node',
      id: 'moved-1',
      ts: '2026-06-05T21:01:00.000Z',
      actor: 'Test',
      type: 'task_moved',
      task_id: 'HCAT-001',
      links: [],
      payload: { from: 'ready', to: 'done', reason: 'Verified.', evidence: ['API smoke'] }
    })
  ].join('\n'));
  return startServer({
    root: process.cwd(),
    dataDir: temp,
    artifactDir: join(temp, 'artifacts'),
    token: 'test-token',
    port: 0,
    boardLogPath
  });
}

function auth() {
  return { Authorization: 'Bearer test-token' };
}

function marketHtmlFixture() {
  return `
    <h1>Garmin Approach R10, Portable Golf Launch Monitor</h1>
    <p>ASIN: B095QX1FSR UPC: 075375927016 EAN: 0753759270162 PRODUCT GROUP: Sports CATEGORY: Golf Swing Trainers MANUFACTURER: Garmin MODEL: 010-02356-00</p>
    <script>{"price_amazon":[["2026-01-01T00:00:00.000Z",468.95]],"price_new":[["2026-01-02T00:00:00.000Z",455]],"price_used":[["2026-01-03T00:00:00.000Z",350]]}</script>
  `;
}

function amazonListingFixture() {
  return `
    <link rel="canonical" href="https://www.amazon.com/Garmin-Approach-Portable-Monitor-Indoors/dp/B095QX1FSR">
    <h1 id="pqv-title">Product Summary: Garmin Approach R10, Portable Golf Launch Monitor, Take Your Game Home, Indoors or to The Driving Range, Up to 10 Hours Battery Life - 010-02356-00</h1>
    <p id="pqv-byline">From Garmin</p>
    <p id="pqv-ratings">4.2 out of 5 stars, 1,112 ratings</p>
    <p id="pqv-bought-in-last-month">1K+ bought in past month</p>
    <div><h2 id="pqv-price">Price</h2><p><span>One-time purchase: $399.98</span> 33% Savings</p><p id="pqv-price-list-price">List Price: <span>$599.99</span></p></div>
    <div id="pqv-feature-bullets"><ul><li><span>Track key metrics.</span></li><li><span>Up to 10 hours of battery life.</span></li></ul></div>
    <div id="pqv-description"><div>Approach R10 portable launch monitor.</div></div>
    <div id="pqv-documents"><a href="https://m.media-amazon.com/images/I/B172-Jc1w0L.pdf?ref=dp_product_quick_view">User Manual (PDF)</a></div>
    <img id="landingImage" alt="Garmin Approach R10" src="https://m.media-amazon.com/images/I/61POLvv99xS._AC_SY300_SX300_QL70_ML2_.jpg" data-old-hires="https://m.media-amazon.com/images/I/61POLvv99xS._AC_SL1500_.jpg">
    <script>var data = {'asin':'B095QX1FSR','colorImages':{'initial':[{"hiRes":"https://m.media-amazon.com/images/I/61POLvv99xS._AC_SL1500_.jpg","large":"https://m.media-amazon.com/images/I/31R1XdujCjS._AC_.jpg","main":{"https://m.media-amazon.com/images/I/61POLvv99xS._AC_SX679_.jpg":[679,679]}}]}};</script>
  `;
}

test('serves Hapa health and token-gated API surfaces', async () => {
  const handle = await makeServer();
  try {
    const health = await fetch(`${handle.url}/health`).then(res => res.json());
    assert.equal(health.ok, true);
    assert.equal(health.node_id, 'hapa-catalog-node');

    const denied = await fetch(`${handle.url}/v1/summary`);
    assert.equal(denied.status, 401);

    const capabilities = await fetch(`${handle.url}/capabilities`, { headers: auth() }).then(res => res.json());
    assert.equal(capabilities.ok, true);
    assert.equal(capabilities.parity.api, true);
    assert.equal(capabilities.endpoints.kanban_board, '/v1/kanban-board');
    assert.equal(capabilities.endpoints.market_retrieve, '/v1/market/retrieve');
    assert.equal(capabilities.endpoints.review_evidence_bundles, '/v1/review/evidence-bundles');
    assert.equal(capabilities.endpoints.decision_review_queue, '/v1/decision-review-queue');
    assert.equal(capabilities.endpoints.review_decision_records, '/v1/review/decision-records');
    assert.equal(capabilities.endpoints.agent_governance_records, '/v1/agent-governance/records');
    assert.equal(capabilities.endpoints.demo_catalog_fixture, '/v1/fixtures/demo-catalog-100');
    assert.equal(capabilities.endpoints.demo_catalog_import, '/v1/fixtures/demo-catalog-100/import');
    assert.ok(capabilities.supported_operations.includes('fixture.demo_catalog.read'));
    assert.ok(capabilities.supported_operations.includes('fixture.demo_catalog.import'));
    assert.ok(capabilities.supported_operations.includes('next_cycle.review_alpha.run'));
    assert.ok(capabilities.supported_operations.includes('next_cycle.review_next.run'));
    assert.ok(capabilities.supported_operations.includes('next_cycle.review_operating.run'));
    assert.ok(capabilities.supported_operations.includes('next_cycle.parity_docs_ui.run'));

    const board = await fetch(`${handle.url}/v1/kanban-board`, { headers: auth() }).then(res => res.json());
    assert.equal(board.ok, true);
    assert.equal(board.board.summary.done, 1);
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('imports records over API and returns browse, inventory, forecast, and audit data', async () => {
  const handle = await makeServer();
  try {
    const records = readRecordsFromFile('data/fixtures/sample_catalog.csv');
    const imported = await fetch(`${handle.url}/v1/import-batches`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'api-test', actor: 'api-test', records })
    }).then(res => res.json());
    assert.equal(imported.ok, true);
    assert.equal(imported.totals.valid, 3);

    const items = await fetch(`${handle.url}/v1/items?q=Alpha`, { headers: auth() }).then(res => res.json());
    assert.equal(items.items.length, 2);

    const inventory = await fetch(`${handle.url}/v1/inventory/positions?sku=ALPHA-RING-9`, { headers: auth() }).then(res => res.json());
    assert.equal(inventory.positions[0].available, 37);

    const forecast = await fetch(`${handle.url}/v1/forecasts/runs`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'ALPHA-RING-9', location: 'main-bin', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(forecast.ok, true);
    assert.equal(forecast.run.explanation.top_drivers.length, 5);

    const audit = await fetch(`${handle.url}/v1/audit-events`, { headers: auth() }).then(res => res.json());
    assert.ok(audit.audit_events.length >= 2);
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves and imports the 100 SKU demo catalog fixture over API', async () => {
  const handle = await makeServer();
  try {
    const fixture = await fetch(`${handle.url}/v1/fixtures/demo-catalog-100`, { headers: auth() }).then(res => res.json());
    assert.equal(fixture.ok, true);
    assert.equal(fixture.count, 100);
    assert.equal(fixture.records[0].sku, 'DEMO-WEAR-001');

    const imported = await fetch(`${handle.url}/v1/fixtures/demo-catalog-100/import`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: 'api-test', limit: 100 })
    }).then(res => res.json());
    assert.equal(imported.ok, true);
    assert.equal(imported.totals.valid, 100);
    assert.equal(imported.fixture.count, 100);

    const items = await fetch(`${handle.url}/v1/items?limit=150`, { headers: auth() }).then(res => res.json());
    assert.equal(items.items.length, 100);
    assert.ok(items.items.some(item => item.sku === 'DEMO-WEAR-001'));
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves post-MVP operations scaffolds over API', async () => {
  const handle = await makeServer();
  try {
    const records = readRecordsFromFile('data/fixtures/sample_catalog.csv');
    await fetch(`${handle.url}/v1/import-batches`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'ops-api-test', actor: 'api-test', records })
    }).then(res => res.json());

    const migration = await fetch(`${handle.url}/v1/schema/migrations`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 'test-ops-v1', name: 'Ops API test', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(migration.ok, true);

    const review = await fetch(`${handle.url}/v1/import-review`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'ops-review', actor: 'api-test', records: [{ sku: 'OPS-API-1', name: 'Ops API Item', gtin: '7000000000001' }] })
    }).then(res => res.json());
    assert.equal(review.rows.length, 1);

    const connector = await fetch(`${handle.url}/v1/connectors/run`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ connector_id: 'connector-erp-plm', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(connector.ok, true);

    const session = await fetch(`${handle.url}/v1/identity-sessions`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity_id: 'local_operator', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(session.ok, true);

    const rotated = await fetch(`${handle.url}/v1/identity-sessions/rotate`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: session.session.id, actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(rotated.session.status, 'active');

    const compare = await fetch(`${handle.url}/v1/forecasts/model-comparisons`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'ALPHA-RING-9', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(compare.ok, true);

    const projection = await fetch(`${handle.url}/v1/projections/sync`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'hapa-lance-node', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(projection.exports.length, 3);

    const pricing = await fetch(`${handle.url}/v1/pricing/scenarios`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'ALPHA-RING-9', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(pricing.scenario.sku, 'ALPHA-RING-9');

    const lifecycle = await fetch(`${handle.url}/v1/lifecycle/events`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'ALPHA-RING-9', to_state: 'published', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(lifecycle.event.to_state, 'published');

    const publish = await fetch(`${handle.url}/v1/publishing/runs`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'storefront', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(publish.run.channel, 'storefront');

    const telemetry = await fetch(`${handle.url}/v1/telemetry/registrations`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: 'hapa-telemetry-node://api-test', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(telemetry.registration.status, 'registered');

    const org = await fetch(`${handle.url}/v1/organizations`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'API Ops Org', identity_id: 'local_operator', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(org.ok, true);

    const ledger = await fetch(`${handle.url}/v1/inventory/ledger`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'ALPHA-RING-9', facility: 'main', location: 'main-bin', quantity: 1, actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(ledger.event.sku, 'ALPHA-RING-9');

    const reconciliation = await fetch(`${handle.url}/v1/inventory/reconciliations`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ facility: 'main', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(reconciliation.ok, true);

    const quality = await fetch(`${handle.url}/v1/quality/evaluate`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(quality.ok, true);

    const desktop = await fetch(`${handle.url}/v1/desktop/packages`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform: 'test-desktop', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(desktop.package.platform, 'test-desktop');

    const lineage = await fetch(`${handle.url}/v1/lineage/exports`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset: 'catalog_items', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(lineage.export.dataset, 'catalog_items');

    const retention = await fetch(`${handle.url}/v1/retention/policies`, { headers: auth() }).then(res => res.json());
    assert.ok(retention.policies.length >= 2);

    const backup = await fetch(`${handle.url}/v1/backups`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(backup.backup.status, 'completed');

    const ops = await fetch(`${handle.url}/v1/ops`, { headers: auth() }).then(res => res.json());
    assert.equal(ops.ok, true);
    assert.ok(ops.summary.connector_runs >= 1);
    assert.ok(ops.summary.backup_runs >= 1);
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('retrieves market price history over API and resolves UPC identifiers', async () => {
  const handle = await makeServer();
  try {
    const retrieved = await fetch(`${handle.url}/v1/market/retrieve`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://camelcamelcamel.com/product/B095QX1FSR?active=price_amazon&context=popular&cpf=amazon-new-used',
        html: marketHtmlFixture(),
        actor: 'api-test'
      })
    }).then(res => res.json());
    assert.equal(retrieved.ok, true);
    assert.equal(retrieved.item.sku, 'B095QX1FSR');
    assert.equal(retrieved.inserted_points, 3);

    const resolved = await fetch(`${handle.url}/v1/identifiers/resolve?scheme=upc&value=075375927016`, { headers: auth() }).then(res => res.json());
    assert.equal(resolved.found, true);
    assert.equal(resolved.item.sku, 'B095QX1FSR');

    const prices = await fetch(`${handle.url}/v1/market/prices?sku=B095QX1FSR`, { headers: auth() }).then(res => res.json());
    assert.equal(prices.points.length, 3);
    assert.ok(prices.summary.some(row => row.price_type === 'amazon'));
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('retrieves Amazon listing media over API using the UPC identifier graph', async () => {
  const handle = await makeServer();
  try {
    await fetch(`${handle.url}/v1/market/retrieve`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://camelcamelcamel.com/product/B095QX1FSR',
        html: marketHtmlFixture(),
        actor: 'api-test'
      })
    }).then(res => res.json());

    const listing = await fetch(`${handle.url}/v1/market/amazon-listing/retrieve`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upc: '075375927016',
        html: amazonListingFixture(),
        actor: 'api-test'
      })
    }).then(res => res.json());
    assert.equal(listing.ok, true);
    assert.equal(listing.item.sku, 'B095QX1FSR');
    assert.ok(listing.inserted_media >= 4);

    const listings = await fetch(`${handle.url}/v1/market/listing?sku=B095QX1FSR`, { headers: auth() }).then(res => res.json());
    assert.equal(listings.listings.length, 1);
    assert.ok(listings.media.some(asset => asset.media_type === 'document'));
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves mapping workbench, digital product, and scoped authorization APIs', async () => {
  const handle = await makeServer();
  try {
    const mappingBody = {
      id: 'mapping-api-supplier',
      name: 'API supplier mapping',
      source_type: 'supplier_portal',
      field_map: {
        sku: 'supplier_item',
        name: 'description',
        brand: 'brand_name',
        category: 'dept',
        gtin: 'barcode',
        supplier: 'supplier_name',
        pack_level: 'uom',
        weight: 'weight_oz'
      },
      defaults: {
        facility: 'api-main',
        location: 'api-bin',
        on_hand: 5,
        digital: 'true',
        version: 'api-1',
        license: 'seat'
      },
      conversions: { weight: { from: 'oz', to: 'lb', factor: 0.0625 } }
    };
    const saved = await fetch(`${handle.url}/v1/import-mappings`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify(mappingBody)
    }).then(res => res.json());
    assert.equal(saved.ok, true);

    const sourceRows = [{
      supplier_item: 'API-MAPPED-1',
      description: 'API Mapped Digital Item',
      brand_name: 'API Brand',
      dept: 'software',
      barcode: '9000000000001',
      supplier_name: 'API Supplier',
      uom: 'each',
      weight_oz: '16'
    }];
    const preview = await fetch(`${handle.url}/v1/import-mappings/preview`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapping_id: 'mapping-api-supplier', records: sourceRows })
    }).then(res => res.json());
    assert.equal(preview.ok, true);
    assert.equal(preview.preview[0].weight, 1);

    const denied = await fetch(`${handle.url}/v1/import-batches`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json', 'X-Hapa-Identity': 'supplier_demo' },
      body: JSON.stringify({ source: 'api-denied', records: sourceRows, mapping_id: 'mapping-api-supplier' })
    });
    assert.equal(denied.status, 403);

    const dryRun = await fetch(`${handle.url}/v1/import-batches`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json', 'X-Hapa-Identity': 'supplier_demo' },
      body: JSON.stringify({ source: 'api-dry-run', dry_run: true, records: sourceRows, mapping_id: 'mapping-api-supplier' })
    }).then(res => res.json());
    assert.equal(dryRun.ok, true);
    assert.equal(dryRun.totals.dry_run, true);

    const imported = await fetch(`${handle.url}/v1/import-batches`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'api-mapped', records: sourceRows, mapping_id: 'mapping-api-supplier' })
    }).then(res => res.json());
    assert.equal(imported.ok, true);

    const digital = await fetch(`${handle.url}/v1/digital-products?sku=API-MAPPED-1`, { headers: auth() }).then(res => res.json());
    assert.equal(digital.digital_products.length, 1);
    assert.equal(digital.digital_products[0].license, 'seat');

    const audit = await fetch(`${handle.url}/v1/audit-events`, { headers: auth() }).then(res => res.json());
    assert.ok(audit.audit_events.some(event => event.action === 'auth.denied'));
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves MDM, forecast quality, connector, and performance APIs', async () => {
  const handle = await makeServer();
  try {
    const records = [
      { sku: 'API-DUP-1', name: 'API Duplicate Watch', brand: 'Northstar', category: 'wearables', gtin: '9100000000001', supplier: 'A', facility: 'main', location: 'bin', on_hand: 10, sales_30d: 12 },
      { sku: 'API-DUP-2', name: 'API Duplicate Watch', brand: 'Northstar', category: 'wearables', gtin: '9100000000001', supplier: 'B', facility: 'main', location: 'bin', on_hand: 8, sales_30d: 12 }
    ];
    await fetch(`${handle.url}/v1/import-batches`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'api-mdm', records })
    }).then(res => res.json());

    const detected = await fetch(`${handle.url}/v1/mdm/detect-duplicates`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ threshold: 0.5 })
    }).then(res => res.json());
    assert.equal(detected.ok, true);
    assert.equal(detected.candidates.length, 1);

    const merge = await fetch(`${handle.url}/v1/mdm/merge`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: detected.candidates[0].id, winner_sku: 'API-DUP-1', merged_sku: 'API-DUP-2' })
    }).then(res => res.json());
    assert.equal(merge.ok, true);

    const forecast = await fetch(`${handle.url}/v1/forecasts/runs`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: 'API-DUP-1', location: 'bin', actor: 'api-test' })
    }).then(res => res.json());
    const actuals = await fetch(`${handle.url}/v1/forecasts/actuals`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: [{
          sku: 'API-DUP-1',
          location: 'bin',
          channel: 'default',
          bucket_start: forecast.run.series[0].bucket_start,
          bucket_end: forecast.run.series[0].bucket_end,
          actual: forecast.run.series[0].adjusted + 3
        }]
      })
    }).then(res => res.json());
    assert.equal(actuals.quality_events.length, 1);

    const quality = await fetch(`${handle.url}/v1/forecasts/quality?sku=API-DUP-1`, { headers: auth() }).then(res => res.json());
    assert.equal(quality.quality_events.length, 1);

    const contracts = await fetch(`${handle.url}/v1/connectors/contracts`, { headers: auth() }).then(res => res.json());
    assert.equal(contracts.contracts.length >= 7, true);
    const validation = await fetch(`${handle.url}/v1/connectors/validate`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }).then(res => res.json());
    assert.equal(validation.ok, true);

    const performance = await fetch(`${handle.url}/v1/performance/reports`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ measured_skus: 25, measured_inventory_events: 250 })
    }).then(res => res.json());
    assert.equal(performance.report.sku_target, 100000);
    const reports = await fetch(`${handle.url}/v1/performance/reports`, { headers: auth() }).then(res => res.json());
    assert.equal(reports.reports.length, 1);
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves Hapa card placement, decision context, and process run APIs', async () => {
  const handle = await makeServer();
  try {
    const cards = await fetch(`${handle.url}/v1/hapa-cards`, { headers: auth() }).then(res => res.json());
    assert.equal(cards.ok, true);
    assert.ok(cards.cards.some(card => card.id === 'card-avatar-forecast-friend'));

    const created = await fetch(`${handle.url}/v1/hapa-cards`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'card-avatar-api-demand-owner',
        card_kind: 'avatar',
        name: 'API Demand Owner Avatar',
        owner_identity_id: 'local_operator',
        skills: ['forecasting', 'demand owner'],
        context: { voice: 'API-created demand owner.', checks: ['trend', 'actuals'] },
        tags: ['avatar', 'forecasting'],
        actor: 'api-test'
      })
    }).then(res => res.json());
    assert.equal(created.ok, true);

    const placement = await fetch(`${handle.url}/v1/hapa-card-placements`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_id: 'card-avatar-api-demand-owner',
        placement_type: 'catalog_domain',
        target_type: 'catalog_domain',
        target_id: 'forecasting',
        role: 'advisor',
        decision_mode: 'context',
        priority: 14,
        actor: 'api-test'
      })
    }).then(res => res.json());
    assert.equal(placement.ok, true);

    const context = await fetch(`${handle.url}/v1/hapa-decision-context?process_key=forecast.cycle`, { headers: auth() }).then(res => res.json());
    assert.equal(context.ok, true);
    assert.ok(context.cards.some(card => card.id === 'card-avatar-api-demand-owner'));
    assert.ok(context.context_bundle.required_reviews.some(card => card.card_id === 'card-avatar-forecast-friend'));

    const decision = await fetch(`${handle.url}/v1/hapa-decisions/run`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ process_key: 'forecast.cycle', subject_type: 'sku', subject_id: 'B095QX1FSR', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(decision.ok, true);
    assert.ok(decision.result.routed_cards.some(card => card.card_id === 'card-avatar-api-demand-owner'));

    const runs = await fetch(`${handle.url}/v1/hapa-decisions/runs?process_key=forecast.cycle`, { headers: auth() }).then(res => res.json());
    assert.equal(runs.runs.length >= 1, true);

    const processes = await fetch(`${handle.url}/v1/hapa-processes`, { headers: auth() }).then(res => res.json());
    assert.ok(processes.processes.some(process => process.process_key === 'forecast.cycle'));

    const due = await fetch(`${handle.url}/v1/hapa-processes/run-due`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor: 'api-test', force: true })
    }).then(res => res.json());
    assert.equal(due.ok, true);
    assert.equal(due.ran >= 3, true);
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves next-cycle drain, artifacts, test runs, and review docs over API', async () => {
  const handle = await makeServer();
  try {
    const drained = await fetch(`${handle.url}/v1/next-cycle/run`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'all', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(drained.ok, true);
    assert.equal(drained.artifacts.length, 28);
    assert.equal(drained.test_runs.length, 5);

    const artifacts = await fetch(`${handle.url}/v1/next-cycle/artifacts`, { headers: auth() }).then(res => res.json());
    assert.equal(artifacts.ok, true);
    assert.equal(artifacts.artifacts.length, 28);
    assert.ok(artifacts.artifacts.some(artifact => artifact.evidence.includes('HCAT-062')));
    assert.ok(artifacts.artifacts.some(artifact => artifact.evidence.includes('HCAT-089')));

    const connected = await fetch(`${handle.url}/v1/next-cycle/artifacts?phase=Phase%206`, { headers: auth() }).then(res => res.json());
    assert.ok(connected.artifacts.length >= 6);

    const testRuns = await fetch(`${handle.url}/v1/next-cycle/test-runs`, { headers: auth() }).then(res => res.json());
    assert.equal(testRuns.test_runs.length, 5);
    assert.ok(testRuns.test_runs.every(run => run.status === 'passed'));

    const ops = await fetch(`${handle.url}/v1/ops`, { headers: auth() }).then(res => res.json());
    assert.equal(ops.summary.next_cycle_artifacts, 28);
    assert.equal(ops.summary.next_cycle_test_runs, 5);

    const docs = await fetch(`${handle.url}/v1/docs`, { headers: auth() }).then(res => res.json());
    assert.ok(docs.docs.some(doc => doc.id === 'NEXT_WORK_CYCLE'));
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves continuation-cycle drain over API', async () => {
  const handle = await makeServer();
  try {
    const drained = await fetch(`${handle.url}/v1/next-cycle/run`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'continuation', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(drained.ok, true);
    assert.equal(drained.artifacts.length, 20);
    assert.equal(drained.test_runs.length, 5);
    assert.deepEqual(drained.results.map(result => result.phase), ['pilot_ops', 'agent_ops', 'compliance_admin', 'test_scale', 'pilot_learning']);

    const artifacts = await fetch(`${handle.url}/v1/next-cycle/artifacts?phase=Phase%2014`, { headers: auth() }).then(res => res.json());
    assert.ok(artifacts.artifacts.some(artifact => artifact.evidence.includes('HCAT-109')));

    const tests = await fetch(`${handle.url}/v1/next-cycle/test-runs?test_type=pilot_learning_smoke`, { headers: auth() }).then(res => res.json());
    assert.equal(tests.test_runs.length, 1);
    assert.equal(tests.test_runs[0].status, 'passed');
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves review-prep drain over API', async () => {
  const handle = await makeServer();
  try {
    const drained = await fetch(`${handle.url}/v1/next-cycle/run`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'review-prep', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(drained.ok, true);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);
    assert.deepEqual(drained.results.map(result => result.phase), ['review_room', 'design_partner', 'agent_model', 'data_hardening', 'productization']);

    const artifacts = await fetch(`${handle.url}/v1/next-cycle/artifacts?phase=Phase%2019`, { headers: auth() }).then(res => res.json());
    assert.ok(artifacts.artifacts.some(artifact => artifact.evidence.includes('HCAT-134')));

    const tests = await fetch(`${handle.url}/v1/next-cycle/test-runs?test_type=productization_prep_smoke`, { headers: auth() }).then(res => res.json());
    assert.equal(tests.test_runs.length, 1);
    assert.equal(tests.test_runs[0].status, 'passed');
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves review-execution drain over API', async () => {
  const handle = await makeServer();
  try {
    const drained = await fetch(`${handle.url}/v1/next-cycle/run`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'review-execution', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(drained.ok, true);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);
    assert.deepEqual(drained.results.map(result => result.phase), ['review_execution', 'pilot_commitments', 'production_architecture', 'admin_governance_ux', 'next_cycle_planning']);

    const artifacts = await fetch(`${handle.url}/v1/next-cycle/artifacts?phase=Phase%2024`, { headers: auth() }).then(res => res.json());
    assert.ok(artifacts.artifacts.some(artifact => artifact.evidence.includes('HCAT-159')));
    assert.ok(artifacts.artifacts.some(artifact => artifact.artifact_type === 'next_cycle_acceptance_test_plan'));

    const tests = await fetch(`${handle.url}/v1/next-cycle/test-runs?test_type=review_execution_smoke`, { headers: auth() }).then(res => res.json());
    assert.equal(tests.test_runs.length, 1);
    assert.equal(tests.test_runs[0].status, 'passed');

    const ops = await fetch(`${handle.url}/v1/ops`, { headers: auth() }).then(res => res.json());
    assert.equal(ops.summary.next_cycle_artifacts, 25);
    assert.equal(ops.summary.next_cycle_test_runs, 5);
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves review-readout drain over API', async () => {
  const handle = await makeServer();
  try {
    const drained = await fetch(`${handle.url}/v1/next-cycle/run`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'review-readout', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(drained.ok, true);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);
    assert.deepEqual(drained.results.map(result => result.phase), ['review_readout', 'pilot_kickoff', 'build_alpha_plan', 'enterprise_trust', 'review_automation']);

    const artifacts = await fetch(`${handle.url}/v1/next-cycle/artifacts?phase=Phase%2029`, { headers: auth() }).then(res => res.json());
    assert.ok(artifacts.artifacts.some(artifact => artifact.evidence.includes('HCAT-184')));
    assert.ok(artifacts.artifacts.some(artifact => artifact.artifact_type === 'post_review_board_refill_procedure'));

    const tests = await fetch(`${handle.url}/v1/next-cycle/test-runs?test_type=review_readout_smoke`, { headers: auth() }).then(res => res.json());
    assert.equal(tests.test_runs.length, 1);
    assert.equal(tests.test_runs[0].status, 'passed');

    const ops = await fetch(`${handle.url}/v1/ops`, { headers: auth() }).then(res => res.json());
    assert.equal(ops.summary.next_cycle_artifacts, 25);
    assert.equal(ops.summary.next_cycle_test_runs, 5);
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves review-alpha drain and alpha operational endpoints over API', async () => {
  const handle = await makeServer();
  try {
    const drained = await fetch(`${handle.url}/v1/next-cycle/run`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'review-alpha', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(drained.ok, true);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);
    assert.deepEqual(drained.results.map(result => result.phase), [
      'review_evidence_automation',
      'alpha_platform_foundations',
      'decision_quality_ops',
      'enterprise_trust_verification',
      'pilot_release_gate_readiness'
    ]);

    const phase34 = await fetch(`${handle.url}/v1/next-cycle/artifacts?phase=Phase%2034`, { headers: auth() }).then(res => res.json());
    assert.ok(phase34.artifacts.some(artifact => artifact.evidence.includes('HCAT-209')));
    assert.ok(phase34.artifacts.some(artifact => artifact.artifact_type === 'post_drain_refill_decision'));

    const evidenceBundle = await fetch(`${handle.url}/v1/review/evidence-bundles`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundle_type: 'api-review', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(evidenceBundle.ok, true);
    assert.equal(evidenceBundle.bundle.bundle_type, 'api-review');
    assert.ok(evidenceBundle.bundle.redaction_manifest.forbidden_fields.includes('raw_secret'));

    const bundles = await fetch(`${handle.url}/v1/review/evidence-bundles`, { headers: auth() }).then(res => res.json());
    assert.ok(bundles.bundles.length >= 2);

    const event = await fetch(`${handle.url}/v1/events`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'catalog.test.event',
        object_type: 'sku',
        object_id: 'ALPHA-RING-9',
        idempotency_key: 'api-alpha-event',
        payload: { test: true },
        actor: 'api-test'
      })
    }).then(res => res.json());
    assert.equal(event.ok, true);
    assert.equal(event.event.idempotency_key, 'api-alpha-event');

    const checkpoint = await fetch(`${handle.url}/v1/projection-checkpoints`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ consumer: 'api-test-consumer', checkpoint_key: 'api-test-consumer:event_envelopes', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(checkpoint.ok, true);
    assert.equal(checkpoint.checkpoint.consumer, 'api-test-consumer');

    const credential = await fetch(`${handle.url}/v1/credential-refs`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'api-provider', label: 'API Provider', metadata: { raw_secret: 'do-not-store' }, actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(credential.ok, true);
    assert.equal(credential.credential_ref.metadata.raw_secret, '[redacted]');

    const decision = await fetch(`${handle.url}/v1/decision-review-queue`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ process_key: 'forecast.cycle', subject_id: 'ALPHA-RING-9', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(decision.ok, true);
    assert.equal(decision.decision.status, 'open');

    const action = await fetch(`${handle.url}/v1/decision-review-queue/actions`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: decision.decision.id, status: 'reviewed', action: 'approve', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(action.ok, true);
    assert.equal(action.decision.status, 'reviewed');

    const trust = await fetch(`${handle.url}/v1/trust/attestations`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ attestation_type: 'api-trust', subject: 'api', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(trust.ok, true);
    assert.equal(trust.attestation.attestation_type, 'api-trust');

    const runbook = await fetch(`${handle.url}/v1/pilot/runbooks`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'API Pilot', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(runbook.ok, true);
    assert.equal(runbook.runbook.name, 'API Pilot');

    const gate = await fetch(`${handle.url}/v1/release-gates/evaluations`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ gate: 'api-alpha-gate', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(gate.ok, true);
    assert.equal(gate.evaluation.gate, 'api-alpha-gate');

    const ops = await fetch(`${handle.url}/v1/ops`, { headers: auth() }).then(res => res.json());
    assert.equal(ops.summary.next_cycle_artifacts, 25);
    assert.equal(ops.summary.next_cycle_test_runs, 5);
    assert.ok(ops.summary.review_evidence_bundles >= 2);
    assert.ok(ops.summary.decision_queue_items >= 2);
    assert.ok(ops.summary.release_gate_evaluations >= 2);
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves review-next drain and operational readiness endpoints over API', async () => {
  const handle = await makeServer();
  try {
    const drained = await fetch(`${handle.url}/v1/next-cycle/run`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'review-next', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(drained.ok, true);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);
    assert.deepEqual(drained.results.map(result => result.phase), [
      'review_room_decision_readiness',
      'pilot_operations_activation',
      'production_platform_hardening',
      'agent_governance_operations',
      'commercialization_refill_gates'
    ]);

    const phase39 = await fetch(`${handle.url}/v1/next-cycle/artifacts?phase=Phase%2039`, { headers: auth() }).then(res => res.json());
    assert.ok(phase39.artifacts.some(artifact => artifact.evidence.includes('HCAT-234')));
    assert.ok(phase39.artifacts.some(artifact => artifact.artifact_type === 'post_review_refill_goal_trigger'));

    const reviewRecord = await fetch(`${handle.url}/v1/review/decision-records`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_type: 'api_review_decision', subject: 'API review decision', owner: 'api-test', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(reviewRecord.ok, true);
    assert.equal(reviewRecord.record.record_type, 'api_review_decision');

    const reviewRecords = await fetch(`${handle.url}/v1/review/decision-records?record_type=api_review_decision`, { headers: auth() }).then(res => res.json());
    assert.equal(reviewRecords.records.length, 1);

    const pilotOperation = await fetch(`${handle.url}/v1/pilot/operations`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ operation_type: 'api_pilot_activation', tenant_id: 'api-tenant', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(pilotOperation.ok, true);
    assert.equal(pilotOperation.operation.tenant_id, 'api-tenant');

    const pilotOperations = await fetch(`${handle.url}/v1/pilot/operations?tenant_id=api-tenant`, { headers: auth() }).then(res => res.json());
    assert.equal(pilotOperations.operations.length, 1);

    const hardening = await fetch(`${handle.url}/v1/platform/hardening`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ check_type: 'api_hardening_check', target: 'api-platform', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(hardening.ok, true);
    assert.equal(hardening.record.target, 'api-platform');

    const hardeningRecords = await fetch(`${handle.url}/v1/platform/hardening?target=api-platform`, { headers: auth() }).then(res => res.json());
    assert.equal(hardeningRecords.records.length, 1);

    const governance = await fetch(`${handle.url}/v1/agent-governance/records`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ governance_type: 'api_agent_policy', process_key: 'api.process', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(governance.ok, true);
    assert.equal(governance.record.process_key, 'api.process');

    const governanceRecords = await fetch(`${handle.url}/v1/agent-governance/records?process_key=api.process`, { headers: auth() }).then(res => res.json());
    assert.equal(governanceRecords.records.length, 1);

    const commercial = await fetch(`${handle.url}/v1/commercial/readiness`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ record_type: 'api_offer_package', audience: 'api-design-partner', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(commercial.ok, true);
    assert.equal(commercial.record.audience, 'api-design-partner');

    const commercialRecords = await fetch(`${handle.url}/v1/commercial/readiness?audience=api-design-partner`, { headers: auth() }).then(res => res.json());
    assert.equal(commercialRecords.records.length, 1);

    const ops = await fetch(`${handle.url}/v1/ops`, { headers: auth() }).then(res => res.json());
    assert.equal(ops.summary.next_cycle_artifacts, 25);
    assert.equal(ops.summary.next_cycle_test_runs, 5);
    assert.ok(ops.summary.review_decision_records >= 3);
    assert.ok(ops.summary.pilot_operation_records >= 2);
    assert.ok(ops.summary.platform_hardening_records >= 2);
    assert.ok(ops.summary.agent_governance_records >= 2);
    assert.ok(ops.summary.commercial_readiness_records >= 2);
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves review-operating drain and signoff evidence over API', async () => {
  const handle = await makeServer();
  try {
    const drained = await fetch(`${handle.url}/v1/next-cycle/run`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'review-operating', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(drained.ok, true);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);
    assert.deepEqual(drained.results.map(result => result.phase), [
      'review_room_operating_session',
      'design_partner_pilot_entry',
      'production_reliability_slice',
      'governed_agent_runtime',
      'commercial_review_refill_signoff'
    ]);

    const phase44 = await fetch(`${handle.url}/v1/next-cycle/artifacts?phase=Phase%2044`, { headers: auth() }).then(res => res.json());
    assert.ok(phase44.artifacts.some(artifact => artifact.evidence.includes('HCAT-259')));
    assert.ok(phase44.artifacts.some(artifact => artifact.artifact_type === 'follow_on_drain_goal_criteria'));

    const ops = await fetch(`${handle.url}/v1/ops`, { headers: auth() }).then(res => res.json());
    assert.equal(ops.summary.next_cycle_artifacts, 25);
    assert.equal(ops.summary.next_cycle_test_runs, 5);
    assert.ok(ops.summary.review_decision_records >= 5);
    assert.ok(ops.summary.pilot_operation_records >= 2);
    assert.ok(ops.summary.import_review_rows >= 2);
    assert.ok(ops.summary.platform_hardening_records >= 1);
    assert.ok(ops.summary.agent_governance_records >= 2);
    assert.ok(ops.summary.commercial_readiness_records >= 3);
    assert.ok(ops.summary.release_gate_evaluations >= 2);
    assert.ok(ops.summary.hapa_decision_runs >= 1);
  } finally {
    handle.server.close();
    handle.core.close();
  }
});

test('serves parity docs UI drain and fixture evidence over API', async () => {
  const handle = await makeServer();
  try {
    const drained = await fetch(`${handle.url}/v1/next-cycle/run`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 'parity-docs-ui', actor: 'api-test' })
    }).then(res => res.json());
    assert.equal(drained.ok, true);
    assert.equal(drained.artifacts.length, 25);
    assert.equal(drained.test_runs.length, 5);
    assert.deepEqual(drained.results.map(result => result.phase), [
      'surface_parity_audit',
      'documentation_completion',
      'demo_data_expansion',
      'operator_ui_enhancement',
      'review_rehearsal_refill_qa'
    ]);

    const phase49 = await fetch(`${handle.url}/v1/next-cycle/artifacts?phase=Phase%2049`, { headers: auth() }).then(res => res.json());
    assert.ok(phase49.artifacts.some(artifact => artifact.evidence.includes('HCAT-284')));
    assert.ok(phase49.artifacts.some(artifact => artifact.artifact_type === 'next_drain_goal_acceptance'));

    const phase45 = await fetch(`${handle.url}/v1/next-cycle/artifacts?phase=Phase%2045`, { headers: auth() }).then(res => res.json());
    const matrix = phase45.artifacts.find(artifact => artifact.artifact_type === 'ui_cli_api_parity_matrix');
    assert.ok(matrix.payload.parity_rows.some(row => row.endpoint === '/v1/fixtures/demo-catalog-100/import'));

    const docs = await fetch(`${handle.url}/v1/docs`, { headers: auth() }).then(res => res.json());
    assert.ok(docs.docs.some(doc => doc.id === 'OPERATOR_GUIDE'));
    assert.ok(docs.docs.some(doc => doc.id === 'RELEASE_HANDOFF'));

    const ops = await fetch(`${handle.url}/v1/ops`, { headers: auth() }).then(res => res.json());
    assert.equal(ops.summary.next_cycle_artifacts, 25);
    assert.equal(ops.summary.next_cycle_test_runs, 5);
    assert.ok(ops.summary.skus >= 100);
    assert.ok(ops.summary.release_gate_evaluations >= 1);
  } finally {
    handle.server.close();
    handle.core.close();
  }
});
