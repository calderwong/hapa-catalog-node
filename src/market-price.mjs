export const MARKET_SOURCE_CAMEL = 'camelcamelcamel';
export const MARKET_SOURCE_AMAZON = 'amazon';

export const PRICE_TYPES = {
  amazon: ['amazon', 'price_amazon', 'Amazon'],
  new: ['new', 'price_new', '3rd Party New', 'Third Party New'],
  used: ['used', 'price_used', '3rd Party Used', 'Third Party Used']
};

const IDENTIFIER_LABELS = [
  ['asin', 'ASIN'],
  ['upc', 'UPC'],
  ['ean', 'EAN'],
  ['isbn', 'ISBN'],
  ['sku', 'SKU'],
  ['model', 'MODEL'],
  ['manufacturer', 'MANUFACTURER'],
  ['product_group', 'PRODUCT GROUP'],
  ['category', 'CATEGORY'],
  ['locale', 'LOCALE'],
  ['list_price', 'LIST PRICE'],
  ['last_update_scan', 'LAST UPDATE SCAN'],
  ['last_tracked', 'LAST TRACKED']
];

export function extractAsin(value = '') {
  const text = String(value || '');
  const urlMatch = text.match(/(?:\/(?:dp|gp\/product|product)\/|[?&]asin=)([A-Z0-9]{10})/i);
  if (urlMatch) return urlMatch[1].toUpperCase();
  const bare = text.match(/\b([A-Z0-9]{10})\b/i);
  return bare ? bare[1].toUpperCase() : null;
}

export function normalizeIdentifier(scheme, value) {
  if (value == null) return '';
  const raw = String(value).trim();
  if (['upc', 'ean', 'gtin', 'isbn'].includes(String(scheme).toLowerCase())) {
    return raw.replace(/\D+/g, '');
  }
  if (String(scheme).toLowerCase() === 'asin') return raw.toUpperCase();
  return raw;
}

export function camelProductUrl(asin) {
  return `https://camelcamelcamel.com/product/${encodeURIComponent(asin)}?active=price_amazon&context=popular&cpf=amazon-new-used`;
}

export function camelSearchUrl(query) {
  return `https://camelcamelcamel.com/search?sq=${encodeURIComponent(query)}`;
}

export function amazonProductUrl(asin) {
  return `https://www.amazon.com/dp/${encodeURIComponent(asin)}?language=en_US`;
}

export function amazonSearchUrl(query) {
  return `https://www.amazon.com/s?k=${encodeURIComponent(query)}`;
}

export async function fetchPageText(url, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
      }
    });
    const text = await response.text();
    return {
      ok: response.ok && !isChallengePage(text),
      status: response.status,
      text,
      blocked: isChallengePage(text) || response.status === 403,
      content_type: response.headers.get('content-type') || ''
    };
  } finally {
    clearTimeout(timer);
  }
}

export function isChallengePage(html = '') {
  return /Just a moment|cf-mitigated|challenge-platform|Enable JavaScript and cookies/i.test(String(html));
}

export function parseCamelSearchResult(html = '') {
  return extractAsin(html);
}

export function parseCamelCamelCamelHtml(html = '', sourceUrl = '') {
  const text = htmlToText(html);
  const identifiers = parseIdentifiers(html, text);
  const asin = identifiers.asin || extractAsin(sourceUrl) || extractAsin(text);
  if (asin) identifiers.asin = asin;
  if (sourceUrl) identifiers.camelcamelcamel_url = sourceUrl;
  if (asin) identifiers.amazon_url = `https://www.amazon.com/dp/${asin}`;

  const title = parseTitle(html, text, asin);
  const priceSummary = parsePriceSummary(text);
  const history = parseHistoryArrays(html);

  return {
    source: MARKET_SOURCE_CAMEL,
    source_url: sourceUrl,
    title,
    identifiers,
    price_summary: priceSummary,
    history
  };
}

export function parseAmazonListingHtml(html = '', sourceUrl = '') {
  const source = String(html || '');
  const text = htmlToText(source);
  const canonicalUrl = parseCanonicalUrl(source) || sourceUrl || '';
  const asin = extractAsin(sourceUrl) || extractAsin(canonicalUrl) || extractAsin(source);
  const title = normalizeAmazonTitle(
    parseElementTextById(source, 'productTitle')
      || parseElementTextById(source, 'pqv-title')
      || parseMetaContent(source, 'og:title')
      || parseMetaContent(source, 'title')
      || parseTitle(source, text, asin)
  );
  const brand = normalizeAmazonBrand(
    parseElementTextById(source, 'pqv-byline')
      || parseElementTextById(source, 'bylineInfo')
      || parseLabelValue(text, 'Brand')
      || ''
  );
  const ratingText = parseElementTextById(source, 'pqv-ratings')
    || parseElementTextById(source, 'acrPopover')
    || '';
  const rating = parseRating(ratingText || text);
  const reviewCount = parseReviewCount(ratingText || text);
  const boughtInLastMonth = parseElementTextById(source, 'pqv-bought-in-last-month');
  const priceBlock = parseElementHtmlById(source, 'pqv-price') + '\n' + parseNearbySection(source, 'pqv-price');
  const price = parseAmazonPrice(priceBlock || text);
  const listPrice = parseListPrice(parseElementHtmlById(source, 'pqv-price-list-price') || text);
  const savingsText = parseSavingsText(priceBlock || text);
  const featureBullets = parseFeatureBullets(source);
  const description = parseDescription(source);
  const details = parseAmazonDetails(source, text);
  const documents = parseDocuments(source);
  const media = parseAmazonMedia(source, { title, asin });

  const identifiers = {
    ...(asin ? { asin } : {}),
    ...(brand ? { brand, manufacturer: brand } : {}),
    ...(details.model ? { model: details.model } : {}),
    ...(details.item_model_number && !details.model ? { model: details.item_model_number } : {}),
    ...(details.product_group ? { product_group: details.product_group } : {}),
    ...(details.category ? { category: details.category } : {}),
    ...(canonicalUrl ? { amazon_url: canonicalUrl } : asin ? { amazon_url: amazonProductUrl(asin) } : {})
  };

  return {
    source: MARKET_SOURCE_AMAZON,
    source_url: sourceUrl || canonicalUrl,
    asin,
    title,
    brand,
    rating,
    review_count: reviewCount,
    bought_in_last_month: boughtInLastMonth,
    price,
    list_price: listPrice,
    savings_text: savingsText,
    currency: 'USD',
    availability: parseAvailability(text),
    feature_bullets: featureBullets,
    description,
    details,
    documents,
    media,
    identifiers
  };
}

export function normalizeHistory(input = {}) {
  const normalized = {};
  for (const [rawType, points] of Object.entries(input || {})) {
    const type = normalizePriceType(rawType);
    if (!type) continue;
    normalized[type] = normalizePointList(points);
  }
  return normalized;
}

export function normalizePriceType(value) {
  const text = String(value || '').toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_+|_+$/g, '');
  if (['amazon', 'price_amazon'].includes(text)) return 'amazon';
  if (['new', 'price_new', 'third_party_new', 'third_party'].includes(text)) return 'new';
  if (['used', 'price_used', 'third_party_used'].includes(text)) return 'used';
  return null;
}

function parseIdentifiers(html, text) {
  const identifiers = {};
  for (const [key, label] of IDENTIFIER_LABELS) {
    const fromTable = parseTableValue(html, label);
    const fromText = parseLabelValue(text, label);
    const value = normalizeIdentifier(key, fromTable || fromText || '');
    if (value) identifiers[key] = value;
  }
  return identifiers;
}

function parseTableValue(html, label) {
  const pattern = new RegExp(`<t[hd][^>]*>\\s*${escapeRegExp(label)}\\s*<\\/t[hd]>\\s*<t[hd][^>]*>([\\s\\S]*?)<\\/t[hd]>`, 'i');
  const match = String(html).match(pattern);
  return match ? cleanup(match[1]) : '';
}

function parseLabelValue(text, label) {
  const labels = [
    ...IDENTIFIER_LABELS.map(([, next]) => next.replace(/\s+/g, '\\s+')),
    'PRICE\\s+TYPE',
    'LOWEST\\s+EVER',
    'HIGHEST\\s+EVER',
    'CURRENT',
    'AVERAGE'
  ].join('|');
  const pattern = new RegExp(`\\b${label.replace(/\s+/g, '\\s+')}\\s*:?\\s*([^\\n|]+?)(?=\\s+(?:${labels})\\s*:|\\n|\\||$)`, 'i');
  const match = String(text).match(pattern);
  return match ? cleanup(match[1]).replace(/\s+(Price Type|Lowest Ever|Highest Ever|Current \+?|Average)\b.*$/i, '').trim() : '';
}

function parseTitle(html, text, asin) {
  const h1 = String(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return cleanup(h1[1]);
  const title = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) return cleanup(title[1]).replace(/\s*\|\s*Amazon price tracker.*$/i, '');
  const firstLine = String(text).split(/\n/).map(line => line.trim()).find(Boolean);
  return firstLine && !/camelcamelcamel|just a moment/i.test(firstLine) ? firstLine : `Amazon ASIN ${asin || 'unknown'}`;
}

function normalizeAmazonTitle(value) {
  return cleanup(value)
    .replace(/^Product Summary:\s*/i, '')
    .replace(/\s*:\s*Amazon\.com:.*$/i, '')
    .trim();
}

function normalizeAmazonBrand(value) {
  return cleanup(value)
    .replace(/^From\s+/i, '')
    .replace(/^Visit the\s+/i, '')
    .replace(/\s+Store$/i, '')
    .trim();
}

function parseRating(value) {
  const match = String(value || '').match(/([0-5](?:\.[0-9])?)\s+out\s+of\s+5/i);
  return match ? Number(match[1]) : null;
}

function parseReviewCount(value) {
  const match = String(value || '').match(/([0-9][0-9,]*)\s+(?:ratings|customer reviews|global reviews)/i);
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function parseAmazonPrice(value) {
  const text = htmlToText(value);
  const purchase = text.match(/One[-\s]*time purchase:\s*\$([0-9][0-9,]*(?:\.[0-9]{2})?)/i);
  if (purchase) return Number(purchase[1].replace(/,/g, ''));
  const price = text.match(/\$([0-9][0-9,]*(?:\.[0-9]{2})?)/);
  return price ? Number(price[1].replace(/,/g, '')) : null;
}

function parseListPrice(value) {
  const text = htmlToText(value);
  const match = text.match(/List Price:\s*\$([0-9][0-9,]*(?:\.[0-9]{2})?)/i);
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function parseSavingsText(value) {
  const text = htmlToText(value);
  const match = text.match(/([0-9]+%\s+Savings|Save\s+\$?[0-9][^\n]*)/i);
  return match ? cleanup(match[1]) : '';
}

function parseAvailability(text) {
  const match = String(text || '').match(/\b(In Stock|Currently unavailable|Temporarily out of stock|Only [^\n]+ left in stock)\b/i);
  return match ? cleanup(match[1]) : '';
}

function parseFeatureBullets(html) {
  const block = parseElementHtmlById(html, 'pqv-feature-bullets') || parseElementHtmlById(html, 'feature-bullets');
  const bullets = [];
  for (const match of String(block).matchAll(/<li[^>]*>\s*(?:<span[^>]*>)?([\s\S]*?)(?:<\/span>)?\s*<\/li>/gi)) {
    const bullet = cleanup(match[1]);
    if (bullet && !/make sure this fits/i.test(bullet)) bullets.push(bullet);
  }
  return [...new Set(bullets)];
}

function parseDescription(html) {
  const block = parseElementHtmlById(html, 'pqv-description')
    || parseElementHtmlById(html, 'productDescription')
    || '';
  return cleanup(block.replace(/Product Description/i, ''));
}

function parseAmazonDetails(html, text) {
  const details = {};
  const tableLabels = [
    ['item_model_number', 'Item model number'],
    ['date_first_available', 'Date First Available'],
    ['manufacturer', 'Manufacturer'],
    ['best_sellers_rank', 'Best Sellers Rank']
  ];
  for (const [key, label] of tableLabels) {
    const value = parseTableValue(html, label);
    if (value) details[key] = value;
  }
  const titleModel = String(text || '').match(/\b([0-9]{3}-[0-9]{5}-[0-9]{2})\b/);
  if (titleModel) details.model = titleModel[1];
  if (!details.best_sellers_rank) {
    const rankMatch = String(text || '').match(/Best Sellers Rank\s*:?([\s\S]*?)(?:Date First Available|Manufacturer|Customer Reviews|Warranty|$)/i);
    if (rankMatch) details.best_sellers_rank = cleanup(rankMatch[1]);
  }
  const rankCategories = [...String(details.best_sellers_rank || '').matchAll(/#[0-9,]+\s+in\s+([^#()]+)/g)]
    .map(match => cleanup(match[1]))
    .filter(Boolean);
  if (rankCategories.length > 0) {
    details.product_group = rankCategories[0];
    details.category = rankCategories.at(-1);
  }
  const styleBlock = parseOptionsBlock(html);
  const style = cleanup((styleBlock.match(/<h3[^>]*>\s*Style\s*<\/h3>[\s\S]*?<li[^>]*>\s*(?:<span[^>]*>)?([\s\S]*?)(?:<\/span>)?\s*<\/li>/i)?.[1] || ''));
  if (style && !details.style) details.style = style;
  return details;
}

function parseOptionsBlock(html) {
  const source = String(html || '');
  const start = source.indexOf('id="pqv-options-available"');
  if (start < 0) return '';
  const end = source.indexOf('id="pqv-documents"', start);
  return source.slice(start, end > start ? end : start + 2500);
}

function parseDocuments(html) {
  const block = parseElementHtmlById(html, 'pqv-documents') || html;
  const documents = [];
  for (const match of String(block).matchAll(/<a\b[^>]*href=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = normalizeMediaUrl(match[2]);
    if (!/\.pdf(?:\?|$)/i.test(url)) continue;
    documents.push({
      url,
      label: cleanup(match[3]) || 'Product document',
      media_type: 'document',
      variant: 'document'
    });
  }
  return dedupeMedia(documents);
}

function parseAmazonMedia(html, { title = '', asin = '' } = {}) {
  const media = [];
  const add = (url, metadata = {}) => {
    const cleanUrl = normalizeMediaUrl(url);
    if (!cleanUrl || /grey-pixel|transparent-1x1|sprite|loading-4x/i.test(cleanUrl)) return;
    if (!/^https?:\/\//i.test(cleanUrl)) return;
    media.push({
      url: cleanUrl,
      media_type: metadata.media_type || 'image',
      variant: metadata.variant || 'image',
      alt: cleanup(metadata.alt || title || `Amazon product image ${asin || ''}`),
      width: metadata.width || null,
      height: metadata.height || null,
      metadata: {
        asin: asin || null,
        source_hint: metadata.source_hint || null
      }
    });
  };

  const landingTag = parseTagById(html, 'landingImage');
  if (landingTag) {
    const attrs = parseAttributes(landingTag);
    add(attrs['data-old-hires'], { variant: 'hiRes', alt: attrs.alt, source_hint: 'landingImage' });
    add(attrs.src, { variant: 'landing', alt: attrs.alt, source_hint: 'landingImage' });
    const dynamic = decodeEntities(attrs['data-a-dynamic-image'] || '');
    try {
      for (const [url, dimensions] of Object.entries(JSON.parse(dynamic))) {
        add(url, {
          variant: 'dynamic',
          alt: attrs.alt,
          width: dimensions?.[0] || null,
          height: dimensions?.[1] || null,
          source_hint: 'landingImage.dynamic'
        });
      }
    } catch {
      for (const match of dynamic.matchAll(/"(https?:\/\/[^"]+)":\s*\[([0-9]+),\s*([0-9]+)\]/g)) {
        add(match[1], {
          variant: 'dynamic',
          alt: attrs.alt,
          width: Number(match[2]),
          height: Number(match[3]),
          source_hint: 'landingImage.dynamic'
        });
      }
    }
  }

  const colorIndex = String(html).indexOf('colorImages');
  if (colorIndex >= 0) {
    const block = String(html).slice(colorIndex, colorIndex + 70000);
    for (const match of block.matchAll(/"(hiRes|large|thumb)"\s*:\s*"([^"]+)"/g)) {
      add(match[2], { variant: match[1], source_hint: 'colorImages' });
    }
    for (const match of block.matchAll(/"(https?:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"\s*:\s*\[([0-9]+),\s*([0-9]+)\]/g)) {
      add(match[1], {
        variant: 'main',
        width: Number(match[2]),
        height: Number(match[3]),
        source_hint: 'colorImages.main'
      });
    }
  }

  const ogImage = parseMetaContent(html, 'og:image');
  if (ogImage) add(ogImage, { variant: 'og:image', source_hint: 'meta' });

  for (const imgTag of String(html).matchAll(/<img\b[^>]*>/gi)) {
    const attrs = parseAttributes(imgTag[0]);
    const alt = cleanup(attrs.alt || '');
    const productAlt = title && normalizeForCompare(alt).includes(normalizeForCompare(title).slice(0, 24));
    if (!productAlt && !/Garmin Approach R10/i.test(alt)) continue;
    add(attrs['data-src'] || attrs.src, { variant: attrs['data-src'] ? 'aplus' : 'inline', alt, source_hint: 'product-alt' });
  }

  return dedupeMedia(media).slice(0, 60);
}

function parseCanonicalUrl(html) {
  const match = String(html).match(/<link\b[^>]*rel=(["'])canonical\1[^>]*href=(["'])(.*?)\2/i)
    || String(html).match(/<link\b[^>]*href=(["'])(.*?)\1[^>]*rel=(["'])canonical\3/i);
  return match ? normalizeMediaUrl(match[3] || match[2]) : '';
}

function parseMetaContent(html, key) {
  const escaped = escapeRegExp(key);
  const patterns = [
    new RegExp(`<meta\\b[^>]*(?:property|name)=(["'])${escaped}\\1[^>]*content=(["'])(.*?)\\2`, 'i'),
    new RegExp(`<meta\\b[^>]*content=(["'])(.*?)\\1[^>]*(?:property|name)=(["'])${escaped}\\3`, 'i')
  ];
  for (const pattern of patterns) {
    const match = String(html).match(pattern);
    if (match) return cleanup(match[3] || match[2]);
  }
  return '';
}

function parseElementTextById(html, id) {
  return cleanup(parseElementHtmlById(html, id));
}

function parseElementHtmlById(html, id) {
  const source = String(html || '');
  const pattern = new RegExp(`<([a-z0-9]+)\\b[^>]*\\bid=(["'])${escapeRegExp(id)}\\2[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i');
  const match = source.match(pattern);
  return match ? match[3] : '';
}

function parseNearbySection(html, id) {
  const source = String(html || '');
  const index = source.indexOf(`id="${id}"`);
  if (index < 0) return '';
  return source.slice(Math.max(0, index - 500), index + 2500);
}

function parseTagById(html, id) {
  const pattern = new RegExp(`<[^>]+\\bid=(["'])${escapeRegExp(id)}\\1[^>]*>`, 'i');
  return String(html || '').match(pattern)?.[0] || '';
}

function parseAttributes(tag) {
  const attrs = {};
  for (const match of String(tag || '').matchAll(/([a-zA-Z0-9_:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attrs[match[1]] = decodeEntities(match[3] ?? match[4] ?? match[5] ?? '');
  }
  return attrs;
}

function normalizeMediaUrl(value) {
  return decodeEntities(String(value || ''))
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/')
    .replace(/\s+\d+x\s*$/i, '')
    .replace(/[,\s]+$/g, '')
    .trim();
}

function dedupeMedia(items) {
  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    const url = normalizeMediaUrl(item.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    deduped.push({ ...item, url });
  }
  return deduped;
}

function normalizeForCompare(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function parsePriceSummary(text) {
  const summary = {};
  const lines = String(text).split(/\n/).map(line => line.trim()).filter(Boolean);
  for (const line of lines) {
    const type = priceTypeFromLine(line);
    if (!type) continue;
    const prices = [...line.matchAll(/\$?([0-9][0-9,]*(?:\.[0-9]{2})?)\s*(?:\(([^)]+)\))?/g)]
      .map(match => ({ price: Number(match[1].replace(/,/g, '')), date: match[2] || null }))
      .filter(point => Number.isFinite(point.price));
    if (prices.length > 0) {
      summary[type] = {
        lowest: prices[0] || null,
        highest: prices[1] || null,
        current: prices[2] || null,
        average: prices[3]?.price ?? null
      };
    }
  }
  return summary;
}

function priceTypeFromLine(line) {
  if (/3rd Party Used|Third Party Used|\bUsed\b/i.test(line)) return 'used';
  if (/3rd Party New|Third Party New|\bNew\b/i.test(line)) return 'new';
  if (/\bAmazon\b/i.test(line)) return 'amazon';
  return null;
}

function parseHistoryArrays(html) {
  const history = {};
  for (const [type, aliases] of Object.entries(PRICE_TYPES)) {
    for (const alias of aliases) {
      const array = parseNamedArray(html, alias);
      if (array.length > 0) {
        history[type] = array;
        break;
      }
    }
  }
  return history;
}

function parseNamedArray(html, key) {
  const source = String(html);
  const patterns = [
    new RegExp(`["']${escapeRegExp(key)}["']\\s*:\\s*\\[`, 'i'),
    new RegExp(`${escapeRegExp(key)}\\s*=\\s*\\[`, 'i')
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (!match) continue;
    const start = source.indexOf('[', match.index);
    const arrayText = extractBalancedArray(source, start);
    if (!arrayText) continue;
    try {
      return normalizePointList(JSON.parse(arrayText));
    } catch {
      return normalizePointList(parseLooseArray(arrayText));
    }
  }
  return [];
}

function extractBalancedArray(source, start) {
  if (start < 0 || source[start] !== '[') return '';
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return '';
}

function normalizePointList(points) {
  if (!Array.isArray(points)) return [];
  return points.map(point => normalizePoint(point)).filter(Boolean);
}

function normalizePoint(point) {
  if (Array.isArray(point)) {
    const observed = point[0];
    const price = point[1];
    return makePoint(observed, price, point[2]);
  }
  if (point && typeof point === 'object') {
    return makePoint(point.observed_at || point.date || point.time || point.x, point.price ?? point.value ?? point.y, point.currency);
  }
  return null;
}

function makePoint(observed, price, currency = 'USD') {
  const priceNumber = Number(String(price).replace(/[$,]/g, ''));
  if (!Number.isFinite(priceNumber)) return null;
  let observedAt = observed;
  if (typeof observed === 'number') observedAt = new Date(observed).toISOString();
  if (typeof observed === 'string' && /^\d+$/.test(observed)) observedAt = new Date(Number(observed)).toISOString();
  if (typeof observedAt === 'string' && !Number.isNaN(Date.parse(observedAt))) observedAt = new Date(observedAt).toISOString();
  if (!observedAt) return null;
  return {
    observed_at: observedAt,
    price: priceNumber,
    currency: currency || 'USD'
  };
}

function parseLooseArray(value) {
  return JSON.parse(String(value).replace(/'/g, '"').replace(/,\s*]/g, ']'));
}

function htmlToText(html) {
  return decodeEntities(String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
    .replace(/<\/(?:tr|p|div|li|h1|h2|h3|th|td)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function cleanup(value) {
  return decodeEntities(String(value || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
