const state = {
  token: sessionStorage.getItem('hapaCatalogToken') || '',
  view: 'items',
  filters: {
    category: '',
    brand: '',
    status: ''
  },
  items: [],
  board: null,
  market: null,
  workbench: null,
  quality: null,
  ops: null,
  forecastDashboard: null,
  forecastExperimentation: null,
  forecastFilters: {
    granularity: 'sku',
    increment: 'weeks',
    sort_by: 'supply_time_units',
    sort_direction: 'asc',
    supply_logic: 'and',
    in_stock: '',
    on_order: ''
  },
  hapaCards: null,
  activeCardId: '',
  dragCardId: '',
  selected: null
};

const els = {
  tokenInput: document.querySelector('#tokenInput'),
  saveToken: document.querySelector('#saveToken'),
  loadSample: document.querySelector('#loadSample'),
  loadDemo: document.querySelector('#loadDemo'),
  refresh: document.querySelector('#refresh'),
  healthDot: document.querySelector('#healthDot'),
  healthText: document.querySelector('#healthText'),
  skuCount: document.querySelector('#skuCount'),
  forecastCount: document.querySelector('#forecastCount'),
  boardCount: document.querySelector('#boardCount'),
  marketCount: document.querySelector('#marketCount'),
  searchInput: document.querySelector('#searchInput'),
  categoryFilter: document.querySelector('#categoryFilter'),
  brandFilter: document.querySelector('#brandFilter'),
  statusFilter: document.querySelector('#statusFilter'),
  marketLookupInput: document.querySelector('#marketLookupInput'),
  retrieveMarket: document.querySelector('#retrieveMarket'),
  marketStatus: document.querySelector('#marketStatus'),
  list: document.querySelector('#list'),
  listTitle: document.querySelector('#listTitle'),
  listMeta: document.querySelector('#listMeta'),
  inspectorBody: document.querySelector('#inspectorBody'),
  runForecast: document.querySelector('#runForecast')
};

els.tokenInput.value = state.token;
els.saveToken.addEventListener('click', () => {
  state.token = els.tokenInput.value.trim();
  sessionStorage.setItem('hapaCatalogToken', state.token);
  refreshAll();
});
els.refresh.addEventListener('click', refreshAll);
els.searchInput.addEventListener('input', () => {
  if (state.view === 'items') {
    loadItems(els.searchInput.value);
  } else {
    renderView();
  }
});
[
  ['category', els.categoryFilter],
  ['brand', els.brandFilter],
  ['status', els.statusFilter]
].forEach(([key, element]) => {
  element.addEventListener('change', () => {
    state.filters[key] = element.value;
    renderView();
  });
});
els.loadSample.addEventListener('click', importSample);
els.loadDemo.addEventListener('click', importDemoCatalog);
els.runForecast.addEventListener('click', runForecastForSelected);
els.retrieveMarket.addEventListener('click', retrieveMarketForLookup);

document.querySelectorAll('.nav').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    state.view = button.dataset.view;
    renderView();
  });
});

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || payload.error_code || response.statusText);
  }
  return payload;
}

async function checkHealth() {
  try {
    const health = await fetch('/health').then(result => result.json());
    els.healthDot.className = 'dot ok';
    els.healthText.textContent = health.status;
    return health;
  } catch (error) {
    els.healthDot.className = 'dot bad';
    els.healthText.textContent = error.message;
    return null;
  }
}

async function refreshAll() {
  await checkHealth();
  if (!state.token) {
    els.list.innerHTML = '<p class="empty">Paste the local bearer token to load authenticated catalog surfaces.</p>';
    return;
  }
  try {
    const summary = await api('/v1/summary');
    els.skuCount.textContent = `${summary.summary.skus} SKUs`;
    els.forecastCount.textContent = `${summary.summary.forecast_runs} forecasts`;
    els.marketCount.textContent = `${summary.summary.market_price_points || 0} prices`;
    await loadBoard({ render: false });
    await loadMarket({ render: false });
    await loadHapaCards({ render: false });
    await loadItems(els.searchInput.value);
  } catch (error) {
    els.list.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

async function loadItems(query = '') {
  if (!state.token) return;
  const payload = await api(`/v1/items?q=${encodeURIComponent(query)}`);
  state.items = payload.items;
  renderView();
}

async function loadBoard({ render = true } = {}) {
  if (!state.token) return null;
  const payload = await api('/v1/kanban-board');
  state.board = payload.board;
  const summary = payload.board.summary;
  els.boardCount.textContent = `${summary.done}/${summary.total_tasks} cards`;
  if (render) renderView();
  return payload.board;
}

async function loadMarket({ render = true } = {}) {
  if (!state.token) return null;
  const [prices, listing] = await Promise.all([
    api('/v1/market/prices?limit=120'),
    api('/v1/market/listing?limit=120')
  ]);
  state.market = {
    ...prices,
    listings: listing.listings || [],
    media: listing.media || [],
    listing_summary: listing.summary || {}
  };
  els.marketCount.textContent = `${prices.points.length} prices / ${state.market.media.length} media`;
  if (render) renderView();
  return state.market;
}

async function loadHapaCards({ render = true } = {}) {
  if (!state.token) return null;
  const [cards, placements, processes, runs] = await Promise.all([
    api('/v1/hapa-cards?limit=200'),
    api('/v1/hapa-card-placements?limit=300'),
    api('/v1/hapa-processes?limit=100'),
    api('/v1/hapa-decisions/runs?limit=20')
  ]);
  state.hapaCards = {
    cards: cards.cards || [],
    placements: placements.placements || [],
    processes: processes.processes || [],
    runs: runs.runs || []
  };
  if (render) renderView();
  return state.hapaCards;
}

async function loadOps({ render = true } = {}) {
  if (!state.token) return null;
  const payload = await api('/v1/ops');
  state.ops = payload;
  if (render) renderView();
  return payload;
}

async function retrieveMarketForLookup() {
  const lookup = els.marketLookupInput.value.trim();
  if (!lookup) {
    els.marketStatus.textContent = 'Enter a UPC, ASIN, or Camel URL.';
    return;
  }
  els.retrieveMarket.disabled = true;
  els.marketStatus.textContent = 'Retrieving...';
  try {
    const body = marketLookupPayload(lookup);
    const route = /amazon\.com/i.test(lookup) ? '/v1/market/amazon-listing/retrieve' : '/v1/market/retrieve';
    const payload = await api(route, {
      method: 'POST',
      body: JSON.stringify({ ...body, actor: 'web-ui' })
    });
    state.selected = payload.item;
    await loadMarket({ render: false });
    await loadItems(els.searchInput.value);
    state.view = 'market';
    setActiveNav('market');
    renderMarket();
    renderMarketInspector(payload);
    els.marketStatus.textContent = payload.listing_snapshot
      ? `${payload.retrieval.provider_status}: ${payload.inserted_media} media assets linked.`
      : `${payload.retrieval.provider_status}: ${payload.inserted_points} price points stored.`;
  } catch (error) {
    els.marketStatus.textContent = error.message;
  } finally {
    els.retrieveMarket.disabled = false;
  }
}

async function importSample() {
  const records = [
    {
      product_group_id: 'PG-UI-SAMPLE',
      sku: 'UI-SAMPLE-1',
      name: 'UI Sample Item',
      brand: 'Hapa Demo',
      category: 'demo',
      gtin: '0099887766554',
      supplier: 'Demo Supplier',
      supplier_sku: 'DEMO-1',
      pack_level: 'each',
      units_per_pack: 1,
      facility: 'main',
      location: 'demo-bin',
      on_hand: 11,
      reserved: 1,
      in_transit: 3,
      safety_stock: 4,
      reorder_point: 8,
      sales_30d: 9,
      lead_time_days: 7,
      price: 42,
      cost: 15
    }
  ];
  await api('/v1/import-batches', {
    method: 'POST',
    body: JSON.stringify({ source: 'web-sample', actor: 'web-ui', records })
  });
  await refreshAll();
}

async function importDemoCatalog() {
  if (!state.token) {
    els.list.innerHTML = '<p class="empty">Paste the local bearer token before importing the demo catalog.</p>';
    return;
  }
  els.loadDemo.disabled = true;
  els.listTitle.textContent = 'Demo Catalog';
  els.listMeta.textContent = 'Importing 100 SKU fixture';
  try {
    const payload = await api('/v1/fixtures/demo-catalog-100/import', {
      method: 'POST',
      body: JSON.stringify({ actor: 'web-ui', limit: 100 })
    });
    await refreshAll();
    state.view = 'items';
    setActiveNav('items');
    renderObjectInspector('Demo catalog import', {
      fixture: payload.fixture,
      totals: payload.totals,
      batch: payload.batch
    });
  } catch (error) {
    els.list.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  } finally {
    els.loadDemo.disabled = false;
  }
}

async function runForecastForSelected() {
  if (!state.selected) return;
  const payload = await api('/v1/forecasts/runs', {
    method: 'POST',
    body: JSON.stringify({
      sku: state.selected.sku,
      location: state.selected.inventory?.[0]?.location || 'main-bin',
      channel: 'default',
      actor: 'web-ui'
    })
  });
  state.selected.forecast = payload.run;
  renderInspector(state.selected);
  const summary = await api('/v1/summary');
  els.forecastCount.textContent = `${summary.summary.forecast_runs} forecasts`;
}

function renderView() {
  els.runForecast.disabled = state.view !== 'items' || !state.selected;
  if (state.view === 'items') renderItems();
  if (state.view === 'board') renderBoard();
  if (state.view === 'inventory') renderInventory();
  if (state.view === 'forecasts') renderForecasts();
  if (state.view === 'market') renderMarket();
  if (state.view === 'workbench') renderWorkbench();
  if (state.view === 'quality') renderQuality();
  if (state.view === 'ops') renderOps();
  if (state.view === 'governance') renderGovernance();
  if (state.view === 'cards') renderCards();
  if (state.view === 'audit') renderAudit();
}

function renderItems() {
  useListMode();
  els.runForecast.disabled = !state.selected;
  syncItemFilterOptions();
  const visibleItems = filterItems(state.items);
  els.listTitle.textContent = 'Item Master';
  els.listMeta.textContent = `${visibleItems.length} of ${state.items.length} rows`;
  els.list.innerHTML = `
    ${renderItemTelemetry(visibleItems)}
    ${visibleItems.map(item => `
    <article class="row ${state.selected?.sku_id === item.sku_id ? 'selected' : ''}" data-sku="${escapeHtml(item.sku)}">
      <div>
        <strong>${escapeHtml(item.sku)}</strong>
        <small>${escapeHtml(item.sku_name)} / ${escapeHtml(item.brand || '')} / ${escapeHtml(item.category || '')}</small>
      </div>
      <span class="badge">${escapeHtml(item.status)}</span>
    </article>
  `).join('') || '<p class="empty">No items yet.</p>'}
  `;
  els.list.querySelectorAll('.row').forEach(row => {
    row.addEventListener('click', async () => {
      const payload = await api(`/v1/items/${encodeURIComponent(row.dataset.sku)}`);
      state.selected = payload.item;
      renderInspector(payload.item);
      renderItems();
    });
  });
}

function filterItems(items = []) {
  return items.filter(item => (
    (!state.filters.category || item.category === state.filters.category)
    && (!state.filters.brand || item.brand === state.filters.brand)
    && (!state.filters.status || item.status === state.filters.status)
  ));
}

function syncItemFilterOptions() {
  const optionSet = key => [...new Set(state.items.map(item => item[key]).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  setSelectOptions(els.categoryFilter, 'All categories', optionSet('category'), state.filters.category);
  setSelectOptions(els.brandFilter, 'All brands', optionSet('brand'), state.filters.brand);
  setSelectOptions(els.statusFilter, 'All states', optionSet('status'), state.filters.status);
}

function setSelectOptions(select, label, options, selected) {
  const valueStillExists = !selected || options.includes(selected);
  if (!valueStillExists) {
    selected = '';
    if (select === els.categoryFilter) state.filters.category = '';
    if (select === els.brandFilter) state.filters.brand = '';
    if (select === els.statusFilter) state.filters.status = '';
  }
  select.innerHTML = [
    `<option value="">${escapeHtml(label)}</option>`,
    ...options.map(option => `<option value="${escapeAttribute(option)}" ${option === selected ? 'selected' : ''}>${escapeHtml(option)}</option>`)
  ].join('');
}

function renderItemTelemetry(items = []) {
  if (!items.length) return '';
  const categories = new Set(items.map(item => item.category).filter(Boolean)).size;
  const brands = new Set(items.map(item => item.brand).filter(Boolean)).size;
  const statuses = new Set(items.map(item => item.status).filter(Boolean)).size;
  return `
    <section class="operator-strip" aria-label="Item master summary">
      <div class="telemetry-card"><span>Rows</span><strong>${items.length}</strong></div>
      <div class="telemetry-card"><span>Categories</span><strong>${categories}</strong></div>
      <div class="telemetry-card"><span>Brands</span><strong>${brands}</strong></div>
      <div class="telemetry-card"><span>States</span><strong>${statuses}</strong></div>
    </section>
  `;
}

async function renderInventory() {
  useListMode();
  els.listTitle.textContent = 'Inventory';
  const payload = await api('/v1/inventory/positions');
  els.listMeta.textContent = `${payload.positions.length} positions`;
  els.list.innerHTML = payload.positions.map(pos => `
    <article class="row">
      <div>
        <strong>${escapeHtml(pos.sku)}</strong>
        <small>${escapeHtml(pos.facility)} / ${escapeHtml(pos.location)} / available ${pos.available}</small>
      </div>
      <span class="badge">${pos.below_reorder ? 'reorder' : 'stocked'}</span>
    </article>
  `).join('') || '<p class="empty">No inventory positions.</p>';
}

async function renderForecasts() {
  useListMode();
  els.listTitle.textContent = 'Forecast Dashboard';
  els.listMeta.textContent = 'Loading forecast dashboard';
  const params = new URLSearchParams({
    ...state.forecastFilters,
    category: state.filters.category,
    brand: state.filters.brand,
    state: state.filters.status
  });
  const [runs, dashboard, experimentation] = await Promise.all([
    api('/v1/forecasts/runs'),
    api(`/v1/forecasts/dashboard?${params.toString()}`),
    api(`/v1/forecasts/experiments?${params.toString()}`)
  ]);
  state.forecastDashboard = dashboard;
  state.forecastExperimentation = experimentation;
  const rows = dashboard.table.rows.filter(row => [row.key, row.label, row.level, row.risk_state, ...(row.skus || [])]
    .join(' ')
    .toLowerCase()
    .includes(els.searchInput.value.trim().toLowerCase()));
  const visibleDashboard = { ...dashboard, table: { ...dashboard.table, rows } };
  els.listMeta.textContent = `${rows.length} rows / ${runs.forecast_runs.length} runs / ${dashboard.purchase_orders.length} purchase orders`;
  els.list.className = 'list forecast-dashboard';
  els.list.innerHTML = `
    ${renderForecastControls(dashboard)}
    ${renderForecastGraph(dashboard.graph)}
    ${renderForecastTable(visibleDashboard)}
  `;
  attachForecastDashboardInteractions(visibleDashboard);
  renderForecastDashboardInspector(visibleDashboard, experimentation, runs.forecast_runs);
}

function renderForecastControls(dashboard) {
  const filters = dashboard.filters || {};
  const option = (value, label, selected) => `<option value="${escapeAttribute(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label || value)}</option>`;
  return `
    <section class="forecast-controls" aria-label="Forecast controls">
      <label>Level<select data-forecast-control="granularity">${(filters.granularities || []).map(value => option(value, value, state.forecastFilters.granularity)).join('')}</select></label>
      <label>Increment<select data-forecast-control="increment">${(filters.increments || []).map(value => option(value, value, state.forecastFilters.increment)).join('')}</select></label>
      <label>Sort<select data-forecast-control="sort_by">
        <option value="">Default</option>
        ${(filters.supply_sort_modes || []).map(value => option(value, value.replace(/_/g, ' '), state.forecastFilters.sort_by)).join('')}
      </select></label>
      <label>Direction<select data-forecast-control="sort_direction">
        ${option('asc', 'Lowest first', state.forecastFilters.sort_direction)}
        ${option('desc', 'Highest first', state.forecastFilters.sort_direction)}
      </select></label>
      <label>In stock<select data-forecast-control="in_stock">
        ${option('', 'Any', state.forecastFilters.in_stock)}
        ${option('true', 'In stock', state.forecastFilters.in_stock)}
        ${option('false', 'Not in stock', state.forecastFilters.in_stock)}
      </select></label>
      <label>On order<select data-forecast-control="on_order">
        ${option('', 'Any', state.forecastFilters.on_order)}
        ${option('true', 'On order', state.forecastFilters.on_order)}
        ${option('false', 'No order', state.forecastFilters.on_order)}
      </select></label>
      <label>Logic<select data-forecast-control="supply_logic">
        ${option('and', 'AND', state.forecastFilters.supply_logic)}
        ${option('or', 'OR', state.forecastFilters.supply_logic)}
      </select></label>
    </section>
  `;
}

function renderForecastGraph(graph = {}) {
  const series = graph.series || [];
  const maxDemand = Math.max(1, ...series.map(point => Number(point.demand_units || 0)));
  return `
    <section class="forecast-graph" aria-label="Forecast visualization">
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

function renderForecastTable(dashboard) {
  const buckets = dashboard.table.buckets || [];
  const rows = dashboard.table.rows || [];
  return `
    <section class="forecast-table-wrap" aria-label="Forecast actuals and projections">
      <table class="forecast-table">
        <thead>
          <tr>
            <th>Scope</th>
            ${buckets.map(bucket => `<th><span>${escapeHtml(bucket.label)}</span><small>${escapeHtml(bucket.kind)}</small></th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, rowIndex) => `
            <tr>
              <th>
                <strong>${escapeHtml(row.label)}</strong>
                <small>${escapeHtml(row.level)} / ${row.sku_count} SKU / ${escapeHtml(row.risk_state)}</small>
              </th>
              ${row.buckets.map((bucket, bucketIndex) => renderForecastCell(row, bucket, rowIndex, bucketIndex)).join('')}
            </tr>
            <tr class="yoy-row">
              <th>YoY</th>
              ${row.buckets.map(bucket => `<td>${bucket.yoy.units_variance_percent > 0 ? '+' : ''}${bucket.yoy.units_variance_percent}%</td>`).join('')}
            </tr>
          `).join('') || `<tr><td colspan="${buckets.length + 1}">No forecast rows match the active filters.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
}

function renderForecastCell(row, bucket, rowIndex, bucketIndex) {
  if (bucket.kind === 'actual') {
    return `
      <td class="actual-cell">
        <strong>${Math.round(bucket.effective.units_sold || 0)}</strong>
        <small>$${formatMoney(bucket.effective.revenue_sold)} rev</small>
        <small>$${formatMoney(bucket.effective.total_cost)} cost</small>
      </td>
    `;
  }
  return `
    <td class="forecast-cell">
      <strong>${Math.round(bucket.effective.projected_units || 0)}</strong>
      <small>$${formatMoney(bucket.effective.projected_revenue)} rev</small>
      <small>${bucket.supply.on_hand_time_units} ${escapeHtml(bucket.supply.time_unit)} supply</small>
      <small>${bucket.supply.on_order_units} on order</small>
      <div class="override-row">
        <input data-forecast-override-value="${rowIndex}:${bucketIndex}" type="number" inputmode="decimal" placeholder="Override" />
        <button data-forecast-override="${rowIndex}:${bucketIndex}" aria-label="Apply forecast override">Apply</button>
      </div>
    </td>
  `;
}

function attachForecastDashboardInteractions(dashboard) {
  els.list.querySelectorAll('[data-forecast-control]').forEach(control => {
    control.addEventListener('change', () => {
      state.forecastFilters[control.dataset.forecastControl] = control.value;
      renderForecasts();
    });
  });
  els.list.querySelectorAll('[data-forecast-override]').forEach(button => {
    button.addEventListener('click', async () => {
      const [rowIndex, bucketIndex] = button.dataset.forecastOverride.split(':').map(Number);
      const row = dashboard.table.rows[rowIndex];
      const bucket = row?.buckets[bucketIndex];
      const input = els.list.querySelector(`[data-forecast-override-value="${rowIndex}:${bucketIndex}"]`);
      const value = Number(input?.value || 0);
      if (!row || !bucket || !Number.isFinite(value) || value <= 0) return;
      await api('/v1/forecasts/overrides', {
        method: 'POST',
        body: JSON.stringify({
          scope_level: row.level,
          scope_key: row.key,
          bucket_start: bucket.bucket_start,
          bucket_end: bucket.bucket_end,
          field: 'projected_units',
          original_value: bucket.effective.projected_units,
          value,
          reason_code: 'operator_table_override',
          rationale: `Web override for ${row.label} ${bucket.label}`,
          actor: 'web-ui'
        })
      });
      await renderForecasts();
    });
  });
}

function renderForecastDashboardInspector(dashboard, experimentation, runs = []) {
  const firstRow = dashboard.table.rows[0];
  const comparison = experimentation.comparison || {};
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Rows</span><strong>${dashboard.table.rows.length}</strong></div>
    <div class="kv"><span>Increment</span><strong>${escapeHtml(dashboard.table.increment)}</strong></div>
    <div class="kv"><span>Granularity</span><strong>${escapeHtml(dashboard.table.granularity)}</strong></div>
    <div class="kv"><span>Runs</span><strong>${runs.length}</strong></div>
    <div class="section">
      <h3>Active Assumption Set</h3>
      <p class="empty">${escapeHtml(dashboard.assumption_set?.name || 'No assumption set')}</p>
    </div>
    <div class="section">
      <h3>Experimentation</h3>
      ${renderList((experimentation.assumption_sets || []).slice(0, 4).map(set => `${set.name}: ${set.scope_level}/${set.scope_key}`))}
      <div class="kv"><span>Comparison</span><strong>${escapeHtml(comparison.winner?.method || comparison.winner?.key || 'not run')}</strong></div>
    </div>
    <div class="section">
      <h3>Supply Snapshot</h3>
      ${firstRow ? renderList(firstRow.buckets.filter(bucket => bucket.kind === 'forecast').slice(0, 4).map(bucket => `${bucket.label}: ${bucket.supply.on_hand_time_units} ${bucket.supply.time_unit}, ${bucket.supply.risk_state}`)) : '<p class="empty">No rows.</p>'}
    </div>
    <div class="section">
      <h3>Subscriber Payload</h3>
      <p class="empty">${escapeHtml(dashboard.subscriber_payload.contract)} / ${dashboard.subscriber_payload.rows.length} rows / raw and effective values included.</p>
    </div>
  `;
}

async function renderMarket() {
  useListMode();
  if (!state.market) {
    try {
      await loadMarket({ render: false });
    } catch (error) {
      els.listTitle.textContent = 'Market Prices';
      els.listMeta.textContent = 'Unavailable';
      els.list.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
      return;
    }
  }
  const query = els.searchInput.value.trim().toLowerCase();
  const snapshots = (state.market.snapshots || []).filter(snapshot => [snapshot.sku, snapshot.sku_name, snapshot.asin, snapshot.status]
    .join(' ')
    .toLowerCase()
    .includes(query));
  const listings = (state.market.listings || []).filter(snapshot => [snapshot.sku, snapshot.sku_name, snapshot.asin, snapshot.status, snapshot.title, snapshot.brand]
    .join(' ')
    .toLowerCase()
    .includes(query));
  els.listTitle.textContent = 'Market Prices';
  els.listMeta.textContent = `${state.market.points.length} price points / ${listings.length} listings / ${state.market.media.length} media`;
  els.list.innerHTML = [
    ...listings.map(snapshot => `
    <article class="row" data-listing-snapshot="${escapeHtml(snapshot.id)}">
      <div>
        <strong>${escapeHtml(snapshot.sku)}</strong>
        <small>${escapeHtml(snapshot.brand || 'Amazon')} / ${escapeHtml(snapshot.asin || 'no asin')} / ${snapshot.rating ? `${snapshot.rating} stars` : escapeHtml(snapshot.status)}</small>
      </div>
      <span class="badge">listing</span>
    </article>
  `),
    ...snapshots.map(snapshot => `
    <article class="row" data-market-snapshot="${escapeHtml(snapshot.id)}">
      <div>
        <strong>${escapeHtml(snapshot.sku)}</strong>
        <small>${escapeHtml(snapshot.source)} / ${escapeHtml(snapshot.asin || 'no asin')} / ${escapeHtml(snapshot.retrieved_at)}</small>
      </div>
      <span class="badge">${escapeHtml(snapshot.status)}</span>
    </article>
  `)
  ].join('') || '<p class="empty">No market snapshots yet. Paste a UPC, ASIN, Camel URL, or Amazon URL and click Retrieve.</p>';
  els.list.querySelectorAll('[data-listing-snapshot]').forEach(row => {
    row.addEventListener('click', () => {
      const snapshot = state.market.listings.find(item => item.id === row.dataset.listingSnapshot);
      if (snapshot) renderListingInspector(snapshot);
    });
  });
  els.list.querySelectorAll('[data-market-snapshot]').forEach(row => {
    row.addEventListener('click', () => {
      const snapshot = state.market.snapshots.find(item => item.id === row.dataset.marketSnapshot);
      if (snapshot) renderSnapshotInspector(snapshot);
    });
  });
  renderMarketOverview();
}

async function renderWorkbench() {
  useListMode();
  els.listTitle.textContent = 'Import Workbench';
  els.listMeta.textContent = 'Loading mapping, connector, and performance scaffolds';
  const mapping = starterMapping();
  const sampleRecords = [starterSourceRecord()];
  try {
    const [mappings, preview, contracts, reports] = await Promise.all([
      api('/v1/import-mappings'),
      api('/v1/import-mappings/preview', {
        method: 'POST',
        body: JSON.stringify({ source: 'web-preview', mapping, records: sampleRecords })
      }),
      api('/v1/connectors/contracts'),
      api('/v1/performance/reports')
    ]);
    state.workbench = { mappings, preview, contracts, reports };
    const rows = [
      ...mappings.mappings.map(item => ({ kind: 'mapping', title: item.name, subtitle: `${item.source_type} / ${Object.keys(item.field_map || {}).length} fields`, item })),
      { kind: 'preview', title: 'Starter mapping preview', subtitle: `${preview.cells.length} source-to-canonical cells`, item: preview },
      ...contracts.contracts.map(item => ({ kind: 'contract', title: item.name, subtitle: `${item.domain} / ${item.direction} / ${item.status}`, item })),
      ...reports.reports.map(item => ({ kind: 'performance', title: `Performance ${item.result}`, subtitle: `${item.measured_skus} SKUs / target ${item.sku_target}`, item }))
    ];
    els.listMeta.textContent = `${mappings.mappings.length} mappings / ${contracts.contracts.length} contracts / ${reports.reports.length} reports`;
    els.list.innerHTML = rows.map((row, index) => `
      <article class="row" data-workbench-row="${index}">
        <div>
          <strong>${escapeHtml(row.title)}</strong>
          <small>${escapeHtml(row.subtitle)}</small>
        </div>
        <span class="badge">${escapeHtml(row.kind)}</span>
      </article>
    `).join('') || '<p class="empty">No workbench objects yet.</p>';
    els.list.querySelectorAll('[data-workbench-row]').forEach(row => {
      row.addEventListener('click', () => renderObjectInspector(rows[Number(row.dataset.workbenchRow)].title, rows[Number(row.dataset.workbenchRow)].item));
    });
    renderWorkbenchInspector(state.workbench);
  } catch (error) {
    els.listMeta.textContent = 'Unavailable';
    els.list.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

async function renderQuality() {
  useListMode();
  els.listTitle.textContent = 'Quality Loop';
  els.listMeta.textContent = 'Loading MDM, digital, and forecast quality queues';
  try {
    const [duplicates, digital, forecastQuality] = await Promise.all([
      api('/v1/mdm/duplicates'),
      api('/v1/digital-products'),
      api('/v1/forecasts/quality')
    ]);
    state.quality = { duplicates, digital, forecastQuality };
    const rows = [
      ...duplicates.candidates.map(item => ({ kind: 'duplicate', title: `${item.sku} -> ${item.duplicate_sku}`, subtitle: `${Math.round(item.confidence * 100)}% / ${item.status}`, item })),
      ...duplicates.merge_events.map(item => ({ kind: 'merge', title: item.id, subtitle: `${item.status} / ${item.actor}`, item })),
      ...digital.digital_products.map(item => ({ kind: 'digital', title: item.sku, subtitle: `${item.version || 'unversioned'} / ${item.release_lifecycle}`, item })),
      ...forecastQuality.quality_events.map(item => ({ kind: 'forecast', title: item.sku, subtitle: `abs error ${item.absolute_error} / ${item.miss_reason || 'quality'}`, item })),
      ...forecastQuality.actuals.map(item => ({ kind: 'actual', title: item.sku, subtitle: `${item.actual} actual / ${item.location}`, item }))
    ];
    els.listMeta.textContent = `${duplicates.candidates.length} candidates / ${digital.digital_products.length} digital / ${forecastQuality.quality_events.length} forecast quality`;
    els.list.innerHTML = rows.map((row, index) => `
      <article class="row" data-quality-row="${index}">
        <div>
          <strong>${escapeHtml(row.title)}</strong>
          <small>${escapeHtml(row.subtitle)}</small>
        </div>
        <span class="badge">${escapeHtml(row.kind)}</span>
      </article>
    `).join('') || '<p class="empty">No quality queue rows yet.</p>';
    els.list.querySelectorAll('[data-quality-row]').forEach(row => {
      row.addEventListener('click', () => renderObjectInspector(rows[Number(row.dataset.qualityRow)].title, rows[Number(row.dataset.qualityRow)].item));
    });
    renderQualityInspector(state.quality);
  } catch (error) {
    els.listMeta.textContent = 'Unavailable';
    els.list.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

async function renderOps() {
  useListMode();
  els.listTitle.textContent = 'Operations';
  if (!state.token) {
    els.listMeta.textContent = 'Auth required';
    els.list.innerHTML = '<p class="empty">Paste the local bearer token to load operations scaffolds.</p>';
    return;
  }
  els.listMeta.textContent = 'Loading production scaffolds';
  try {
    const ops = await loadOps({ render: false });
    const rows = opsRows(ops).filter(row => [row.kind, row.title, row.subtitle]
      .join(' ')
      .toLowerCase()
      .includes(els.searchInput.value.trim().toLowerCase()));
    els.listMeta.textContent = `${rows.length} rows / ${ops.summary.connector_runs} connector runs / ${ops.summary.quality_work_orders} work orders`;
    els.list.innerHTML = `
      ${renderOpsActionGroups()}
      ${rows.map((row, index) => `
        <article class="row" data-ops-row="${index}">
          <div>
            <strong>${escapeHtml(row.title)}</strong>
            <small>${escapeHtml(row.subtitle)}</small>
          </div>
          <span class="badge">${escapeHtml(row.kind)}</span>
        </article>
      `).join('') || '<p class="empty">No operation rows yet. Run a scaffold action above.</p>'}
    `;
    els.list.querySelectorAll('[data-ops-row]').forEach(row => {
      row.addEventListener('click', () => renderObjectInspector(rows[Number(row.dataset.opsRow)].title, rows[Number(row.dataset.opsRow)].item));
    });
    els.list.querySelectorAll('[data-ops-action]').forEach(button => {
      button.addEventListener('click', async event => {
        event.stopPropagation();
        await runOpsAction(button.dataset.opsAction);
      });
    });
    renderOpsInspector(ops);
  } catch (error) {
    els.listMeta.textContent = 'Unavailable';
    els.list.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

async function renderGovernance() {
  useListMode();
  els.listTitle.textContent = 'Governance';
  const roles = await api('/v1/roles');
  const identities = await api('/v1/identities');
  els.listMeta.textContent = `${roles.roles.length} roles / ${identities.identities.length} identities`;
  els.list.innerHTML = roles.roles.map(role => `
    <article class="row">
      <div>
        <strong>${escapeHtml(role.name)}</strong>
        <small>${escapeHtml(role.description)}</small>
      </div>
      <span class="badge">${role.scopes.length}</span>
    </article>
  `).join('');
}

async function renderCards() {
  useCardMode();
  if (!state.hapaCards) {
    try {
      await loadHapaCards({ render: false });
    } catch (error) {
      els.listTitle.textContent = 'Hapa Cards';
      els.listMeta.textContent = 'Unavailable';
      els.list.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
      return;
    }
  }
  const data = state.hapaCards;
  const query = els.searchInput.value.trim().toLowerCase();
  const cards = data.cards.filter(card => [card.id, card.name, card.card_kind, card.source_node, ...(card.skills || []), ...(card.tags || [])]
    .join(' ')
    .toLowerCase()
    .includes(query));
  els.listTitle.textContent = 'Hapa Cards';
  els.listMeta.textContent = `${data.cards.length} cards / ${data.placements.length} placements / ${data.processes.length} processes`;
  els.list.innerHTML = `
    <section class="card-rack">
      ${cards.map(card => hapaCardRow(card)).join('') || '<p class="empty compact">No cards.</p>'}
    </section>
    <section class="card-zone-grid">
      ${renderCardDropZones(data)}
    </section>
  `;
  attachCardInteractions();
  renderCardOverview(data);
}

async function renderAudit() {
  useListMode();
  els.listTitle.textContent = 'Audit';
  const payload = await api('/v1/audit-events');
  els.listMeta.textContent = `${payload.audit_events.length} events`;
  els.list.innerHTML = payload.audit_events.map(event => `
    <article class="row">
      <div>
        <strong>${escapeHtml(event.action)}</strong>
        <small>${escapeHtml(event.created_at)} / ${escapeHtml(event.summary)}</small>
      </div>
      <span class="badge">${escapeHtml(event.actor)}</span>
    </article>
  `).join('') || '<p class="empty">No audit events.</p>';
}

async function renderBoard() {
  if (!state.board) {
    try {
      await loadBoard({ render: false });
    } catch (error) {
      els.listTitle.textContent = 'Kanban Board';
      els.listMeta.textContent = 'Unavailable';
      els.list.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
      return;
    }
  }
  const board = state.board;
  const query = els.searchInput.value.trim().toLowerCase();
  els.list.className = 'list kanban-list';
  els.listTitle.textContent = 'Kanban Board';
  els.listMeta.textContent = board.available
    ? `${board.summary.done} done / ${board.summary.total_tasks} cards / ${board.event_count} events`
    : 'No board log found';

  els.list.innerHTML = board.columns.map(column => {
    const tasks = column.tasks.filter(task => matchesTask(task, query));
    return `
      <section class="kanban-column" data-column="${escapeHtml(column.id)}">
        <header>
          <span>${escapeHtml(column.title)}</span>
          <strong>${tasks.length}</strong>
        </header>
        <div class="task-stack">
          ${tasks.map(task => taskCard(task)).join('') || '<p class="empty compact">No cards.</p>'}
        </div>
      </section>
    `;
  }).join('');

  els.list.querySelectorAll('[data-task-id]').forEach(card => {
    const inspect = () => {
      const task = findBoardTask(card.dataset.taskId);
      if (task) renderTaskInspector(task);
    };
    card.addEventListener('click', inspect);
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        inspect();
      }
    });
  });
  renderBoardInspector(board);
}

function taskCard(task) {
  return `
    <article class="task-card" data-task-id="${escapeHtml(task.id)}" role="button" tabindex="0">
      <div class="task-card-head">
        <strong>${escapeHtml(task.id)}</strong>
        <span class="badge priority">${escapeHtml(task.priority)}</span>
      </div>
      <h3>${escapeHtml(task.title)}</h3>
      <p>${escapeHtml(task.description)}</p>
      <div class="task-meta">
        <span>${escapeHtml(task.lane)}</span>
        <span>${escapeHtml(task.owner)}</span>
      </div>
    </article>
  `;
}

function renderBoardInspector(board) {
  const summary = board.summary;
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Project</span><strong>${escapeHtml(board.project_id)}</strong></div>
    <div class="kv"><span>Cards</span><strong>${summary.done} done / ${summary.total_tasks} total</strong></div>
    <div class="kv"><span>Future</span><strong>${summary.future_backlog} backlog / ${summary.blocked} blocked</strong></div>
    <div class="kv"><span>Events</span><strong>${board.event_count || 0}</strong></div>
    <div class="section">
      <h3>Latest checkpoints</h3>
      ${board.checkpoints.map(checkpoint => `
        <article class="checkpoint">
          <strong>${escapeHtml(checkpoint.title)}</strong>
          <p>${escapeHtml(checkpoint.summary)}</p>
          <small>${escapeHtml(checkpoint.created_at || '')}</small>
        </article>
      `).join('') || '<p class="empty">No checkpoints yet.</p>'}
    </div>
    ${summary.done === summary.total_tasks ? `
      <div class="surface-status">
        <span class="dot ok"></span>
        <div>
          <strong>Board drained</strong>
          <p>Append the next refill tranche to continue the work cycle.</p>
        </div>
      </div>
    ` : ''}
  `;
}

function renderTaskInspector(task) {
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Task</span><strong>${escapeHtml(task.id)}</strong></div>
    <div class="kv"><span>Title</span><strong>${escapeHtml(task.title)}</strong></div>
    <div class="kv"><span>Status</span><strong>${escapeHtml(task.column)}</strong></div>
    <div class="kv"><span>Lane</span><strong>${escapeHtml(task.lane)}</strong></div>
    <div class="kv"><span>Owner</span><strong>${escapeHtml(task.owner)}</strong></div>
    <div class="kv"><span>Updated</span><strong>${escapeHtml(task.updated_at || '')}</strong></div>
    <div class="section">
      <h3>Description</h3>
      <p class="detail-copy">${escapeHtml(task.description)}</p>
    </div>
    <div class="section">
      <h3>Acceptance</h3>
      ${renderList(task.acceptance)}
    </div>
    <div class="section">
      <h3>Evidence</h3>
      ${renderList(task.evidence)}
    </div>
    <div class="section">
      <h3>Requirements</h3>
      ${renderTags(task.requirements)}
    </div>
  `;
}

function renderMarketOverview() {
  const summaryRows = (state.market.summary || []).map(row => `
    <div class="kv"><span>${escapeHtml(row.price_type)}</span><strong>${row.points} points / avg $${formatMoney(row.average)}</strong></div>
  `).join('');
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Price snapshots</span><strong>${(state.market.snapshots || []).length}</strong></div>
    <div class="kv"><span>Listing snapshots</span><strong>${(state.market.listings || []).length}</strong></div>
    <div class="kv"><span>Price points</span><strong>${(state.market.points || []).length}</strong></div>
    <div class="kv"><span>Media assets</span><strong>${(state.market.media || []).length}</strong></div>
    <div class="section">
      <h3>Price history summary</h3>
      ${summaryRows || '<p class="empty">No price history points stored yet.</p>'}
    </div>
    <div class="section">
      <h3>Latest listing media</h3>
      ${renderMediaGrid((state.market.media || []).filter(asset => asset.media_type === 'image').slice(0, 8))}
    </div>
  `;
}

function renderMarketInspector(payload) {
  if (payload.listing_snapshot) {
    renderListingInspector(payload.listing_snapshot, payload.media || []);
    return;
  }
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Status</span><strong>${escapeHtml(payload.retrieval.provider_status)}</strong></div>
    <div class="kv"><span>Item</span><strong>${escapeHtml(payload.item.sku)}</strong></div>
    <div class="kv"><span>Stored</span><strong>${payload.inserted_points} price points</strong></div>
    <div class="section">
      <h3>Warnings</h3>
      ${renderList(payload.retrieval.warnings || [])}
    </div>
    <div class="section">
      <h3>Identifiers</h3>
      ${renderTags(Object.entries(payload.snapshot.identifiers || {}).map(([key, value]) => `${key}: ${value}`))}
    </div>
  `;
}

function renderListingInspector(snapshot, suppliedMedia = null) {
  const media = suppliedMedia || (state.market.media || []).filter(asset => asset.sku === snapshot.sku);
  const images = media.filter(asset => asset.media_type === 'image');
  const documents = [
    ...(snapshot.documents || []),
    ...media.filter(asset => asset.media_type === 'document').map(asset => ({ label: asset.alt || asset.variant, url: asset.url }))
  ];
  els.inspectorBody.innerHTML = `
    ${images[0] ? `<img class="hero-media" src="${escapeAttribute(images[0].url)}" alt="${escapeAttribute(images[0].alt || snapshot.title || snapshot.sku)}">` : ''}
    <div class="kv"><span>Listing</span><strong>${escapeHtml(snapshot.sku)}</strong></div>
    <div class="kv"><span>Title</span><strong>${escapeHtml(snapshot.title || snapshot.sku_name)}</strong></div>
    <div class="kv"><span>Brand</span><strong>${escapeHtml(snapshot.brand || '')}</strong></div>
    <div class="kv"><span>Price</span><strong>${snapshot.price ? `$${formatMoney(snapshot.price)}` : 'n/a'}${snapshot.list_price ? ` / list $${formatMoney(snapshot.list_price)}` : ''}</strong></div>
    <div class="kv"><span>Reviews</span><strong>${snapshot.rating || 'n/a'} stars / ${snapshot.review_count || 0} ratings</strong></div>
    <div class="kv"><span>Velocity</span><strong>${escapeHtml(snapshot.bought_in_last_month || 'n/a')}</strong></div>
    <div class="section">
      <h3>Media</h3>
      ${renderMediaGrid(images.slice(0, 12))}
    </div>
    <div class="section">
      <h3>About this item</h3>
      ${renderList(snapshot.feature_bullets || [])}
    </div>
    <div class="section">
      <h3>Description</h3>
      <p class="detail-copy">${escapeHtml(snapshot.description || 'No listing description stored.')}</p>
    </div>
    <div class="section">
      <h3>Documents</h3>
      ${documents.length ? documents.map(document => `<a class="doc-link" href="${escapeAttribute(document.url)}" target="_blank" rel="noreferrer">${escapeHtml(document.label || 'Document')}</a>`).join('') : '<p class="empty">No documents stored.</p>'}
    </div>
  `;
}

function renderSnapshotInspector(snapshot) {
  const points = state.market.points.filter(point => point.snapshot_id === snapshot.id || point.asin === snapshot.asin).slice(0, 20);
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Snapshot</span><strong>${escapeHtml(snapshot.id)}</strong></div>
    <div class="kv"><span>SKU</span><strong>${escapeHtml(snapshot.sku)}</strong></div>
    <div class="kv"><span>ASIN</span><strong>${escapeHtml(snapshot.asin || '')}</strong></div>
    <div class="kv"><span>Status</span><strong>${escapeHtml(snapshot.status)}</strong></div>
    <div class="section">
      <h3>Identifiers</h3>
      ${renderTags(Object.entries(snapshot.identifiers || {}).map(([key, value]) => `${key}: ${value}`))}
    </div>
    <div class="section">
      <h3>Recent points</h3>
      ${points.map(point => `<div class="kv"><span>${escapeHtml(point.price_type)}</span><strong>$${formatMoney(point.price)} / ${escapeHtml(point.observed_at)}</strong></div>`).join('') || '<p class="empty">No point-level history in this snapshot.</p>'}
    </div>
    <div class="section">
      <h3>Warnings</h3>
      ${renderList(snapshot.warnings || [])}
    </div>
  `;
}

function renderMediaGrid(media = []) {
  return media.length
    ? `<div class="media-grid">${media.map(asset => `
        <a class="media-thumb" href="${escapeAttribute(asset.url)}" target="_blank" rel="noreferrer">
          <img src="${escapeAttribute(asset.url)}" alt="${escapeAttribute(asset.alt || asset.variant || 'Product media')}">
          <span>${escapeHtml(asset.variant || asset.media_type)}</span>
        </a>
      `).join('')}</div>`
    : '<p class="empty">No media assets stored yet.</p>';
}

function renderWorkbenchInspector(workbench) {
  const preview = workbench.preview;
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Saved mappings</span><strong>${workbench.mappings.mappings.length}</strong></div>
    <div class="kv"><span>Connector contracts</span><strong>${workbench.contracts.contracts.length}</strong></div>
    <div class="kv"><span>Performance reports</span><strong>${workbench.reports.reports.length}</strong></div>
    <div class="section">
      <h3>Source-to-canonical preview</h3>
      ${(preview.cells || []).map(cell => `<div class="kv"><span>${escapeHtml(cell.source)}</span><strong>${escapeHtml(cell.target)} = ${escapeHtml(cell.mapped)}</strong></div>`).join('') || '<p class="empty">No mapping cells.</p>'}
    </div>
    <div class="section">
      <h3>Unit conversion</h3>
      <div class="kv"><span>weight_lbs</span><strong>${escapeHtml(preview.preview?.[0]?.weight || '')} lb</strong></div>
    </div>
  `;
}

function renderQualityInspector(quality) {
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Duplicate queue</span><strong>${quality.duplicates.candidates.length}</strong></div>
    <div class="kv"><span>Merge events</span><strong>${quality.duplicates.merge_events.length}</strong></div>
    <div class="kv"><span>Digital products</span><strong>${quality.digital.digital_products.length}</strong></div>
    <div class="kv"><span>Forecast actuals</span><strong>${quality.forecastQuality.actuals.length}</strong></div>
    <div class="kv"><span>Quality events</span><strong>${quality.forecastQuality.quality_events.length}</strong></div>
    <div class="section">
      <h3>Open duplicate reasons</h3>
      ${renderList(quality.duplicates.candidates.flatMap(candidate => candidate.reasons || []).slice(0, 12))}
    </div>
    <div class="section">
      <h3>Forecast remediation</h3>
      ${renderList(quality.forecastQuality.quality_events.map(event => event.remediation).slice(0, 8))}
    </div>
  `;
}

function renderCardOverview(data) {
  const latest = data.runs[0];
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Cards</span><strong>${data.cards.length}</strong></div>
    <div class="kv"><span>Placements</span><strong>${data.placements.length}</strong></div>
    <div class="kv"><span>Processes</span><strong>${data.processes.length}</strong></div>
    <div class="section">
      <h3>Repeating processes</h3>
      ${data.processes.map(process => `
        <div class="kv"><span>${escapeHtml(process.process_key)}</span><strong>${escapeHtml(process.cadence)} / ${escapeHtml(process.target_domain)}</strong></div>
      `).join('') || '<p class="empty">No processes.</p>'}
    </div>
    <div class="section">
      <h3>Latest run</h3>
      ${latest ? `<div class="kv"><span>${escapeHtml(latest.process_key)}</span><strong>${escapeHtml(latest.result?.decision || latest.status)} / ${escapeHtml(latest.actor)}</strong></div>` : '<p class="empty">No decision runs.</p>'}
    </div>
    <div class="section">
      <h3>Active placements</h3>
      ${data.placements.slice(0, 12).map(placement => `<div class="kv"><span>${escapeHtml(placement.role)}</span><strong>${escapeHtml(placement.card?.name || placement.card_id)} -> ${escapeHtml(placement.target_type)}:${escapeHtml(placement.target_id)}</strong></div>`).join('') || '<p class="empty">No placements.</p>'}
    </div>
  `;
}

function renderCardInspector(card) {
  const placements = (state.hapaCards?.placements || []).filter(placement => placement.card_id === card.id);
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Card</span><strong>${escapeHtml(card.name)}</strong></div>
    <div class="kv"><span>Kind</span><strong>${escapeHtml(card.card_kind)}</strong></div>
    <div class="kv"><span>Source</span><strong>${escapeHtml(card.source_node || '')}</strong></div>
    <div class="section">
      <h3>Skills</h3>
      ${renderTags(card.skills || [])}
    </div>
    <div class="section">
      <h3>Context</h3>
      <p class="detail-copy">${escapeHtml(card.context?.voice || card.context?.decision_bias || 'No card context stored.')}</p>
      ${renderList(card.context?.checks || [])}
    </div>
    <div class="section">
      <h3>Placements</h3>
      ${placements.map(placement => `<div class="kv"><span>${escapeHtml(placement.role)}</span><strong>${escapeHtml(placement.target_type)}:${escapeHtml(placement.target_id)} / ${escapeHtml(placement.decision_mode)}</strong></div>`).join('') || '<p class="empty">No placements for this card.</p>'}
    </div>
  `;
}

function renderPlacementInspector(placement) {
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Placed</span><strong>${escapeHtml(placement.card?.name || placement.card_id)}</strong></div>
    <div class="kv"><span>Target</span><strong>${escapeHtml(placement.target_type)}:${escapeHtml(placement.target_id)}</strong></div>
    <div class="kv"><span>Role</span><strong>${escapeHtml(placement.role)}</strong></div>
    <div class="kv"><span>Mode</span><strong>${escapeHtml(placement.decision_mode)}</strong></div>
    <div class="section">
      <h3>Context</h3>
      <p class="detail-copy">${escapeHtml(placement.card?.context?.decision_bias || placement.card?.context?.voice || '')}</p>
    </div>
  `;
}

function renderDecisionInspector(payload) {
  const result = payload.result || payload.run?.result || {};
  const bundle = result.execution_context || payload.context?.context_bundle || {};
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Decision</span><strong>${escapeHtml(result.decision || payload.run?.status || 'completed')}</strong></div>
    <div class="kv"><span>Process</span><strong>${escapeHtml(payload.run?.process_key || payload.context?.process_key || '')}</strong></div>
    <div class="kv"><span>Routed cards</span><strong>${(result.routed_cards || []).length}</strong></div>
    <div class="kv"><span>Required reviews</span><strong>${(result.required_reviews || []).length}</strong></div>
    <div class="section">
      <h3>Routed cards</h3>
      ${(result.routed_cards || []).map(card => `<div class="kv"><span>${escapeHtml(card.role)}</span><strong>${escapeHtml(card.name || card.card_id)} / ${escapeHtml(card.decision_mode)}</strong></div>`).join('') || '<p class="empty">No cards routed.</p>'}
    </div>
    <div class="section">
      <h3>Execution notes</h3>
      ${renderList(bundle.execution_notes || [])}
    </div>
    <div class="section">
      <h3>Next actions</h3>
      ${renderList(result.next_actions || [])}
    </div>
  `;
}

function renderObjectInspector(title, object) {
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Object</span><strong>${escapeHtml(title)}</strong></div>
    <div class="section">
      <h3>Payload</h3>
      <pre class="json-block">${escapeHtml(JSON.stringify(object, null, 2))}</pre>
    </div>
  `;
}

function hapaCardRow(card) {
  return `
    <article class="hapa-card-row ${state.activeCardId === card.id ? 'selected' : ''}" draggable="true" data-card-id="${escapeAttribute(card.id)}" role="button" tabindex="0">
      <div>
        <strong>${escapeHtml(card.name)}</strong>
        <small>${escapeHtml(card.source_node || 'local')} / ${escapeHtml((card.skills || []).slice(0, 3).join(', '))}</small>
      </div>
      <span class="badge">${escapeHtml(card.card_kind)}</span>
    </article>
  `;
}

function renderCardDropZones(data) {
  const groups = [
    {
      title: 'Governance roles',
      zones: [
        { label: 'Catalog Admin', placement_type: 'governance_role', target_type: 'role', target_id: 'catalog_admin', role: 'advisor', decision_mode: 'context', priority: 20 },
        { label: 'Product Steward', placement_type: 'governance_role', target_type: 'role', target_id: 'product_data_steward', role: 'advisor', decision_mode: 'context', priority: 20 },
        { label: 'Inventory Planner', placement_type: 'governance_role', target_type: 'role', target_id: 'inventory_planner', role: 'advisor', decision_mode: 'context', priority: 20 },
        { label: 'Demand Planner', placement_type: 'governance_role', target_type: 'role', target_id: 'demand_planner', role: 'advisor', decision_mode: 'context', priority: 20 }
      ]
    },
    {
      title: 'Catalog/SKU governance',
      zones: [
        { label: 'In-stock', placement_type: 'catalog_domain', target_type: 'catalog_domain', target_id: 'in-stock', role: 'governor', decision_mode: 'review_required', priority: 10 },
        { label: 'Forecasting', placement_type: 'catalog_domain', target_type: 'catalog_domain', target_id: 'forecasting', role: 'governor', decision_mode: 'review_required', priority: 10 },
        { label: 'SKU Governance', placement_type: 'catalog_domain', target_type: 'catalog_domain', target_id: 'sku-governance', role: 'governor', decision_mode: 'review_required', priority: 10 },
        { label: 'All Decisions', placement_type: 'global', target_type: 'governance', target_id: 'all-decisions', role: 'protocol', decision_mode: 'context', priority: 5 }
      ]
    },
    {
      title: 'Repeating processes',
      zones: data.processes.map(process => ({
        label: process.name,
        placement_type: 'process',
        target_type: 'process',
        target_id: process.process_key,
        role: 'governor',
        decision_mode: 'review_required',
        priority: 10,
        process: true
      }))
    }
  ];
  return groups.map(group => `
    <div class="drop-group">
      <h3>${escapeHtml(group.title)}</h3>
      ${group.zones.map(zone => cardDropZone(zone, data.placements)).join('')}
    </div>
  `).join('');
}

function cardDropZone(zone, placements) {
  const placed = placements.filter(placement =>
    placement.placement_type === zone.placement_type
    && placement.target_type === zone.target_type
    && placement.target_id === zone.target_id
  );
  return `
    <div class="drop-zone"
      data-drop-zone="true"
      data-placement-type="${escapeAttribute(zone.placement_type)}"
      data-target-type="${escapeAttribute(zone.target_type)}"
      data-target-id="${escapeAttribute(zone.target_id)}"
      data-role="${escapeAttribute(zone.role)}"
      data-decision-mode="${escapeAttribute(zone.decision_mode)}"
      data-priority="${escapeAttribute(zone.priority)}">
      <div>
        <strong>${escapeHtml(zone.label)}</strong>
        <small>${escapeHtml(zone.role)} / ${escapeHtml(zone.decision_mode)}</small>
      </div>
      ${zone.process ? `<button class="mini-action" data-run-process="${escapeAttribute(zone.target_id)}" aria-label="Run ${escapeAttribute(zone.label)}">Run</button>` : ''}
      <div class="placement-pile">
        ${placed.map(placement => `<span class="placement-pill">${escapeHtml(placement.card?.name || placement.card_id)}</span>`).join('') || '<span class="placement-pill empty-pill">open</span>'}
      </div>
    </div>
  `;
}

function attachCardInteractions() {
  els.list.querySelectorAll('[data-card-id]').forEach(row => {
    const card = state.hapaCards.cards.find(item => item.id === row.dataset.cardId);
    row.addEventListener('pointerdown', () => {
      state.dragCardId = row.dataset.cardId;
      state.activeCardId = row.dataset.cardId;
      els.list.querySelectorAll('[data-card-id]').forEach(item => item.classList.toggle('selected', item.dataset.cardId === state.activeCardId));
    });
    row.addEventListener('dragstart', event => {
      event.dataTransfer.setData('text/plain', row.dataset.cardId);
      event.dataTransfer.effectAllowed = 'copy';
    });
    const inspect = () => {
      state.activeCardId = row.dataset.cardId;
      if (card) renderCardInspector(card);
      els.list.querySelectorAll('[data-card-id]').forEach(item => item.classList.toggle('selected', item.dataset.cardId === state.activeCardId));
    };
    row.addEventListener('click', inspect);
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        inspect();
      }
    });
  });
  els.list.querySelectorAll('[data-drop-zone]').forEach(zone => {
    zone.addEventListener('pointerup', async event => {
      if (!state.dragCardId) return;
      const cardId = state.dragCardId;
      state.dragCardId = '';
      await placeCardOnZone(cardId, zone.dataset);
    });
    zone.addEventListener('dragover', event => {
      event.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', async event => {
      event.preventDefault();
      zone.classList.remove('drag-over');
      const cardId = event.dataTransfer.getData('text/plain');
      state.dragCardId = '';
      if (cardId) await placeCardOnZone(cardId, zone.dataset);
    });
    zone.addEventListener('click', () => renderZoneInspector(zone.dataset));
  });
  els.list.querySelectorAll('[data-run-process]').forEach(button => {
    button.addEventListener('click', async event => {
      event.stopPropagation();
      await runDecisionProcess(button.dataset.runProcess);
    });
  });
}

function renderZoneInspector(zone) {
  const placements = (state.hapaCards?.placements || []).filter(placement =>
    placement.placement_type === zone.placementType
    && placement.target_type === zone.targetType
    && placement.target_id === zone.targetId
  );
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Target</span><strong>${escapeHtml(zone.targetType)}:${escapeHtml(zone.targetId)}</strong></div>
    <div class="kv"><span>Default role</span><strong>${escapeHtml(zone.role)}</strong></div>
    <div class="kv"><span>Mode</span><strong>${escapeHtml(zone.decisionMode)}</strong></div>
    <div class="section">
      <h3>Placed cards</h3>
      ${placements.map(placement => `<div class="kv"><span>${escapeHtml(placement.role)}</span><strong>${escapeHtml(placement.card?.name || placement.card_id)}</strong></div>`).join('') || '<p class="empty">No cards placed here.</p>'}
    </div>
  `;
}

async function placeCardOnZone(cardId, zone) {
  const payload = await api('/v1/hapa-card-placements', {
    method: 'POST',
    body: JSON.stringify({
      card_id: cardId,
      placement_type: zone.placementType,
      target_type: zone.targetType,
      target_id: zone.targetId,
      role: zone.role,
      decision_mode: zone.decisionMode,
      priority: Number(zone.priority || 50),
      actor: 'web-ui',
      metadata: { surface: 'web-cards', placed_by: 'drag-drop' }
    })
  });
  await loadHapaCards({ render: false });
  await renderCards();
  renderPlacementInspector(payload.placement);
}

async function runDecisionProcess(processKey) {
  const payload = await api('/v1/hapa-decisions/run', {
    method: 'POST',
    body: JSON.stringify({
      process_key: processKey,
      subject_type: 'process',
      subject_id: processKey,
      actor: 'web-ui'
    })
  });
  await loadHapaCards({ render: false });
  await renderCards();
  renderDecisionInspector(payload);
}

function opsRows(ops) {
  const row = (kind, title, subtitle, item) => ({ kind, title: title || kind, subtitle: subtitle || '', item });
  return [
    ...(ops.schema || []).map(item => row('schema', item.version, `${item.status} / ${item.name}`, item)),
    ...(ops.import_review_rows || []).map(item => row('review', `Row ${item.row_index}`, `${item.status} / ${item.batch_source}`, item)),
    ...(ops.connector_runs || []).map(item => row('connector', item.connector_name || item.connector_id, `${item.mode} / ${item.status} / ${item.fetched_count} fetched`, item)),
    ...(ops.identity_sessions || []).map(item => row('session', item.identity_name || item.identity_id, `${item.status} / expires ${item.expires_at}`, item)),
    ...(ops.forecast_comparisons || []).map(item => row('forecast', item.sku, `${item.location} / winner ${item.winner?.key || 'none'}`, item)),
    ...(ops.market_provider_runs || []).map(item => row('market', item.provider, `${item.status} / ${item.lookup}`, item)),
    ...(ops.projection_exports || []).map(item => row('projection', item.dataset, `${item.target} / ${item.row_count} rows`, item)),
    ...(ops.pricing_scenarios || []).map(item => row('pricing', item.sku, `$${formatMoney(item.recommended_price)} recommended`, item)),
    ...(ops.lifecycle_events || []).map(item => row('lifecycle', item.sku, `${item.from_state} -> ${item.to_state}`, item)),
    ...(ops.publishing_runs || []).map(item => row('publish', item.channel, `${item.status} / ${item.sku_count} SKUs`, item)),
    ...(ops.telemetry_registrations || []).map(item => row('telemetry', item.endpoint, `${item.status} / ${item.heartbeat_at}`, item)),
    ...(ops.organizations || []).map(item => row('org', item.name, `${item.kind} / ${item.id}`, item)),
    ...(ops.tenants || []).map(item => row('tenant', item.identity_name, `${item.role} / ${item.organization_name}`, item)),
    ...(ops.inventory_ledger_events || []).map(item => row('ledger', item.sku, `${item.event_type} / balance ${item.balance_after}`, item)),
    ...(ops.inventory_reconciliations || []).map(item => row('reconcile', item.facility, `${item.status} / ${item.discrepancy_count} deltas`, item)),
    ...(ops.quality_rules || []).map(item => row('rule', item.name, `${item.severity} / ${item.owner_role}`, item)),
    ...(ops.quality_work_orders || []).map(item => row('work-order', item.rule_name || item.rule_id, `${item.status} / ${item.message}`, item)),
    ...(ops.desktop_packages || []).map(item => row('desktop', item.platform, `${item.status} / ${item.artifact_ref}`, item)),
    ...(ops.lineage_exports || []).map(item => row('lineage', item.dataset, `${item.status} / ${item.row_count} rows`, item)),
    ...(ops.retention_policies || []).map(item => row('retention', item.name, `${item.dataset} / ${item.status}`, item)),
    ...(ops.backup_runs || []).map(item => row('backup', item.backup_type, `${item.status} / ${item.artifact_ref}`, item)),
    ...(ops.review_evidence_bundles || []).map(item => row('evidence', item.bundle_type, `${item.status} / ${item.artifact_count} artifacts / ${item.test_run_count} tests`, item)),
    ...(ops.event_envelopes || []).map(item => row('event', item.event_type, `${item.object_type}:${item.object_id}`, item)),
    ...(ops.projection_checkpoints || []).map(item => row('checkpoint', item.consumer, `${item.status} / ${item.source} / ${item.row_count} rows`, item)),
    ...(ops.credential_refs || []).map(item => row('credential', item.provider, `${item.status} / ${item.label}`, item)),
    ...(ops.decision_queue_items || []).map(item => row('decision', item.process_key, `${item.status} / ${item.subject_id} / ${item.severity}`, item)),
    ...(ops.trust_attestations || []).map(item => row('trust', item.attestation_type, `${item.status} / ${item.subject}`, item)),
    ...(ops.pilot_runbooks || []).map(item => row('pilot', item.name, `${item.status} / ${item.actor}`, item)),
    ...(ops.release_gate_evaluations || []).map(item => row('gate', item.gate, `${item.status} / ${item.actor}`, item)),
    ...(ops.review_decision_records || []).map(item => row('review-decision', item.subject, `${item.status} / ${item.record_type} / ${item.owner}`, item)),
    ...(ops.pilot_operation_records || []).map(item => row('pilot-op', item.operation_type, `${item.status} / ${item.tenant_id}`, item)),
    ...(ops.platform_hardening_records || []).map(item => row('hardening', item.check_type, `${item.status} / ${item.target}`, item)),
    ...(ops.agent_governance_records || []).map(item => row('agent-gov', item.governance_type, `${item.status} / ${item.process_key}`, item)),
    ...(ops.commercial_readiness_records || []).map(item => row('commercial', item.record_type, `${item.status} / ${item.audience}`, item)),
    ...(ops.next_cycle_artifacts || []).map(item => row('next-cycle', item.subject, `${item.phase} / ${item.status} / ${item.artifact_type}`, item)),
    ...(ops.next_cycle_test_runs || []).map(item => row('test-run', item.test_type, `${item.status} / ${item.target}`, item))
  ];
}

async function runOpsAction(action) {
  const routes = {
    schema: ['/v1/schema/migrations', { version: 'catalog-post-mvp-v1', name: 'Post-MVP Hapa operations scaffold', actor: 'web-ui' }],
    session: ['/v1/identity-sessions', { identity_id: 'local_operator', actor: 'web-ui' }],
    connector: ['/v1/connectors/run', { connector_id: 'connector-wms-3pl', mode: 'dry_run', actor: 'web-ui' }],
    projection: ['/v1/projections/sync', { target: 'hapa-lance-node', actor: 'web-ui' }],
    quality: ['/v1/quality/evaluate', { actor: 'web-ui' }],
    publish: ['/v1/publishing/runs', { channel: 'storefront', actor: 'web-ui' }],
    desktop: ['/v1/desktop/packages', { platform: navigator.platform || 'desktop', actor: 'web-ui' }],
    lineage: ['/v1/lineage/exports', { dataset: 'catalog_items', actor: 'web-ui' }],
    backup: ['/v1/backups', { actor: 'web-ui' }],
    'next-review': ['/v1/next-cycle/run', { phase: 'review', actor: 'web-ui' }],
    'next-connected': ['/v1/next-cycle/run', { phase: 'connected', actor: 'web-ui' }],
    'next-governance': ['/v1/next-cycle/run', { phase: 'governance', actor: 'web-ui' }],
    'next-intelligence': ['/v1/next-cycle/run', { phase: 'intelligence', actor: 'web-ui' }],
    'next-release': ['/v1/next-cycle/run', { phase: 'release', actor: 'web-ui' }],
    'next-all': ['/v1/next-cycle/run', { phase: 'all', actor: 'web-ui' }],
    'next-continuation': ['/v1/next-cycle/run', { phase: 'continuation', actor: 'web-ui' }],
    'next-review-prep': ['/v1/next-cycle/run', { phase: 'review-prep', actor: 'web-ui' }],
    'next-review-execution': ['/v1/next-cycle/run', { phase: 'review-execution', actor: 'web-ui' }],
    'next-review-readout': ['/v1/next-cycle/run', { phase: 'review-readout', actor: 'web-ui' }],
    'next-review-alpha': ['/v1/next-cycle/run', { phase: 'review-alpha', actor: 'web-ui' }],
    'next-review-next': ['/v1/next-cycle/run', { phase: 'review-next', actor: 'web-ui' }],
    'next-review-operating': ['/v1/next-cycle/run', { phase: 'review-operating', actor: 'web-ui' }],
    'next-parity-docs-ui': ['/v1/next-cycle/run', { phase: 'parity-docs-ui', actor: 'web-ui' }]
  };
  const [path, body] = routes[action] || [];
  if (!path) return;
  const payload = await api(path, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  await loadOps({ render: false });
  renderOps();
  renderObjectInspector(`Ops action: ${action}`, payload);
}

function renderOpsInspector(ops) {
  const summary = ops.summary || {};
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>Schema</span><strong>${summary.schema_migrations || 0} migrations / ${summary.connector_runs || 0} connector runs</strong></div>
    <div class="kv"><span>Governance</span><strong>${summary.identity_sessions || 0} sessions / ${summary.organizations || 0} orgs</strong></div>
    <div class="kv"><span>Catalog Ops</span><strong>${summary.projection_exports || 0} projections / ${summary.publishing_runs || 0} publishing runs</strong></div>
    <div class="kv"><span>Quality</span><strong>${summary.quality_rules || 0} rules / ${summary.quality_work_orders || 0} work orders</strong></div>
    <div class="kv"><span>Recovery</span><strong>${summary.backup_runs || 0} backups / ${summary.lineage_exports || 0} lineage exports</strong></div>
    <div class="kv"><span>Alpha Ops</span><strong>${summary.review_evidence_bundles || 0} bundles / ${summary.event_envelopes || 0} events / ${summary.decision_queue_items || 0} decisions</strong></div>
    <div class="kv"><span>Trust & Pilot</span><strong>${summary.trust_attestations || 0} attestations / ${summary.pilot_runbooks || 0} runbooks / ${summary.release_gate_evaluations || 0} gates</strong></div>
    <div class="kv"><span>Review Next</span><strong>${summary.review_decision_records || 0} decisions / ${summary.pilot_operation_records || 0} pilot ops / ${summary.platform_hardening_records || 0} hardening / ${summary.agent_governance_records || 0} agent gov / ${summary.commercial_readiness_records || 0} commercial</strong></div>
    <div class="kv"><span>Next Cycle</span><strong>${summary.next_cycle_artifacts || 0} artifacts / ${summary.next_cycle_test_runs || 0} tests</strong></div>
    <div class="section">
      <h3>Phase Coverage</h3>
      ${renderList([
        'HCAT-040..046 production foundation: migrations, review queues, connectors, sessions, model comparisons, provider cache records, performance reports.',
        'HCAT-047..052 connected intelligence: Hapa Lance projections, seasonality/promotions, pricing scenarios, lifecycle transitions, publishing, telemetry registration.',
        'HCAT-053..057 enterprise scale: tenancy, inventory ledger/reconciliation, configurable quality rules, desktop package plan, lineage/retention/backup.',
        'HCAT-062..089 review readiness, connected pilots, governance controls, intelligence workbench, release hardening, and automated test evidence.',
        'HCAT-090..109 pilot operations, agent decision ops, compliance/admin readiness, test scale, and pilot learning loop.',
        'HCAT-110..134 review-room readiness, design partner pilot, agent operating model, integration/data hardening, and productization prep.',
        'HCAT-135..159 review execution, pilot commitments, production architecture decisions, admin/governance UX, and next work-cycle planning.',
        'HCAT-160..184 review readout closure, pilot kickoff readiness, build-cycle alpha planning, enterprise trust/compliance prep, and review automation/board hygiene.',
        'HCAT-185..209 review evidence automation, alpha platform foundations, decision/quality ops, enterprise trust verification, and pilot release gates.',
        'HCAT-210..234 review room decision readiness, pilot operations activation, production platform hardening, agent governance operations, and commercialization/refill gates.',
	        'HCAT-235..259 review room operating session, design partner pilot entry, production reliability slice, governed agent runtime, and commercial/refill signoff.',
	        'HCAT-260..284 surface parity, documentation completion, demo data expansion, operator UI polish, and review rehearsal/refill QA.'
	      ])}
    </div>
  `;
}

function renderOpsActionGroups() {
  return `
    <section class="ops-actions">
      ${opsActionGroups().map(group => `
        <div class="ops-action-group">
          <span>${escapeHtml(group.title)}</span>
          <div>
            ${group.actions.map(([action, label]) => `<button class="mini-action" data-ops-action="${action}">${label}</button>`).join('')}
          </div>
        </div>
      `).join('')}
    </section>
  `;
}

function opsActionGroups() {
  return [
    {
      title: 'Data',
      actions: [['schema', 'Migration'], ['connector', 'Connector'], ['projection', 'Projection'], ['quality', 'Quality']]
    },
    {
      title: 'Identity',
      actions: [['session', 'Session']]
    },
    {
      title: 'Lifecycle',
      actions: [['publish', 'Publish'], ['desktop', 'Desktop'], ['lineage', 'Lineage'], ['backup', 'Backup']]
    },
    {
      title: 'Next Cycle',
      actions: [['next-all', 'MVP'], ['next-continuation', 'Continue'], ['next-review-prep', 'Prep'], ['next-review-execution', 'Execute'], ['next-review-readout', 'Readout'], ['next-review-alpha', 'Alpha'], ['next-review-next', 'Next'], ['next-review-operating', 'Operate'], ['next-parity-docs-ui', 'Parity']]
    },
    {
      title: 'Review Ops',
      actions: [['next-review', 'Review'], ['next-connected', 'Pilot'], ['next-governance', 'Governance'], ['next-intelligence', 'Intelligence'], ['next-release', 'Release']]
    }
  ];
}

function findBoardTask(taskId) {
  return state.board?.columns.flatMap(column => column.tasks).find(task => task.id === taskId);
}

function matchesTask(task, query) {
  if (!query) return true;
  return [task.id, task.title, task.description, task.lane, task.owner, task.priority, ...(task.tags || []), ...(task.requirements || [])]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

function useListMode() {
  els.list.className = 'list';
}

function useCardMode() {
  els.list.className = 'list card-list';
}

function setActiveNav(view) {
  document.querySelectorAll('.nav').forEach(item => item.classList.toggle('active', item.dataset.view === view));
}

function marketLookupPayload(lookup) {
  if (/^https?:\/\//i.test(lookup)) return { url: lookup };
  if (/^[A-Z0-9]{10}$/i.test(lookup)) return { asin: lookup.toUpperCase() };
  if (/^\d{8,14}$/.test(lookup.replace(/\D/g, ''))) return { upc: lookup.replace(/\D/g, '') };
  return { asin: lookup };
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function renderList(items = []) {
  return items.length
    ? `<ul class="clean-list">${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="empty">No entries.</p>';
}

function renderTags(items = []) {
  return items.length
    ? `<div class="tag-row">${items.map(item => `<span class="badge">${escapeHtml(item)}</span>`).join('')}</div>`
    : '<p class="empty">No tags.</p>';
}

function renderInspector(item) {
  els.inspectorBody.innerHTML = `
    <div class="kv"><span>SKU</span><strong>${escapeHtml(item.sku)}</strong></div>
    <div class="kv"><span>Name</span><strong>${escapeHtml(item.sku_name)}</strong></div>
    <div class="kv"><span>Product</span><strong>${escapeHtml(item.product_name)}</strong></div>
    <div class="kv"><span>Brand</span><strong>${escapeHtml(item.brand)}</strong></div>
    <div class="kv"><span>Category</span><strong>${escapeHtml(item.category)}</strong></div>
    <div class="kv"><span>Supplier</span><strong>${escapeHtml(item.supplier_name || '')}</strong></div>
    <div class="section">
      <h3>Identifiers</h3>
      ${Object.entries(item.identifiers || {}).map(([key, value]) => `<div class="kv"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value || '')}</strong></div>`).join('')}
    </div>
    <div class="section">
      <h3>Normalized identifiers</h3>
      ${(item.normalized_identifiers || []).map(identifier => `<div class="kv"><span>${escapeHtml(identifier.scheme)}</span><strong>${escapeHtml(identifier.value)} / ${escapeHtml(identifier.source)}</strong></div>`).join('') || '<p class="empty">No normalized identifiers.</p>'}
    </div>
    <div class="section">
      <h3>Inventory</h3>
      ${(item.inventory || []).map(pos => `<div class="kv"><span>${escapeHtml(pos.location)}</span><strong>${pos.available} available / ${pos.on_hand} on hand</strong></div>`).join('') || '<p class="empty">No inventory position.</p>'}
    </div>
    <div class="section">
      <h3>Packaging</h3>
      ${(item.packaging || []).map(pack => `<div class="kv"><span>${escapeHtml(pack.level)}</span><strong>${pack.units_per_pack} units / ${escapeHtml(pack.gtin || '')}</strong></div>`).join('') || '<p class="empty">No packaging.</p>'}
    </div>
    <div class="section">
      <h3>Forecast</h3>
      ${item.forecast ? `<div class="kv"><span>Confidence</span><strong>${Math.round((item.forecast.explanation.confidence || 0) * 100)}%</strong></div>` : '<p class="empty">Run a forecast for this SKU.</p>'}
    </div>
    <div class="section">
      <h3>Forecast quality</h3>
      ${(item.forecast_quality || []).map(event => `<div class="kv"><span>${escapeHtml(event.miss_reason || 'quality')}</span><strong>${event.absolute_error} abs error / ${escapeHtml(event.remediation)}</strong></div>`).join('') || '<p class="empty">No actuals matched to this SKU yet.</p>'}
    </div>
    <div class="section">
      <h3>Market price history</h3>
      ${(item.market || []).map(row => `<div class="kv"><span>${escapeHtml(row.price_type)}</span><strong>${row.points} points / low $${formatMoney(row.lowest)} / high $${formatMoney(row.highest)}</strong></div>`).join('') || '<p class="empty">No market price history stored.</p>'}
    </div>
    <div class="section">
      <h3>Digital product</h3>
      ${item.digital_product ? `<div class="kv"><span>${escapeHtml(item.digital_product.version || 'version')}</span><strong>${escapeHtml(item.digital_product.license || item.digital_product.entitlement || 'digital entitlement')}</strong></div>` : '<p class="empty">No digital product object linked.</p>'}
    </div>
    <div class="section">
      <h3>Amazon listing media</h3>
      ${renderMediaGrid((item.market_listing?.media || []).filter(asset => asset.media_type === 'image').slice(0, 8))}
    </div>
    <div class="section">
      <h3>Amazon listing snapshots</h3>
      ${(item.market_listing?.snapshots || []).map(snapshot => `<div class="kv"><span>${escapeHtml(snapshot.source)}</span><strong>${snapshot.rating || 'n/a'} stars / ${snapshot.review_count || 0} ratings</strong></div>`).join('') || '<p class="empty">No listing snapshots stored.</p>'}
    </div>
  `;
}

function starterMapping() {
  return {
    id: 'mapping-web-starter',
    name: 'Web starter supplier mapping',
    version: 'mapping-v1',
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
      weight: 'weight_oz',
      facility: 'warehouse',
      location: 'bin',
      on_hand: 'qty'
    },
    defaults: {
      lifecycle: 'active',
      status: 'active'
    },
    conversions: {
      weight: { from: 'oz', to: 'lb', factor: 0.0625 }
    }
  };
}

function starterSourceRecord() {
  return {
    supplier_item: 'SUP-ALPHA-9',
    description: 'Alpha Ring Size 9',
    brand_name: 'Northstar',
    dept: 'jewelry',
    barcode: '0001112223331',
    supplier_name: 'Supplier Portal Demo',
    uom: 'case',
    case_qty: '12',
    weight_oz: '32',
    warehouse: 'main',
    bin: 'A-01',
    qty: '24'
  };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

refreshAll();
