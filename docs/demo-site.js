const state = {
  view: window.location.hash?.replace('#', '') || 'items',
  query: '',
  category: '',
  brand: '',
  status: '',
  selectedSku: '',
  forecastMetric: 'demand_units',
  forecastGrain: 'category',
  forecastIncrement: 'weeks',
  forecastOverrideReason: 'planning adjustment',
  forecastOverrides: []
};

const ASSET_VERSION = '20260607-forecast-dashboard-v5';
const VIEWS = ['items', 'board', 'cards', 'forecast', 'ops', 'docs'];
const FORECAST_OVERRIDE_STORAGE_KEY = 'hapaCatalogForecastOverrides:v1';
const FORECAST_INCREMENTS = [
  { key: 'days', label: 'Day' },
  { key: 'weeks', label: 'Week' },
  { key: 'months', label: 'Month' },
  { key: 'quarters', label: 'Quarter' },
  { key: 'years', label: 'Year' }
];
const FORECAST_METRICS = [
  { key: 'demand_units', label: 'Units', actual: 'Units sold', forecast: 'Projected units', format: 'number' },
  { key: 'revenue', label: 'Revenue', actual: 'Revenue sold', forecast: 'Projected revenue', format: 'money' },
  { key: 'cost', label: 'Cost / COGS', actual: 'Total cost', forecast: 'COGS', format: 'money' },
  { key: 'inventory', label: 'Inventory', actual: 'On hand', forecast: 'Projected on hand', format: 'number' },
  { key: 'supply', label: 'Supply', actual: 'Time-unit supply', forecast: 'Time-unit supply', format: 'decimal' },
  { key: 'on_order', label: 'On order', actual: 'On-order units', forecast: 'On-order units', format: 'number' }
];

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
let memoryForecastOverrides = [];

async function init() {
  if (!VIEWS.includes(state.view)) state.view = 'items';
  demo = await fetch(`demo-data.json?v=${ASSET_VERSION}`).then(response => response.json());
  state.forecastOverrides = loadForecastOverrides();
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
  const dashboard = selectedForecastDashboard();
  const metricConfig = forecastMetricConfig();
  const rows = forecastFilteredRows(dashboard);
  const demandSeries = demandSeriesFromRows(dashboard.table.buckets || [], rows);
  const activeOverrideCount = activeForecastOverrides().length;
  els.listTitle.textContent = 'Forecast Dashboard';
  els.listMeta.textContent = `${rows.length} ${state.forecastGrain} rows / ${state.forecastIncrement} / ${metricConfig.label} / ${activeOverrideCount} changes`;
  els.list.className = 'list forecast-dashboard';
  els.list.innerHTML = `
    ${forecastControls(dashboard, metricConfig)}
    ${staticDemandLineChart(demandSeries)}
    ${staticForecastTable({ ...dashboard, table: { ...dashboard.table, rows } }, metricConfig)}
  `;
  attachForecastControls();
  els.inspectorBadge.textContent = 'forecast';
  renderForecastInspector(dashboard, metricConfig);
}

function renderForecastInspector(dashboard, metricConfig) {
  const changes = activeForecastOverrides();
  els.inspectorBody.innerHTML = `
    ${kv('Grain', state.forecastGrain)}
    ${kv('Time unit', state.forecastIncrement)}
    ${kv('Metric', metricConfig.label)}
    ${kv('Changes', changes.length)}
    ${kv('Forecasts', demo.summary.forecast_runs)}
    <div class="section">
      <h3>Assumption Set</h3>
      <p class="empty">${escapeHtml(dashboard.assumption_set?.name || 'No assumption set')}</p>
    </div>
    <div class="section">
      <h3>Change Ledger</h3>
      ${changes.length ? changes.slice(0, 8).map(change => `
        <article class="change-card">
          <strong>${escapeHtml(change.scope_label)} / ${escapeHtml(change.bucket_label)}</strong>
          <p>${escapeHtml(change.metric_label)}: ${formatMetricValue(change.original_value, metricConfigForKey(change.metric))} -> ${formatMetricValue(change.override_value, metricConfigForKey(change.metric))}</p>
          <small>${escapeHtml(change.reason)} / ${escapeHtml(new Date(change.created_at).toLocaleString())}</small>
          <button type="button" data-revert-override="${escapeAttribute(change.id)}">Revert</button>
        </article>
      `).join('') : '<p class="empty">No forecast changes for this grain and time unit.</p>'}
      ${changes.length ? '<button type="button" id="clearForecastOverrides">Clear changes</button>' : ''}
    </div>
  `;
  attachForecastLedgerControls();
}

function selectedForecastDashboard() {
  return demo.forecast_dashboards?.[state.forecastIncrement]?.[state.forecastGrain]
    || demo.forecast_dashboards?.[state.forecastGrain]
    || demo.forecast_dashboard;
}

function forecastMetricConfig() {
  return FORECAST_METRICS.find(metric => metric.key === state.forecastMetric) || FORECAST_METRICS[0];
}

function forecastControls(dashboard, metricConfig) {
  const filterLabels = [
    state.query ? `Search: ${state.query}` : '',
    state.category ? `Category: ${state.category}` : '',
    state.brand ? `Brand: ${state.brand}` : '',
    state.status ? `State: ${state.status}` : ''
  ].filter(Boolean);
  return `
    <section class="forecast-toolbar" aria-label="Forecast table controls">
      <label>
        <span>Metric</span>
        <select id="forecastMetric">
          ${FORECAST_METRICS.map(metric => `<option value="${escapeAttribute(metric.key)}" ${metric.key === state.forecastMetric ? 'selected' : ''}>${escapeHtml(metric.label)}</option>`).join('')}
        </select>
      </label>
      <label>
        <span>Grain</span>
        <select id="forecastGrain">
          ${['category', 'brand', 'state', 'sku'].map(grain => `<option value="${escapeAttribute(grain)}" ${grain === state.forecastGrain ? 'selected' : ''}>${escapeHtml(grain)}</option>`).join('')}
        </select>
      </label>
      <label>
        <span>Time unit</span>
        <select id="forecastIncrement">
          ${FORECAST_INCREMENTS.map(increment => `<option value="${escapeAttribute(increment.key)}" ${increment.key === state.forecastIncrement ? 'selected' : ''}>${escapeHtml(increment.label)}</option>`).join('')}
        </select>
      </label>
      <label class="reason-field">
        <span>Reason</span>
        <input id="forecastOverrideReason" value="${escapeAttribute(state.forecastOverrideReason)}" />
      </label>
      <div class="forecast-legend" aria-label="Actual and forecast legend">
        <span class="legend-chip actual">Actual</span>
        <span class="legend-chip forecast">Forecast</span>
        <span class="legend-chip modified">Modified</span>
      </div>
      <p>${escapeHtml(metricConfig.actual)} switches to ${escapeHtml(metricConfig.forecast)} at the forecast boundary. ${filterLabels.length ? `Filters: ${filterLabels.join(' / ')}` : 'Sidebar search and filters apply to this table.'}</p>
    </section>
  `;
}

function attachForecastControls() {
  const metricSelect = els.list.querySelector('#forecastMetric');
  const grainSelect = els.list.querySelector('#forecastGrain');
  const incrementSelect = els.list.querySelector('#forecastIncrement');
  const reasonInput = els.list.querySelector('#forecastOverrideReason');
  metricSelect?.addEventListener('change', () => {
    state.forecastMetric = metricSelect.value;
    renderForecast();
  });
  grainSelect?.addEventListener('change', () => {
    state.forecastGrain = grainSelect.value;
    renderForecast();
  });
  incrementSelect?.addEventListener('change', () => {
    state.forecastIncrement = incrementSelect.value;
    renderForecast();
  });
  reasonInput?.addEventListener('input', () => {
    state.forecastOverrideReason = reasonInput.value.trim() || 'planning adjustment';
  });
  els.list.querySelectorAll('[data-override-apply]').forEach(button => {
    button.addEventListener('click', () => {
      applyForecastOverride(button);
    });
  });
}

function forecastFilteredRows(dashboard) {
  return (dashboard.table.rows || []).filter(row => forecastRowMatches(row));
}

function forecastRowMatches(row) {
  const rowItems = (row.skus || []).map(sku => demo.items.find(item => item.sku === sku)).filter(Boolean);
  const text = [
    row.key,
    row.label,
    row.level,
    row.risk_state,
    ...(row.skus || []),
    ...rowItems.flatMap(item => [item.sku_name, item.brand, item.category, item.status])
  ].join(' ').toLowerCase();
  return (!state.query || text.includes(state.query))
    && (!state.category || rowItems.some(item => item.category === state.category) || row.label === state.category)
    && (!state.brand || rowItems.some(item => item.brand === state.brand) || row.label === state.brand)
    && (!state.status || rowItems.some(item => item.status === state.status) || row.label === state.status);
}

function demandSeriesFromRows(buckets, rows) {
  return buckets.map((bucket, bucketIndex) => {
    const demand = rows.reduce((total, row) => total + Number(effectiveMetricValue(row, row.buckets[bucketIndex], 'demand_units', bucketIndex) || 0), 0);
    const revenue = rows.reduce((total, row) => total + Number(effectiveMetricValue(row, row.buckets[bucketIndex], 'revenue', bucketIndex) || 0), 0);
    return { ...bucket, demand_units: demand, revenue };
  });
}

function staticDemandLineChart(series = []) {
  const maxDemand = Math.max(1, ...series.map(point => Number(point.demand_units || 0)));
  const width = 720;
  const height = 210;
  const padX = 32;
  const padY = 24;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;
  const step = series.length > 1 ? innerWidth / (series.length - 1) : innerWidth;
  const points = series.map((point, index) => {
    const x = padX + index * step;
    const y = padY + innerHeight - (Number(point.demand_units || 0) / maxDemand) * innerHeight;
    return `${roundSvg(x)},${roundSvg(y)}`;
  }).join(' ');
  return `
    <section class="forecast-chart" aria-label="Sales and demand line chart">
      <div class="forecast-chart-head">
        <strong>Sales / Demand Trend</strong>
        <span>bars plus line, filtered to the current table</span>
      </div>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Actual sales and forecast demand by week">
        <line class="axis" x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}"></line>
        ${series.map((point, index) => {
          const barWidth = Math.max(12, step * 0.42);
          const x = padX + index * step - barWidth / 2;
          const barHeight = Math.max(3, (Number(point.demand_units || 0) / maxDemand) * innerHeight);
          const y = height - padY - barHeight;
          return `<rect class="histogram-bar ${point.kind}" x="${roundSvg(x)}" y="${roundSvg(y)}" width="${roundSvg(barWidth)}" height="${roundSvg(barHeight)}"></rect>`;
        }).join('')}
        <polyline class="demand-line" points="${points}"></polyline>
        ${series.map((point, index) => {
          const [x, y] = points.split(' ')[index].split(',');
          return `<circle class="demand-point ${point.kind}" cx="${x}" cy="${y}" r="4"></circle>`;
        }).join('')}
      </svg>
      <div class="chart-labels">
        ${series.map(point => `<span>${escapeHtml(point.label)}</span>`).join('')}
      </div>
    </section>
    <section class="forecast-mini-bars" aria-label="Demand bucket details">
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

function staticForecastTable(dashboard, metricConfig) {
  const buckets = dashboard.table.buckets || [];
  return `
    <section class="forecast-table-wrap">
      <table class="forecast-table">
        <thead><tr><th>Scope</th>${buckets.map(bucket => `<th class="${escapeAttribute(bucket.kind)}-period"><span>${escapeHtml(bucket.label)}</span><small>${bucket.kind === 'actual' ? escapeHtml(metricConfig.actual) : escapeHtml(metricConfig.forecast)}</small></th>`).join('')}</tr></thead>
        <tbody>
          ${(dashboard.table.rows || []).slice(0, 12).map(row => `
            <tr class="metric-row">
              <th><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(row.level)} / ${row.sku_count} SKU / ${escapeHtml(row.risk_state)}</small></th>
              ${row.buckets.map((bucket, bucketIndex) => renderMetricCell(row, bucket, bucketIndex, metricConfig)).join('')}
            </tr>
            <tr class="yoy-row"><th>YoY demand</th>${row.buckets.map(bucket => `<td>${bucket.yoy.units_variance_percent > 0 ? '+' : ''}${bucket.yoy.units_variance_percent}%</td>`).join('')}</tr>
          `).join('') || `<tr><td colspan="${buckets.length + 1}">No forecast dashboard rows.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
}

function renderMetricCell(row, bucket, bucketIndex, metricConfig) {
  const base = metricValue(bucket, metricConfig.key);
  const override = forecastOverrideFor(row, bucket, metricConfig.key);
  const effective = bucket.kind === 'forecast' && override ? Number(override.override_value) : base;
  const classes = [
    bucket.kind === 'actual' ? 'actual-cell' : 'forecast-cell',
    override ? 'modified-cell' : ''
  ].filter(Boolean).join(' ');
  if (bucket.kind !== 'forecast') {
    return `<td class="${classes}"><strong>${formatMetricValue(effective, metricConfig)}</strong><small>actual</small></td>`;
  }
  return `
    <td class="${classes}">
      <strong>${formatMetricValue(effective, metricConfig)}</strong>
      <small>${override ? 'modified forecast' : 'forecast'}</small>
      <div class="override-control">
        <input
          type="number"
          min="0"
          step="${escapeAttribute(metricInputStep(metricConfig))}"
          value="${escapeAttribute(formatInputValue(effective, metricConfig))}"
          aria-label="Override ${escapeAttribute(row.label)} ${escapeAttribute(bucket.label)} ${escapeAttribute(metricConfig.label)}"
        />
        <button
          type="button"
          data-override-apply="true"
          data-row-key="${escapeAttribute(row.key)}"
          data-row-label="${escapeAttribute(row.label)}"
          data-bucket-index="${bucketIndex}"
          data-bucket-start="${escapeAttribute(bucket.bucket_start)}"
          data-bucket-label="${escapeAttribute(bucket.label)}"
          data-metric="${escapeAttribute(metricConfig.key)}"
        >Set</button>
      </div>
    </td>
  `;
}

function metricValue(bucket, metricKey) {
  if (!bucket) return 0;
  const effective = bucket.effective || {};
  if (metricKey === 'demand_units') return bucket.kind === 'actual' ? effective.units_sold : effective.projected_units;
  if (metricKey === 'revenue') return bucket.kind === 'actual' ? effective.revenue_sold : effective.projected_revenue;
  if (metricKey === 'cost') return bucket.kind === 'actual' ? effective.total_cost : effective.cost_of_goods_sold;
  if (metricKey === 'inventory') return bucket.kind === 'actual' ? bucket.supply?.on_hand_units : effective.projected_inventory_on_hand;
  if (metricKey === 'supply') return bucket.supply?.on_hand_time_units;
  if (metricKey === 'on_order') return bucket.supply?.on_order_units;
  return bucket.kind === 'actual' ? effective.units_sold : effective.projected_units;
}

function effectiveMetricValue(row, bucket, metricKey, bucketIndex) {
  const base = metricValue(bucket, metricKey);
  if (bucket?.kind !== 'forecast') return base;
  const override = forecastOverrideFor(row, bucket, metricKey, bucketIndex);
  return override ? Number(override.override_value) : base;
}

function formatMetricValue(value, metricConfig) {
  const number = Number(value || 0);
  if (metricConfig.format === 'money') return `$${formatMoney(number)}`;
  if (metricConfig.format === 'decimal') return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return Math.round(number).toLocaleString();
}

function metricInputStep(metricConfig) {
  if (metricConfig.format === 'decimal') return '0.1';
  return '1';
}

function formatInputValue(value, metricConfig) {
  const number = Number(value || 0);
  if (metricConfig.format === 'decimal') return number.toFixed(2);
  return String(Math.round(number));
}

function loadForecastOverrides() {
  try {
    if (!globalThis.localStorage) return memoryForecastOverrides;
    const parsed = JSON.parse(localStorage.getItem(FORECAST_OVERRIDE_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return memoryForecastOverrides;
  }
}

function saveForecastOverrides() {
  memoryForecastOverrides = [...state.forecastOverrides];
  try {
    if (globalThis.localStorage) localStorage.setItem(FORECAST_OVERRIDE_STORAGE_KEY, JSON.stringify(state.forecastOverrides));
  } catch {
    // Static demo keeps in-memory changes when browser storage is unavailable.
  }
}

function activeForecastOverrides() {
  return state.forecastOverrides
    .filter(change => change.increment === state.forecastIncrement && change.grain === state.forecastGrain)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function forecastOverrideKey({ rowKey, bucketStart, metric }) {
  return [state.forecastIncrement, state.forecastGrain, rowKey, bucketStart, metric].join('|');
}

function forecastOverrideFor(row, bucket, metric, bucketIndex = 0) {
  const key = forecastOverrideKey({
    rowKey: row.key,
    bucketStart: bucket?.bucket_start || bucketIndex,
    metric
  });
  return state.forecastOverrides.find(change => change.key === key) || null;
}

function applyForecastOverride(button) {
  const cell = button.closest('td');
  const input = cell?.querySelector('input');
  const overrideValue = Number(input?.value);
  if (!Number.isFinite(overrideValue) || overrideValue < 0) return;
  const dashboard = selectedForecastDashboard();
  const row = (dashboard.table.rows || []).find(item => item.key === button.dataset.rowKey);
  const bucketIndex = Number(button.dataset.bucketIndex || 0);
  const bucket = row?.buckets?.[bucketIndex];
  if (!row || !bucket) return;
  const metric = button.dataset.metric || state.forecastMetric;
  const metricConfig = metricConfigForKey(metric);
  const originalValue = metricValue(bucket, metric);
  const key = forecastOverrideKey({
    rowKey: row.key,
    bucketStart: button.dataset.bucketStart,
    metric
  });
  const change = {
    id: `forecast-change-${Date.now()}`,
    key,
    created_at: new Date().toISOString(),
    increment: state.forecastIncrement,
    grain: state.forecastGrain,
    scope_key: row.key,
    scope_label: button.dataset.rowLabel || row.label,
    bucket_start: button.dataset.bucketStart,
    bucket_label: button.dataset.bucketLabel || bucket.label,
    metric,
    metric_label: metricConfig.label,
    original_value: originalValue,
    override_value: overrideValue,
    reason: state.forecastOverrideReason || 'planning adjustment',
    actor: 'pages-demo-user'
  };
  state.forecastOverrides = [change, ...state.forecastOverrides.filter(item => item.key !== key)];
  saveForecastOverrides();
  renderForecast();
}

function attachForecastLedgerControls() {
  els.inspectorBody.querySelectorAll('[data-revert-override]').forEach(button => {
    button.addEventListener('click', () => {
      state.forecastOverrides = state.forecastOverrides.filter(change => change.id !== button.dataset.revertOverride);
      saveForecastOverrides();
      renderForecast();
    });
  });
  els.inspectorBody.querySelector('#clearForecastOverrides')?.addEventListener('click', () => {
    const activeKeys = new Set(activeForecastOverrides().map(change => change.key));
    state.forecastOverrides = state.forecastOverrides.filter(change => !activeKeys.has(change.key));
    saveForecastOverrides();
    renderForecast();
  });
}

function metricConfigForKey(metric) {
  return FORECAST_METRICS.find(item => item.key === metric) || FORECAST_METRICS[0];
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

function roundSvg(value) {
  return Number(value || 0).toFixed(2);
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
