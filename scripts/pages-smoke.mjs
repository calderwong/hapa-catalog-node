import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const docsDir = join(root, 'docs');
const index = readFileSync(join(docsDir, 'index.html'), 'utf8');
const script = readFileSync(join(docsDir, 'demo-site.js'), 'utf8');
const styles = readFileSync(join(docsDir, 'demo-site.css'), 'utf8');
const dataText = readFileSync(join(docsDir, 'demo-data.json'), 'utf8');
const data = JSON.parse(dataText);

assert.ok(index.includes('id="demoApp"'));
assert.ok(index.includes('demo-site.js'));
assert.ok(index.includes('forecast-dashboard-v5'));
assert.ok(script.includes('demo-data.json'));
assert.ok(script.includes('function formatMoney'));
assert.ok(script.includes('staticDemandLineChart'));
assert.ok(script.includes('forecastMetric'));
assert.ok(script.includes('forecastIncrement'));
assert.ok(script.includes('FORECAST_OVERRIDE_STORAGE_KEY'));
assert.ok(styles.includes('--cyan'));
assert.equal(data.ok, true);
assert.ok(data.items.length >= 100);
assert.ok(data.board.summary.total_tasks >= data.board.summary.done);
assert.equal(data.board.summary.blocked, 0);
assert.ok(data.board.summary.active + data.board.summary.backlog >= 0);
assert.ok(data.docs.some(doc => doc.id === 'GITHUB_PAGES_DEMO'));
assert.ok(data.capabilities.supported_operations.includes('next_cycle.parity_docs_ui.run'));
assert.ok(data.demo_fixture.diversity.categories.length >= 8);
assert.equal(data.forecast_dashboard.ok, true);
assert.equal(data.forecast_dashboards.days.category.ok, true);
assert.equal(data.forecast_dashboards.weeks.category.ok, true);
assert.equal(data.forecast_dashboards.months.category.ok, true);
assert.equal(data.forecast_dashboards.quarters.category.ok, true);
assert.equal(data.forecast_dashboards.years.category.ok, true);
assert.equal(data.forecast_dashboards.weeks.brand.ok, true);
assert.equal(data.forecast_dashboards.weeks.state.ok, true);
assert.equal(data.forecast_dashboards.weeks.sku.ok, true);
assert.equal(data.forecast_dashboard.table.buckets.length, 12);
assert.ok(data.forecast_dashboard.table.rows.length >= 8);
assert.ok(data.forecast_dashboard.graph.series.length >= 12);
assert.ok(data.forecast_dashboard.purchase_orders.length >= 40);
assert.equal(data.forecast_experimentation.ok, true);
assert.ok(data.forecast_experimentation.assumption_sets.length >= 3);
assert.equal(dataText.includes('/Users/'), false);
if (data.screenshot) assert.ok(existsSync(join(docsDir, data.screenshot)));

console.log(JSON.stringify({
  ok: true,
  files: ['docs/index.html', 'docs/demo-site.css', 'docs/demo-site.js', 'docs/demo-data.json'],
  items: data.items.length,
  board: data.board.summary,
  docs: data.docs.length
}, null, 2));
