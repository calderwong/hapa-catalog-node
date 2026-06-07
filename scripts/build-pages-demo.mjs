import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCore } from '../src/catalog-core.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const docsDir = join(root, 'docs');
const assetsDir = join(docsDir, 'assets');
const outputPath = join(docsDir, 'demo-data.json');
const screenshotSource = join(root, '..', 'outputs', 'hapa-catalog-board-drained.png');
const screenshotTarget = join(assetsDir, 'hapa-catalog-board-drained.png');

const core = createCore();

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, nested] of Object.entries(value)) {
      if (key === 'source_path') continue;
      if (key === 'links' && Array.isArray(nested)) {
        clean[key] = nested.filter(link => typeof link === 'string' && !link.startsWith('/Users/'));
        continue;
      }
      clean[key] = sanitize(nested);
    }
    return clean;
  }
  if (typeof value === 'string' && value.includes('/Users/')) {
    return value.replace(/\/Users\/[^\s,)"']+/g, '[local-path-redacted]');
  }
  return value;
}

function compactBoard(board) {
  return {
    ...sanitize(board),
    columns: board.columns.map(column => ({
      id: column.id,
      title: column.title,
      tasks: column.tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        column: task.column,
        lane: task.lane,
        owner: task.owner,
        priority: task.priority,
        tags: task.tags,
        requirements: task.requirements,
        evidence: task.evidence?.slice(0, 6) || [],
        updated_at: task.updated_at
      }))
    }))
  };
}

function compactOps(ops) {
  return {
    ok: true,
    summary: ops.summary,
    schema: ops.schema.slice(0, 6),
    connector_runs: ops.connector_runs.slice(0, 8),
    projection_exports: ops.projection_exports.slice(0, 8),
    quality_work_orders: ops.quality_work_orders.slice(0, 8),
    backup_runs: ops.backup_runs.slice(0, 8),
    release_gate_evaluations: ops.release_gate_evaluations.slice(0, 8),
    agent_governance_records: ops.agent_governance_records.slice(0, 8),
    commercial_readiness_records: ops.commercial_readiness_records.slice(0, 8)
  };
}

const FORECAST_GRAINS = ['category', 'brand', 'state', 'sku'];
const FORECAST_INCREMENTS = ['days', 'weeks', 'months', 'quarters', 'years'];

function compactForecastDashboard(dashboard) {
  return {
    ok: dashboard.ok,
    contract: dashboard.contract,
    filter_state: dashboard.filter_state,
    hierarchy: dashboard.hierarchy,
    assumption_set: dashboard.assumption_set,
    purchase_orders: dashboard.purchase_orders.map(order => ({
      id: order.id,
      sku_id: order.sku_id,
      units: order.units,
      status: order.status,
      expected_delivery_date: order.expected_delivery_date
    })),
    graph: {
      series: (dashboard.graph?.series || []).map(point => ({
        label: point.label,
        kind: point.kind,
        demand_units: point.demand_units,
        revenue: point.revenue,
        cost: point.cost,
        inventory_on_hand: point.inventory_on_hand
      }))
    },
    table: {
      increment: dashboard.table.increment,
      granularity: dashboard.table.granularity,
      buckets: dashboard.table.buckets.map(bucket => ({
        index: bucket.index,
        label: bucket.label,
        bucket_start: bucket.bucket_start,
        bucket_end: bucket.bucket_end,
        kind: bucket.kind,
        days: bucket.days
      })),
      rows: dashboard.table.rows.map(row => ({
        key: row.key,
        label: row.label,
        level: row.level,
        sku_count: row.sku_count,
        skus: row.skus,
        risk_state: row.risk_state,
        buckets: row.buckets.map(bucket => ({
          index: bucket.index,
          label: bucket.label,
          bucket_start: bucket.bucket_start,
          bucket_end: bucket.bucket_end,
          kind: bucket.kind,
          effective: {
            units_sold: bucket.effective?.units_sold,
            revenue_sold: bucket.effective?.revenue_sold,
            total_cost: bucket.effective?.total_cost,
            projected_units: bucket.effective?.projected_units,
            projected_revenue: bucket.effective?.projected_revenue,
            cost_of_goods_sold: bucket.effective?.cost_of_goods_sold,
            projected_inventory_on_hand: bucket.effective?.projected_inventory_on_hand,
            supply_on_order_units: bucket.effective?.supply_on_order_units
          },
          yoy: bucket.yoy,
          supply: {
            time_unit: bucket.supply?.time_unit,
            on_hand_units: bucket.supply?.on_hand_units,
            on_hand_time_units: bucket.supply?.on_hand_time_units,
            on_order_units: bucket.supply?.on_order_units,
            on_order_time_units: bucket.supply?.on_order_time_units,
            received_units: bucket.supply?.received_units,
            risk_state: bucket.supply?.risk_state
          }
        }))
      }))
    }
  };
}

function buildForecastDashboards() {
  return Object.fromEntries(FORECAST_INCREMENTS.map(increment => [
    increment,
    Object.fromEntries(FORECAST_GRAINS.map(granularity => [
      granularity,
      compactForecastDashboard(core.forecastDashboard({ granularity, increment, sort_by: 'supply_time_units' }))
    ]))
  ]));
}

const items = core.listItems({ limit: 120 }).items;
const selectedItem = items[0] ? core.getItem(items[0].sku).item : null;
const demoFixture = core.demoCatalogRecords({ limit: 100 });
const marketPrices = core.marketPrices({ limit: 120 });
const marketListing = core.marketListingData({ limit: 120 });
const forecastDashboards = buildForecastDashboards();
const forecastDashboard = forecastDashboards.weeks.category;
const forecastExperimentation = core.forecastExperimentation({ granularity: 'category', increment: 'weeks' });
const board = core.kanbanBoard().board;
const ops = core.opsOverview();
const docs = core.docs().docs;
const capabilities = core.capabilities();

mkdirSync(assetsDir, { recursive: true });
if (existsSync(screenshotSource)) {
  copyFileSync(screenshotSource, screenshotTarget);
}

const payload = sanitize({
  ok: true,
  generated_at: new Date().toISOString(),
  repo: {
    name: 'hapa-catalog-node',
    github_url: 'https://github.com/calderwong/hapa-catalog-node',
    pages_url: 'https://calderwong.github.io/hapa-catalog-node/',
    live_local_url: 'http://127.0.0.1:8768',
    mode: 'static GitHub Pages snapshot'
  },
  health: core.health(),
  summary: core.summary().summary,
  capabilities: {
    supported_operations: capabilities.supported_operations,
    endpoints: capabilities.endpoints,
    cli_commands: core.cliCommandCatalog(),
    web_controls: core.webControlCatalog()
  },
  items,
  selected_item: selectedItem,
  inventory: core.inventory({ limit: 120 }).positions,
  forecast_runs: core.store.listForecastRuns().slice(0, 40),
  forecast_dashboard: forecastDashboard,
  forecast_dashboards: forecastDashboards,
  forecast_experimentation: forecastExperimentation,
  market: {
    snapshots: marketPrices.snapshots,
    points: marketPrices.points,
    summary: marketPrices.summary,
    listings: marketListing.listings,
    media: marketListing.media,
    listing_summary: marketListing.summary
  },
  hapa: {
    cards: core.hapaCards({ limit: 200 }).cards,
    placements: core.cardPlacements({ limit: 300 }).placements,
    processes: core.hapaProcesses({ limit: 100 }).processes,
    decision_runs: core.hapaDecisionRuns({ limit: 50 }).runs
  },
  board: compactBoard(board),
  ops: compactOps(ops),
  docs,
  demo_fixture: {
    source: demoFixture.source,
    count: demoFixture.count,
    diversity: core.demoCatalogDiversity(demoFixture.records)
  },
  screenshot: existsSync(screenshotTarget) ? 'assets/hapa-catalog-board-drained.png' : ''
});

writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify({
  ok: true,
  output: 'docs/demo-data.json',
  items: payload.items.length,
  board: payload.board.summary,
  docs: payload.docs.length,
  screenshot: payload.screenshot || null
}, null, 2));
