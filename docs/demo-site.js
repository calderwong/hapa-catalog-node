const state = {
  view: window.location.hash?.replace('#', '') || 'items',
  query: '',
  category: '',
  brand: '',
  status: '',
  selectedSku: ''
};

const ASSET_VERSION = '20260607-forecast-dashboard-v3';
const VIEWS = ['items', 'board', 'cards', 'forecast', 'ops', 'docs'];

const els = {
  skuChip: document.querySelector('#skuChip'),
  boardChip: document.querySelector('#boardChip'),
  forecastChip: document.querySelector('#forecastChip'),
  generatedAt: document.querySelector('#generatedAt'),
  githubLink: document.querySelector('#githubLink'),
  searchInput: document.querySelector('#searchInput'),
  categoryFilter: document.querySelector('#categoryFilter'),
  brandFilter: document.querySelector('#brandFilter'),
  statusFilter: document.querySelector('#statusFilter'),
  fixtureStats: document.querySelector('#fixtureStats'),
  listTitle: document.querySelector('#listTitle'),
  listMeta: document.querySelector('#listMeta'),
  list: document.querySelector('#list'),
  inspectorBadge: document.querySelector('#inspectorBadge'),
  inspectorBody: document.querySelector('#inspectorBody')
};

let demo = null;

async function init() {
  if (!VIEWS.includes(state.view)) state.view = 'items';
  demo = await fetch(`demo-data.json?v=${ASSET_VERSION}`).then(response => response.json());
  state.selectedSku = demo.items[0]?.sku || '';
  els.githubLink.href = demo.repo.github_url;
  els.generatedAt.textContent = `Generated ${new Date(demo.generated_at).toLocaleString()}`;
  els.skuChip.textContent = `${demo.summary.skus} SKUs`;
  els.boardChip.textContent = `${demo.board.summary.done}/${demo.board.summary.total_tasks} cards`;
  els.forecastChip.textContent = `${demo.summary.forecast_runs} forecasts`;
  setOptions();
  renderFixtureStats();
  bindEvents();
  render();
}

function bindEvents() {
  els.searchInput.addEventListener('input', () => {
    state.query = els.searchInput.value.trim().toLowerCase();
    render();
  });
  [
    ['category', els.categoryFilter],
    ['brand', els.brandFilter],
    ['status', els.statusFilter]
  ].forEach(([key, element]) => {
    element.addEventListener('change', () => {
      state[key] = element.value;
      render();
    });
  });
  document.querySelectorAll('[data-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.view === state.view);
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-view]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      state.view = button.dataset.view;
      window.history.replaceState(null, '', `#${state.view}`);
      render();
    });
  });
}

function setOptions() {
  const optionSet = key => [...new Set(demo.items.map(item => item[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  setSelect(els.categoryFilter, 'All categories', optionSet('category'));
  setSelect(els.brandFilter, 'All brands', optionSet('brand'));
  setSelect(els.statusFilter, 'All states', optionSet('status'));
}

function setSelect(select, label, options) {
  select.innerHTML = [`<option value="">${escapeHtml(label)}</option>`, ...options.map(option => `<option value="${escapeAttribute(option)}">${escapeHtml(option)}</option>`)].join('');
}

function renderFixtureStats() {
  const diversity = demo.demo_fixture.diversity;
  els.fixtureStats.innerHTML = [
    metric('SKUs', diversity.count),
    metric('Categories', diversity.categories.length),
    metric('Brands', diversity.brands.length),
    metric('Suppliers', diversity.suppliers.length)
  ].join('');
}

function render() {
  if (state.view === 'items') renderItems();
  if (state.view === 'board') renderBoard();
  if (state.view === 'cards') renderCards();
  if (state.view === 'forecast') renderForecast();
  if (state.view === 'ops') renderOps();
  if (state.view === 'docs') renderDocs();
}

function renderItems() {
  const rows = filteredItems();
  els.listTitle.textContent = 'Item Master';
  els.listMeta.textContent = `${rows.length} of ${demo.items.length} rows`;
  els.list.className = 'list';
  els.list.innerHTML = [
    telemetry([
      ['Rows', rows.length],
      ['Categories', new Set(rows.map(item => item.category).filter(Boolean)).size],
      ['Brands', new Set(rows.map(item => item.brand).filter(Boolean)).size],
      ['States', new Set(rows.map(item => item.status).filter(Boolean)).size]
    ]),
    ...rows.map(item => `
      <article class="row ${item.sku === state.selectedSku ? 'selected' : ''}" data-sku="${escapeAttribute(item.sku)}" role="button" tabindex="0">
        <div>
          <strong>${escapeHtml(item.sku)}</strong>
          <small>${escapeHtml(item.sku_name)} / ${escapeHtml(item.brand || '')} / ${escapeHtml(item.category || '')}</small>
        </div>
        <span class="badge">${escapeHtml(item.status)}</span>
      </article>
    `)
  ].join('') || '<p class="empty">No matching items.</p>';
  els.list.querySelectorAll('[data-sku]').forEach(row => {
    row.addEventListener('click', () => {
      state.selectedSku = row.dataset.sku;
      renderItems();
    });
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        state.selectedSku = row.dataset.sku;
        renderItems();
      }
    });
  });
  const selected = demo.items.find(item => item.sku === state.selectedSku) || rows[0] || demo.items[0];
  renderItemInspector(selected);
}

function filteredItems() {
  return demo.items.filter(item => (
    (!state.category || item.category === state.category)
    && (!state.brand || item.brand === state.brand)
    && (!state.status || item.status === state.status)
    && [item.sku, item.sku_name, item.brand, item.category, item.status].join(' ').toLowerCase().includes(state.query)
  ));
}

function renderItemInspector(item) {
  if (!item) {
    els.inspectorBody.innerHTML = '<p class="empty">No item selected.</p>';
    return;
  }
  const positions = demo.inventory.filter(position => position.sku === item.sku).slice(0, 4);
  els.inspectorBadge.textContent = item.status;
  els.inspectorBody.innerHTML = `
    ${kv('SKU', item.sku)}
    ${kv('Name', item.sku_name)}
    ${kv('Brand', item.brand || 'unknown')}
    ${kv('Category', item.category || 'unknown')}
    ${kv('Supplier', item.supplier_name || 'unknown')}
    ${kv('Sales 30d', item.sales_30d ?? 0)}
    ${kv('Lead time', `${item.lead_time_days ?? 0} days`)}
    <div class="section">
      <h3>Inventory</h3>
      ${positions.map(pos => `<article class="checkpoint"><strong>${escapeHtml(pos.facility)} / ${escapeHtml(pos.location)}</strong><p>${pos.available} available, ${pos.on_hand} on hand, reorder at ${pos.reorder_point}</p></article>`).join('') || '<p class="empty">No inventory positions in snapshot.</p>'}
    </div>
  `;
}

function renderBoard() {
  const board = demo.board;
  els.listTitle.textContent = 'Kanban Board';
  els.listMeta.textContent = `${board.summary.done} done / ${board.summary.total_tasks} cards / ${board.event_count} events`;
  els.inspectorBadge.textContent = 'drained';
  els.list.className = 'list board-grid';
  els.list.innerHTML = board.columns.map(column => {
    const tasks = column.tasks.filter(task => [task.id, task.title, task.description, task.lane].join(' ').toLowerCase().includes(state.query));
    const sample = boardColumnPreview(column.id, tasks);
    return `
      <section class="kanban-column">
        <header><span>${escapeHtml(column.title)}</span><strong>${tasks.length}</strong></header>
        ${sample.map(task => taskCard(task)).join('') || '<p class="empty">No cards.</p>'}
      </section>
    `;
  }).join('');
  els.inspectorBody.innerHTML = `
    ${kv('Cards', `${board.summary.done} done / ${board.summary.total_tasks} total`)}
    ${kv('Backlog', board.summary.backlog)}
    ${kv('Events', board.event_count)}
    <div class="surface-status"><span class="dot ok"></span><div><strong>Board drained</strong><p>HCAT-260 through HCAT-284 are done in the append-only board log.</p></div></div>
    <div class="section">
      <h3>Latest Checkpoints</h3>
      ${board.checkpoints.map(checkpoint => `<article class="checkpoint"><strong>${escapeHtml(checkpoint.title)}</strong><p>${escapeHtml(checkpoint.summary)}</p><small>${escapeHtml(checkpoint.created_at || '')}</small></article>`).join('')}
    </div>
    ${demo.screenshot ? `<img class="hero-image" src="${escapeAttribute(demo.screenshot)}" alt="Drained .hapaCatalog board screenshot" />` : ''}
  `;
}

function boardColumnPreview(columnId, tasks) {
  if (state.query) return tasks.slice(0, 24);
  if (columnId === 'done') return tasks.slice(-10).reverse();
  if (tasks.length <= 20) return tasks;
  return [...tasks.slice(0, 5), ...tasks.slice(-15)];
}

function taskCard(task) {
  return `
    <article class="task-card">
      <strong>${escapeHtml(task.id)} <span class="badge">${escapeHtml(task.priority)}</span></strong>
      <h3>${escapeHtml(task.title)}</h3>
      <p>${escapeHtml(task.description)}</p>
    </article>
  `;
}

function renderCards() {
  const data = demo.hapa;
  els.listTitle.textContent = 'Hapa Cards';
  els.listMeta.textContent = `${data.cards.length} cards / ${data.placements.length} placements / ${data.processes.length} processes`;
  els.list.className = 'list card-grid';
  els.list.innerHTML = data.cards.map(card => `
    <article class="task-card">
      <strong>${escapeHtml(card.name)}</strong>
      <p>${escapeHtml(card.card_kind)} / ${escapeHtml(card.source_node)} / ${escapeHtml((card.skills || []).join(', '))}</p>
      <span class="badge">${escapeHtml(card.status)}</span>
    </article>
  `).join('');
  els.inspectorBadge.textContent = 'cards';
  els.inspectorBody.innerHTML = `
    ${kv('Placements', data.placements.length)}
    ${kv('Processes', data.processes.length)}
    ${kv('Decision runs', data.decision_runs.length)}
    <div class="section">
      <h3>Placement Examples</h3>
      ${data.placements.slice(0, 8).map(place => `<article class="checkpoint"><strong>${escapeHtml(place.role || place.placement_role || 'placement')}</strong><p>${escapeHtml(place.card_name || place.card_id)} -> ${escapeHtml(place.target_type)}:${escapeHtml(place.target_id)}</p></article>`).join('')}
    </div>
  `;
}

function renderForecast() {
  const dashboard = demo.forecast_dashboard;
  const rows = (dashboard.table.rows || []).filter(row => [row.key, row.label, row.level, row.risk_state, ...(row.skus || [])].join(' ').toLowerCase().includes(state.query));
  els.listTitle.textContent = 'Forecast Dashboard';
  els.listMeta.textContent = `${rows.length} rows / ${demo.forecast_runs.length} runs / ${dashboard.purchase_orders.length} purchase orders`;
  els.list.className = 'list forecast-dashboard';
  els.list.innerHTML = `
    ${staticForecastGraph(dashboard.graph)}
    ${staticForecastTable({ ...dashboard, table: { ...dashboard.table, rows } })}
  `;
  els.inspectorBadge.textContent = 'forecast';
  els.inspectorBody.innerHTML = `
    ${kv('Forecasts', demo.summary.forecast_runs)}
    ${kv('Actuals', demo.summary.forecast_actuals)}
    ${kv('Quality events', demo.summary.forecast_quality_events)}
    ${kv('Assumption sets', demo.forecast_experimentation.assumption_sets.length)}
    ${kv('Plan records', demo.forecast_experimentation.plan_records.length)}
    <div class="section">
      <h3>Active Assumption Set</h3>
      <p class="empty">${escapeHtml(dashboard.assumption_set?.name || 'No assumption set')}</p>
    </div>
    <div class="section">
      <h3>Methodology Comparison</h3>
      <p class="empty">${escapeHtml(demo.forecast_experimentation.comparison?.winner?.method || demo.forecast_experimentation.comparison?.winner?.key || 'Comparison available after local experiment run.')}</p>
    </div>
  `;
}

function staticForecastGraph(graph = {}) {
  const series = graph.series || [];
  const maxDemand = Math.max(1, ...series.map(point => Number(point.demand_units || 0)));
  return `
    <section class="forecast-graph">
      ${series.map(point => `
        <article class="forecast-bar ${point.kind}">
          <div class="bar-track"><span style="height:${Math.max(4, Math.round((point.demand_units / maxDemand) * 100))}%"></span></div>
          <strong>${escapeHtml(point.label)}</strong>
          <small>${Math.round(point.demand_units)} units / $${formatMoney(point.revenue)}</small>
        </article>
      `).join('')}
    </section>
  `;
}

function staticForecastTable(dashboard) {
  const buckets = dashboard.table.buckets || [];
  return `
    <section class="forecast-table-wrap">
      <table class="forecast-table">
        <thead><tr><th>Scope</th>${buckets.map(bucket => `<th><span>${escapeHtml(bucket.label)}</span><small>${escapeHtml(bucket.kind)}</small></th>`).join('')}</tr></thead>
        <tbody>
          ${(dashboard.table.rows || []).slice(0, 12).map(row => `
            <tr>
              <th><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(row.level)} / ${row.sku_count} SKU / ${escapeHtml(row.risk_state)}</small></th>
              ${row.buckets.map(bucket => bucket.kind === 'actual'
                ? `<td class="actual-cell"><strong>${Math.round(bucket.effective.units_sold || 0)}</strong><small>$${formatMoney(bucket.effective.revenue_sold)} rev</small><small>$${formatMoney(bucket.effective.total_cost)} cost</small></td>`
                : `<td class="forecast-cell"><strong>${Math.round(bucket.effective.projected_units || 0)}</strong><small>$${formatMoney(bucket.effective.projected_revenue)} rev</small><small>${bucket.supply.on_hand_time_units} ${escapeHtml(bucket.supply.time_unit)} supply</small><small>${bucket.supply.on_order_units} on order</small></td>`).join('')}
            </tr>
            <tr class="yoy-row"><th>YoY</th>${row.buckets.map(bucket => `<td>${bucket.yoy.units_variance_percent > 0 ? '+' : ''}${bucket.yoy.units_variance_percent}%</td>`).join('')}</tr>
          `).join('') || `<tr><td colspan="${buckets.length + 1}">No forecast dashboard rows.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
}

function renderOps() {
  const summary = demo.ops.summary;
  els.listTitle.textContent = 'Operations';
  els.listMeta.textContent = `${summary.next_cycle_artifacts} artifacts / ${summary.next_cycle_test_runs} test runs`;
  els.list.className = 'list';
  els.list.innerHTML = telemetry([
    ['Connectors', summary.connector_runs],
    ['Work orders', summary.quality_work_orders],
    ['Backups', summary.backup_runs],
    ['Release gates', summary.release_gate_evaluations]
  ]) + [
    ['Schema migrations', demo.ops.schema],
    ['Connector runs', demo.ops.connector_runs],
    ['Projection exports', demo.ops.projection_exports],
    ['Quality work orders', demo.ops.quality_work_orders],
    ['Commercial readiness', demo.ops.commercial_readiness_records]
  ].map(([title, rows]) => `<article class="checkpoint"><strong>${escapeHtml(title)}</strong><p>${rows.length} rows sampled from the local operations scaffold.</p></article>`).join('');
  els.inspectorBadge.textContent = 'ops';
  els.inspectorBody.innerHTML = `
    ${kv('Artifacts', summary.next_cycle_artifacts)}
    ${kv('Test runs', summary.next_cycle_test_runs)}
    ${kv('Audit events', summary.audit_events)}
    ${kv('Media assets', summary.media_assets)}
    <div class="section">
      <h3>Surface Parity</h3>
      <p class="empty">The live node exposes API, CLI, web, desktop, and docs coverage from the same core feature spine.</p>
    </div>
  `;
}

function renderDocs() {
  els.listTitle.textContent = 'Documentation';
  els.listMeta.textContent = `${demo.docs.length} docs in manifest`;
  els.list.className = 'list';
  els.list.innerHTML = demo.docs.map(doc => `
    <article class="row">
      <div>
        <strong><a class="doc-link" href="${escapeAttribute(doc.path.replace(/^docs\//, ''))}">${escapeHtml(doc.title)}</a></strong>
        <small>${escapeHtml((doc.covers || []).slice(0, 6).join(', '))}</small>
      </div>
      <span class="badge">${escapeHtml(doc.id)}</span>
    </article>
  `).join('');
  els.inspectorBadge.textContent = 'docs';
  els.inspectorBody.innerHTML = `
    ${kv('Docs', demo.docs.length)}
    ${kv('Endpoints', Object.keys(demo.capabilities.endpoints).length)}
    ${kv('CLI commands', demo.capabilities.cli_commands.length)}
    ${kv('Web controls', demo.capabilities.web_controls.length)}
    <div class="section">
      <h3>Hosted Demo Boundary</h3>
      <p class="empty">GitHub Pages is a read-only snapshot. Run the local node for authenticated writes, imports, market retrieval, forecasts, and board drain operations.</p>
    </div>
  `;
}

function telemetry(items) {
  return `<section class="telemetry-grid">${items.map(([label, value]) => metric(label, value)).join('')}</section>`;
}

function metric(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function kv(label, value) {
  return `<div class="kv"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value ?? ''))}</strong></div>`;
}

function formatMoney(value = 0) {
  return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function escapeAttribute(value = '') {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

init().catch(error => {
  els.listTitle.textContent = 'Demo unavailable';
  els.listMeta.textContent = 'Load failed';
  els.list.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
});
