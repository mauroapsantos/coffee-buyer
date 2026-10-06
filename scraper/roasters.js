const USER_AGENT = 'coffee-buyer/0.1 (+https://github.com/mauroapsantos/coffee-buyer)';
const REQUEST_DELAY_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`GET ${url} -> ${response.status}`);
  return response.text();
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

async function fetchAllProducts(baseUrl) {
  const products = [];
  let page = 1;
  for (;;) {
    const url = `${baseUrl}/wp-json/wc/store/products?per_page=100&page=${page}`;
    const batch = await fetchJson(url);
    products.push(...batch);
    if (batch.length < 100) break;
    page += 1;
    await sleep(REQUEST_DELAY_MS);
  }
  return products;
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h\d|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&#8220;|&ldquo;/g, '"')
    .replace(/&#8221;|&rdquo;/g, '"')
    .replace(/&#038;|&amp;/g, '&')
    .replace(/&#8230;/g, '…')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

function parseLabeledFields(text) {
  const fields = {};
  if (!text) return fields;
  const pattern = /([A-Za-zÀ-ÿ]+)\s*:\s*([^\n]+)/g;
  let match;
  while ((match = pattern.exec(text))) {
    const key = match[1].toLowerCase().trim();
    const value = match[2].trim();
    if (value) fields[key] = value;
  }
  return fields;
}

function splitList(value) {
  if (!value) return [];
  return value
    .split(/,| and | e | – |·/i)
    .map((item) => item.trim())
    .filter(Boolean);
}

function priceFromCents(amount, currency) {
  if (!amount) return null;
  return { amount: Number(amount) / 100, currency };
}

async function fetchSitemap(url) {
  const xml = await fetchText(url);
  const urls = [];
  const pattern = /<loc>(.*?)<\/loc>/g;
  let match;
  while ((match = pattern.exec(xml))) urls.push(match[1].trim());
  return urls;
}

module.exports = {
  USER_AGENT,
  sleep,
  fetchText,
  fetchJson,
  fetchAllProducts,
  fetchSitemap,
  stripHtml,
  parseLabeledFields,
  splitList,
  priceFromCents,
};
