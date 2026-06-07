const state = {
  view: window.location.hash?.replace('#', '') || 'items',
  query: '',
  category: '',
  brand: '',
  status: '',
  selectedSku: '',
  selectedCardId: '',
  forecastMetric: 'demand_units',
  forecastGrain: 'category',
  forecastIncrement: 'weeks',
  forecastOverrideReason: 'planning adjustment',
  forecastOverrides: []
};

const ASSET_VERSION = '20260607-item-master-v8';
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
  state.selectedSku = demo.selected_item?.sku || displayItems().find(itemHasMarketFidelity)?.sku || demo.items[0]?.sku || '';
  state.selectedCardId = demo.hapa.cards[0]?.id || '';
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
  const allItems = displayItems();
  const enrichedItems = allItems.filter(itemHasMarketFidelity);
  els.listTitle.textContent = 'Item Master';
  els.listMeta.textContent = `${rows.length} of ${allItems.length} rows / ${enrichedItems.length} enriched`;
  els.list.className = 'list item-master';
  els.list.innerHTML = [
    telemetry([
      ['Rows', rows.length],
      ['Categories', new Set(rows.map(item => item.category).filter(Boolean)).size],
      ['Brands', new Set(rows.map(item => item.brand).filter(Boolean)).size],
      ['Enriched', enrichedItems.length]
    ]),
    renderEnrichedItemCallout(enrichedItems[0]),
    ...rows.map(item => renderItemRow(item))
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
  const selected = displayItems().find(item => item.sku === state.selectedSku) || rows[0] || allItems[0];
  renderItemInspector(selected);
}

function displayItems() {
  return demo?.item_master?.length ? demo.item_master : demo.items || [];
}

function filteredItems() {
  return displayItems().filter(item => (
    (!state.category || item.category === state.category)
    && (!state.brand || item.brand === state.brand)
    && (!state.status || item.status === state.status)
    && itemSearchText(item).includes(state.query)
  ));
}

function renderEnrichedItemCallout(item) {
  if (!item) return '';
  const media = mediaForItem(item);
  const listing = latestListingForItem(item);
  const primary = primaryMediaForItem(item);
  return `
    <article class="item-enrichment-callout" data-sku="${escapeAttribute(item.sku)}" role="button" tabindex="0">
      ${primary ? `<img src="${escapeAttribute(primary.url)}" alt="${escapeAttribute(primary.alt || item.sku_name)}" loading="lazy" referrerpolicy="no-referrer" />` : '<div class="item-thumb-placeholder">ASIN</div>'}
      <div>
        <span class="micro-label">High Fidelity Item Master Record</span>
        <h3>${escapeHtml(item.sku_name)}</h3>
        <p>${escapeHtml(item.sku)} / ASIN ${escapeHtml(item.identifiers?.asin || 'n/a')} / UPC ${escapeHtml(item.identifiers?.upc || item.identifiers?.gtin || 'n/a')}</p>
        <div class="item-row-meta">
          <span>${escapeHtml(media.length)} media assets</span>
          <span>${escapeHtml(identifierPairs(item).length)} identifiers</span>
          <span>${escapeHtml(listing?.availability || 'listing snapshot')}</span>
          <span>${formatCurrency(listing?.price || item.price, listing?.currency)}</span>
        </div>
      </div>
    </article>
  `;
}

function renderItemRow(item) {
  const primary = primaryMediaForItem(item);
  const mediaCount = mediaForItem(item).length;
  const listing = latestListingForItem(item);
  const identifierSummary = identifierPairs(item).slice(0, 4);
  return `
    <article class="row item-row ${item.sku === state.selectedSku ? 'selected' : ''}" data-sku="${escapeAttribute(item.sku)}" role="button" tabindex="0">
      ${primary ? `<img class="item-row-thumb" src="${escapeAttribute(primary.url)}" alt="${escapeAttribute(primary.alt || item.sku_name)}" loading="lazy" referrerpolicy="no-referrer" />` : '<div class="item-row-thumb item-thumb-placeholder">SKU</div>'}
      <div class="item-row-main">
        <strong>${escapeHtml(item.sku)}</strong>
        <small>${escapeHtml(item.sku_name)} / ${escapeHtml(item.brand || '')} / ${escapeHtml(item.category || '')}</small>
        <div class="identifier-chip-row">
          ${identifierSummary.map(([key, value]) => `<span>${escapeHtml(key)}: ${escapeHtml(value)}</span>`).join('') || '<span>No identifiers</span>'}
        </div>
      </div>
      <div class="item-row-side">
        <span class="badge">${escapeHtml(item.status)}</span>
        <small>${mediaCount ? `${mediaCount} media` : 'no media'} / ${listing ? 'listing' : 'catalog'}</small>
      </div>
    </article>
  `;
}

function renderItemInspector(item) {
  if (!item) {
    els.inspectorBody.innerHTML = '<p class="empty">No item selected.</p>';
    return;
  }
  const positions = (item.inventory?.length ? item.inventory : demo.inventory.filter(position => position.sku === item.sku)).slice(0, 4);
  const media = mediaForItem(item);
  const primary = primaryMediaForItem(item);
  const documents = media.filter(asset => asset.media_type === 'document' || /\.pdf(?:$|\?)/i.test(asset.url || ''));
  const listing = latestListingForItem(item);
  const identifiers = identifierPairs(item);
  const normalizedIdentifiers = item.normalized_identifiers || [];
  const marketSnapshots = marketSnapshotsForItem(item);
  const pricePoints = marketPointsForItem(item);
  const amazonListing = item.product_attributes?.amazon_listing || {};
  const listingDetails = amazonListing.details || {};
  els.inspectorBadge.textContent = item.status;
  els.inspectorBody.innerHTML = `
    <div class="item-inspector-hero">
      ${primary ? `<img src="${escapeAttribute(primary.url)}" alt="${escapeAttribute(primary.alt || item.sku_name)}" loading="lazy" referrerpolicy="no-referrer" />` : '<div class="item-hero-placeholder">No media</div>'}
      <div>
        <span class="type-pill">${escapeHtml(item.identifiers?.asin ? 'Amazon ASIN Item' : 'Catalog Item')}</span>
        <h3>${escapeHtml(item.sku_name)}</h3>
        <p>${escapeHtml(item.product_name || item.sku)}</p>
      </div>
    </div>
    ${kv('SKU', item.sku)}
    ${kv('Name', item.sku_name)}
    ${kv('Brand', item.brand || 'unknown')}
    ${kv('Category', item.category || 'unknown')}
    ${kv('Supplier', item.supplier_name || 'unknown')}
    ${kv('Price', formatCurrency(item.price, listing?.currency))}
    ${kv('Cost', formatCurrency(item.cost))}
    ${kv('Sales 30d', item.sales_30d ?? 0)}
    ${kv('Lead time', `${item.lead_time_days ?? 0} days`)}
    <section class="item-signal-grid">
      ${metric('Identifiers', identifiers.length)}
      ${metric('ID sources', new Set(normalizedIdentifiers.map(id => id.source)).size)}
      ${metric('Media', media.length)}
      ${metric('Market snapshots', marketSnapshots.length)}
    </section>
    <div class="section">
      <h3>Identifier Registry</h3>
      <div class="identifier-grid">
        ${identifiers.map(([key, value]) => `<div><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`).join('') || '<p class="empty">No identifiers recorded.</p>'}
      </div>
      <div class="identifier-source-list">
        ${normalizedIdentifiers.slice(0, 18).map(identifier => `<span>${escapeHtml(identifier.scheme)} / ${escapeHtml(identifier.source)} / ${escapeHtml(identifier.value)}</span>`).join('')}
      </div>
    </div>
    <div class="section">
      <h3>Amazon Listing</h3>
      ${listing ? `
        <article class="market-card">
          <strong>${escapeHtml(listing.title || item.sku_name)}</strong>
          <p>${formatCurrency(listing.price, listing.currency)} current / ${formatCurrency(listing.list_price, listing.currency)} list / ${escapeHtml(listing.availability || 'availability unknown')}</p>
          <small>${escapeHtml(listing.rating || amazonListing.rating || 'n/a')} rating / ${escapeHtml(listing.review_count || amazonListing.review_count || 0)} reviews / ${escapeHtml(listing.bought_in_last_month || amazonListing.bought_in_last_month || '')}</small>
        </article>
        ${renderBulletList(listing.feature_bullets || amazonListing.feature_bullets || [])}
      ` : '<p class="empty">No listing snapshot for this item.</p>'}
    </div>
    <div class="section">
      <h3>Media Gallery</h3>
      ${renderMediaGallery(media)}
      ${documents.length ? `<div class="document-list">${documents.map(doc => `<a class="doc-link" href="${escapeAttribute(doc.url)}">${escapeHtml(doc.variant || doc.alt || 'Document')}</a>`).join('')}</div>` : ''}
    </div>
    <div class="section">
      <h3>Market Provenance</h3>
      ${marketSnapshots.map(snapshot => `
        <article class="market-card">
          <strong>${escapeHtml(snapshot.source)} / ${escapeHtml(snapshot.status)}</strong>
          <p>${escapeHtml(snapshot.asin || item.identifiers?.asin || '')} / ${escapeHtml(snapshot.retrieved_at || snapshot.created_at || '')}</p>
          ${(snapshot.warnings || []).map(warning => `<small>${escapeHtml(warning)}</small>`).join('')}
        </article>
      `).join('') || '<p class="empty">No market snapshots recorded.</p>'}
      <p class="empty">${pricePoints.length ? `${pricePoints.length} append-only price points available.` : 'No fabricated price points: provider challenge snapshots are retained without inventing history.'}</p>
    </div>
    <div class="section">
      <h3>Inventory</h3>
      ${positions.map(pos => `<article class="checkpoint"><strong>${escapeHtml(pos.facility)} / ${escapeHtml(pos.location)}</strong><p>${pos.available} available, ${pos.on_hand} on hand, reorder at ${pos.reorder_point}</p></article>`).join('') || '<p class="empty">No inventory positions in snapshot.</p>'}
    </div>
    <div class="section">
      <h3>Schema Payload</h3>
      <div class="schema-payload-grid">
        ${renderJsonBlock('SKU attributes', item.sku_attributes)}
        ${renderJsonBlock('Taxonomy', item.taxonomy)}
        ${renderJsonBlock('Listing details', listingDetails)}
        ${renderJsonBlock('Provenance', item.provenance)}
      </div>
    </div>
  `;
}

function itemHasMarketFidelity(item) {
  return Boolean(
    item?.identifiers?.asin
    || item?.market_listing?.media?.length
    || item?.market_listing?.snapshots?.length
    || marketSnapshotsForItem(item).length
  );
}

function itemSearchText(item) {
  return [
    item.sku,
    item.sku_name,
    item.product_name,
    item.brand,
    item.category,
    item.status,
    item.supplier_name,
    ...identifierPairs(item).flat(),
    ...(item.normalized_identifiers || []).flatMap(identifier => [identifier.scheme, identifier.value, identifier.source]),
    latestListingForItem(item)?.title,
    latestListingForItem(item)?.availability
  ].join(' ').toLowerCase();
}

function identifierPairs(item) {
  return Object.entries(item?.identifiers || {})
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => [key, String(value)]);
}

function mediaForItem(item) {
  const localMedia = item?.market_listing?.media || [];
  const globalMedia = (demo.market?.media || []).filter(asset => asset.sku === item?.sku || asset.sku_id === item?.sku_id);
  return dedupeBy([...localMedia, ...globalMedia], asset => `${asset.media_type}:${asset.variant}:${asset.url}`);
}

function primaryMediaForItem(item) {
  return mediaForItem(item).find(asset => asset.media_type === 'image' && asset.variant === 'hiRes')
    || mediaForItem(item).find(asset => asset.media_type === 'image')
    || null;
}

function latestListingForItem(item) {
  return listingSnapshotsForItem(item)[0] || null;
}

function listingSnapshotsForItem(item) {
  const localListings = item?.market_listing?.snapshots || item?.market_listing?.listings || [];
  const globalListings = (demo.market?.listings || []).filter(listing => listing.sku === item?.sku || listing.sku_id === item?.sku_id);
  return dedupeBy([...localListings, ...globalListings], listing => listing.id || `${listing.source}:${listing.asin}:${listing.created_at}`)
    .sort((a, b) => String(b.created_at || b.retrieved_at || '').localeCompare(String(a.created_at || a.retrieved_at || '')));
}

function marketSnapshotsForItem(item) {
  return (demo.market?.snapshots || [])
    .filter(snapshot => snapshot.sku === item?.sku || snapshot.sku_id === item?.sku_id || snapshot.asin === item?.identifiers?.asin)
    .sort((a, b) => String(b.retrieved_at || b.created_at || '').localeCompare(String(a.retrieved_at || a.created_at || '')));
}

function marketPointsForItem(item) {
  return (demo.market?.points || [])
    .filter(point => point.sku === item?.sku || point.sku_id === item?.sku_id || point.asin === item?.identifiers?.asin);
}

function renderMediaGallery(media = []) {
  const gallery = media.filter(asset => asset.media_type === 'image').slice(0, 12);
  if (!gallery.length) return '<p class="empty">No image media recorded.</p>';
  return `
    <div class="media-gallery">
      ${gallery.map(asset => `
        <a class="media-tile" href="${escapeAttribute(asset.url)}" title="${escapeAttribute(asset.alt || asset.variant || 'media')}">
          <img src="${escapeAttribute(asset.url)}" alt="${escapeAttribute(asset.alt || 'Product media')}" loading="lazy" referrerpolicy="no-referrer" />
          <span>${escapeHtml(asset.variant || asset.media_type)}</span>
        </a>
      `).join('')}
    </div>
  `;
}

function renderBulletList(bullets = []) {
  if (!bullets.length) return '';
  return `
    <ul class="feature-bullets">
      ${bullets.slice(0, 6).map(bullet => `<li>${escapeHtml(bullet)}</li>`).join('')}
    </ul>
  `;
}

function renderJsonBlock(label, value) {
  const json = JSON.stringify(value || {}, null, 2);
  return `
    <details class="json-block">
      <summary>${escapeHtml(label)}</summary>
      <pre>${escapeHtml(json)}</pre>
    </details>
  `;
}

function formatCurrency(value, currency = 'USD') {
  if (value === null || value === undefined || value === '') return 'n/a';
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 'n/a';
  return `${currency || 'USD'} ${number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dedupeBy(items, keyFn) {
  const seen = new Set();
  return items.filter(item => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const cards = data.cards.filter(card => cardMatchesCardSearch(card, data));
  const selected = cards.find(card => card.id === state.selectedCardId) || cards[0] || data.cards[0];
  if (selected) state.selectedCardId = selected.id;
  els.listTitle.textContent = 'Hapa Cards';
  els.listMeta.textContent = `${cards.length}/${data.cards.length} cards shown / ${data.placements.length} placements / ${data.processes.length} processes`;
  els.list.className = 'list cards-workbench';
  els.list.innerHTML = `
    <section class="cards-hero">
      <div class="cards-hero-copy">
        <span class="micro-label">Card Routing</span>
        <h3>Place expertise and protocol rules onto the work</h3>
        <p>Avatar cards contribute operator context. Protocol cards attach guardrails. Placements decide where that context enters catalog, inventory, forecast, and review cycles.</p>
        <div class="workflow-steps" aria-label="How Hapa cards work">
          <span><strong>1</strong> Choose a card</span>
          <span><strong>2</strong> Place it on work</span>
          <span><strong>3</strong> Run with context</span>
        </div>
      </div>
      <img src="assets/hapa-cards-console.png?v=${ASSET_VERSION}" alt="Hapa cards operator console artwork" />
    </section>
    <section class="cards-summary">
      ${metric('Cards', data.cards.length)}
      ${metric('Placements', data.placements.length)}
      ${metric('Processes', data.processes.length)}
      ${metric('Decision runs', data.decision_runs.length)}
    </section>
    <section class="card-library-head">
      <div>
        <span class="micro-label">Card Library</span>
        <strong>Select a card to inspect how it changes execution</strong>
      </div>
      <p>Review required means the card is a governor. Context attached means the card's voice, checks, and policy are added to the run.</p>
    </section>
    <section class="hapa-card-grid">
      ${cards.map(card => renderHapaCard(card, data.placements.filter(place => place.card_id === card.id))).join('') || '<p class="empty">No cards match the current search.</p>'}
    </section>
    <section class="process-board">
      <header>
        <div>
          <span class="micro-label">Process Routing</span>
          <strong>Where cards enter execution</strong>
        </div>
        <p>Each process pulls matching global, domain, role, and process placements before it commits work.</p>
      </header>
      <div class="process-route-grid">
        ${data.processes.map(process => renderProcessRoute(process, data.placements)).join('')}
      </div>
    </section>
  `;
  els.list.querySelectorAll('[data-card-id]').forEach(cardButton => {
    cardButton.addEventListener('click', () => {
      state.selectedCardId = cardButton.dataset.cardId;
      renderCards();
    });
    cardButton.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      state.selectedCardId = cardButton.dataset.cardId;
      renderCards();
    });
  });
  els.inspectorBadge.textContent = 'cards';
  renderCardInspector(selected, data);
}

function renderHapaCard(card, placements = []) {
  const profile = cardProfile(card);
  const primaryPlacement = placements[0];
  return `
    <article class="hapa-card ${escapeAttribute(profile.kindClass)} ${card.id === state.selectedCardId ? 'selected' : ''}" data-card-id="${escapeAttribute(card.id)}" tabindex="0" role="button" aria-pressed="${card.id === state.selectedCardId ? 'true' : 'false'}">
      <div class="hapa-card-art" aria-hidden="true">
        ${cardGlyph(card)}
        <span></span>
      </div>
      <div class="hapa-card-body">
        <div class="card-title-row">
          <span class="type-pill">${escapeHtml(profile.typeLabel)}</span>
          <span class="status-pill">${escapeHtml(card.status)}</span>
        </div>
        <h3>${escapeHtml(card.name)}</h3>
        <p>${escapeHtml(profile.purpose)}</p>
        <div class="card-action-line">
          <span>${escapeHtml(placements.length ? `${placements.length} placements` : 'Ready to place')}</span>
          <span>${escapeHtml(primaryPlacement ? decisionModeLabel(primaryPlacement.decision_mode) : 'No route yet')}</span>
        </div>
        <div class="skill-row">
          ${(card.skills || []).slice(0, 3).map(skill => `<span>${escapeHtml(skill)}</span>`).join('')}
        </div>
        <div class="placement-strip">
          ${placements.slice(0, 3).map(place => renderPlacementChip(place)).join('') || '<span>Not placed</span>'}
        </div>
      </div>
    </article>
  `;
}

function renderProcessRoute(process, placements = []) {
  const routed = placements.filter(place => placementMatchesProcess(place, process));
  const requiredReviewCount = routed.filter(place => place.decision_mode === 'review_required').length;
  return `
    <article class="process-route">
      <div>
        <strong>${escapeHtml(process.name)}</strong>
        <p>${escapeHtml(process.process_key)} / ${escapeHtml(process.cadence || 'manual')} / ${escapeHtml(process.target_domain)}</p>
        <div class="process-policy">
          <span>${escapeHtml(requiredReviewCount ? `${requiredReviewCount} reviews` : 'context only')}</span>
          <span>${process.card_policy?.require_governor ? 'governor required' : 'governor optional'}</span>
        </div>
      </div>
      <div class="route-cards">
        ${routed.slice(0, 5).map(place => `
          <span class="${escapeAttribute(place.decision_mode === 'review_required' ? 'requires-review' : 'context-only')}">
            ${escapeHtml(place.card?.name || place.card_id)}
            <small>${escapeHtml(place.role)} / ${escapeHtml(decisionModeLabel(place.decision_mode))}</small>
          </span>
        `).join('') || '<span>No routed cards</span>'}
      </div>
    </article>
  `;
}

function renderCardInspector(card, data) {
  if (!card) {
    els.inspectorBody.innerHTML = '<p class="empty">No card selected.</p>';
    return;
  }
  const placements = data.placements.filter(place => place.card_id === card.id);
  const profile = cardProfile(card);
  const processes = data.processes.filter(process => placements.some(place => placementMatchesProcess(place, process)));
  const runs = recentRunsForCard(card.id, data.decision_runs);
  els.inspectorBody.innerHTML = `
    <div class="selected-card-mini ${escapeAttribute(profile.kindClass)}">
      <div class="hapa-card-art" aria-hidden="true">${cardGlyph(card)}</div>
      <div>
        <span class="type-pill">${escapeHtml(profile.typeLabel)}</span>
        <h3>${escapeHtml(card.name)}</h3>
        <p>${escapeHtml(profile.purpose)}</p>
      </div>
    </div>
    ${kv('Source', card.source_node)}
    ${kv('Owner', card.owner_identity_id)}
    ${kv('Card ref', card.card_ref)}
    ${kv('Placements', placements.length)}
    ${kv('Decision mode', placementModes(placements))}
    <div class="section">
      <h3>Voice</h3>
      <p class="context-copy">${escapeHtml(card.context?.voice || 'Context is attached when this card is routed into a process.')}</p>
    </div>
    <div class="section">
      <h3>Decision Bias</h3>
      <p class="context-copy">${escapeHtml(card.context?.decision_bias || 'No decision bias recorded.')}</p>
    </div>
    <div class="section">
      <h3>Checks</h3>
      <div class="check-list">
        ${(card.context?.checks || []).map(check => `<span>${escapeHtml(check)}</span>`).join('') || '<span>No checks recorded</span>'}
      </div>
    </div>
    <div class="section">
      <h3>Placements</h3>
      ${placements.map(place => `
        <article class="placement-card">
          <strong>${escapeHtml(roleLabel(place.role))} / ${escapeHtml(decisionModeLabel(place.decision_mode))}</strong>
          <p>${escapeHtml(place.target_type)}:${escapeHtml(place.target_id)} / ${escapeHtml(place.cadence || 'as-needed')}</p>
          <small>${escapeHtml(place.metadata?.surface || 'Placement')}</small>
        </article>
      `).join('') || '<p class="empty">No placements recorded.</p>'}
    </div>
    <div class="section">
      <h3>Processes</h3>
      ${processes.map(process => `<article class="placement-card"><strong>${escapeHtml(process.name)}</strong><p>${escapeHtml(process.metadata?.description || process.process_key)}</p></article>`).join('') || '<p class="empty">No process routes for this card.</p>'}
    </div>
    <div class="section">
      <h3>Recent Runs</h3>
      ${runs.slice(0, 4).map(run => `
        <article class="placement-card run-card">
          <strong>${escapeHtml(run.process_key)} / ${escapeHtml(run.status)}</strong>
          <p>${escapeHtml(run.subject_type)}:${escapeHtml(run.subject_id)} / ${escapeHtml(run.result?.decision || 'context_attached')}</p>
          <small>${escapeHtml(new Date(run.created_at).toLocaleString())}</small>
        </article>
      `).join('') || '<p class="empty">No decision runs include this card yet.</p>'}
    </div>
  `;
}

function cardMatchesCardSearch(card, data) {
  if (!state.query) return true;
  const placements = data.placements.filter(place => place.card_id === card.id);
  const processes = data.processes.filter(process => placements.some(place => placementMatchesProcess(place, process)));
  const haystack = [
    card.name,
    card.card_kind,
    card.source_node,
    card.card_ref,
    card.context?.voice,
    card.context?.decision_bias,
    ...(card.context?.checks || []),
    ...(card.skills || []),
    ...(card.tags || []),
    ...placements.flatMap(place => [place.role, place.decision_mode, place.target_type, place.target_id, place.cadence]),
    ...processes.flatMap(process => [process.name, process.process_key, process.target_domain])
  ].join(' ').toLowerCase();
  return haystack.includes(state.query);
}

function cardProfile(card) {
  if (card.card_kind === 'protocol') {
    return {
      typeLabel: 'Protocol Guardrail',
      kindClass: 'protocol-card',
      purpose: 'Applies provenance, audit, rollback, and source-truth checks before decisions commit.'
    };
  }
  if ((card.tags || []).includes('inventory')) {
    return {
      typeLabel: 'Inventory Avatar',
      kindClass: 'inventory-card',
      purpose: 'Reviews stock truth, replenishment risk, and in-stock actions before execution.'
    };
  }
  return {
    typeLabel: 'Forecast Avatar',
    kindClass: 'forecast-card',
    purpose: 'Reviews demand assumptions, forecast quality, and promotion deltas in planning cycles.'
  };
}

function cardGlyph(card) {
  const profile = cardProfile(card);
  if (profile.kindClass === 'protocol-card') {
    return '<svg viewBox="0 0 96 96"><path d="M18 50 36 24h24l18 26-30 30Z"/><path d="M30 50h36M48 24v56M36 24l12 26 12-26"/></svg>';
  }
  if (profile.kindClass === 'inventory-card') {
    return '<svg viewBox="0 0 96 96"><path d="M18 34 48 18l30 16v34L48 84 18 68Z"/><path d="M18 34l30 16 30-16M48 50v34"/><path d="M32 62h14M32 70h22"/></svg>';
  }
  return '<svg viewBox="0 0 96 96"><path d="M20 70c8-22 20-34 36-34 10 0 17 5 20 14"/><path d="M22 74h56M30 58l10 8 16-22 12 12 8-18"/><circle cx="36" cy="26" r="10"/></svg>';
}

function shortTarget(place) {
  return `${place.target_type.replace('catalog_domain', 'domain')}:${place.target_id.replace('all-decisions', 'all')}`;
}

function placementModes(placements = []) {
  return [...new Set(placements.map(place => decisionModeLabel(place.decision_mode)).filter(Boolean))].join(', ') || 'Context attached';
}

function decisionModeLabel(mode = '') {
  if (mode === 'review_required') return 'Review required';
  if (mode === 'context') return 'Context attached';
  return mode.replace(/_/g, ' ') || 'Context attached';
}

function roleLabel(role = '') {
  if (role === 'governor') return 'Governor';
  if (role === 'advisor') return 'Advisor';
  if (role === 'protocol') return 'Protocol';
  return role.replace(/_/g, ' ') || 'Placement';
}

function renderPlacementChip(place) {
  const modeClass = place.decision_mode === 'review_required' ? 'requires-review' : 'context-only';
  return `
    <span class="placement-chip ${escapeAttribute(modeClass)}">
      <strong>${escapeHtml(roleLabel(place.role))}</strong>
      <small>${escapeHtml(shortTarget(place))}</small>
    </span>
  `;
}

function recentRunsForCard(cardId, runs = []) {
  return runs
    .filter(run => (run.card_context?.routed_cards || run.result?.routed_cards || []).some(routed => routed.card_id === cardId))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function placementMatchesProcess(place, process) {
  if (place.target_type === 'process' && place.target_id === process.process_key) return true;
  if (place.target_type === 'catalog_domain' && place.target_id === process.target_domain) return true;
  if (place.target_type === 'governance' && place.target_id === 'all-decisions') return true;
  return false;
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
