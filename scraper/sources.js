const {
  sleep,
  fetchJson,
  fetchAllProducts,
  fetchSitemap,
  stripHtml,
  parseLabeledFields,
  splitList,
  priceFromCents,
} = require('./roasters');

const OLISIPO_BASE = 'https://olisipo.coffee';
const SEVEN_G_BASE = 'https://roaster.7groaster.pt';
const SENZU_SHOP_BASE = 'https://shop.senzucoffee.com';

function purposeFromRoast(roast) {
  const value = (roast || '').toLowerCase();
  const hasEspresso = value.includes('espresso');
  const hasFilter = value.includes('filter');
  if (hasEspresso && hasFilter) return 'both';
  if (hasEspresso) return 'espresso';
  if (hasFilter) return 'filter';
  return null;
}

function purposeFromTags(tagNames) {
  for (const tag of tagNames) {
    const purpose = purposeFromRoast(tag);
    if (purpose) return purpose;
  }
  return null;
}

async function scrapeOlisipo() {
  const products = await fetchAllProducts(OLISIPO_BASE);
  const coffees = [];
  for (const product of products) {
    const categories = (product.categories || []).map((category) => category.slug);
    if (!categories.includes('coffee')) continue;
    const fields = parseLabeledFields(stripHtml(product.short_description));
    const tags = (product.tags || []).map((tag) => tag.name);
    const purpose =
      purposeFromRoast(fields.roast) || purposeFromTags(tags) || 'general';
    coffees.push({
      roaster: 'olisipo',
      roasterSlug: product.slug,
      name: stripHtml(product.name),
      url: product.permalink,
      available: Boolean(product.is_in_stock),
      purpose,
      origin: {
        producer: fields.producer || null,
        cultivar: splitList(fields.cultivar),
        process: fields.process || null,
        altitude: fields.altitude || null,
        harvest: fields.harvest || null,
      },
      notes: splitList(fields.notes),
      price: priceFromCents(
        product.prices && product.prices.price_range
          ? product.prices.price_range.min_amount
          : product.prices && product.prices.price,
        'EUR'
      ),
      imageUrl: product.images && product.images[0] ? product.images[0].src : null,
      description: stripHtml(product.description),
    });
  }
  return coffees;
}

async function scrapeSevenG() {
  const products = await fetchAllProducts(SEVEN_G_BASE);
  const sitemapUrls = await fetchSitemap(`${SEVEN_G_BASE}/product-sitemap.xml`);
  const coffeeUrls = new Set(
    sitemapUrls.filter((url) => url.includes('/loja/cafes/'))
  );

  const seen = new Set();
  const coffees = [];
  for (const product of products) {
    const categories = (product.categories || []).map((category) => category.slug);
    if (!categories.includes('cafes')) continue;
    seen.add(product.slug);
    const attributes = {};
    for (const attribute of product.attributes || []) {
      attributes[attribute.name.toLowerCase()] = (attribute.terms || []).map(
        (term) => term.name
      );
    }
    const purpose = categories.includes('espresso')
      ? categories.includes('filtro-cafe')
        ? 'both'
        : 'espresso'
      : categories.includes('filtro-cafe')
        ? 'filter'
        : 'general';
    coffees.push({
      roaster: '7g',
      roasterSlug: product.slug,
      name: stripHtml(product.name),
      url: product.permalink,
      available: true,
      purpose,
      origin: {
        producer: null,
        cultivar: [],
        process: null,
        altitude: null,
        harvest: null,
      },
      notes: [],
      price: priceFromCents(
        product.prices && product.prices.price_range
          ? product.prices.price_range.min_amount
          : product.prices && product.prices.price,
        'EUR'
      ),
      imageUrl: product.images && product.images[0] ? product.images[0].src : null,
      description: stripHtml(product.description),
      weightOptions: attributes['peso'] || [],
      grindOptions: attributes['moagem'] || [],
    });
  }

  for (const url of coffeeUrls) {
    const slug = url.replace(/\/$/, '').split('/').pop();
    if (seen.has(slug)) continue;
    coffees.push({
      roaster: '7g',
      roasterSlug: slug,
      name: slug
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' '),
      url,
      available: false,
      purpose: 'general',
      origin: { producer: null, cultivar: [], process: null, altitude: null, harvest: null },
      notes: [],
      price: null,
      imageUrl: null,
      description: '',
      weightOptions: [],
      grindOptions: [],
    });
  }

  return coffees;
}

async function fetchSenzuProducts(url) {
  const products = [];
  let page = 1;
  for (;;) {
    const separator = url.includes('?') ? '&' : '?';
    const batch = await fetchJson(`${url}${separator}page=${page}&limit=250`);
    products.push(...batch.products);
    if (batch.products.length < 250) break;
    page += 1;
    await sleep(1500);
  }
  return products;
}

async function scrapeSenzu() {
  const products = await fetchSenzuProducts(`${SENZU_SHOP_BASE}/products.json`);
  const excluded = await fetchSenzuProducts(
    `${SENZU_SHOP_BASE}/collections/equipamento/products.json`
  );
  const espresso = new Set(
    (
      await fetchSenzuProducts(
        `${SENZU_SHOP_BASE}/collections/espresso-selection/products.json`
      )
    ).map((product) => product.handle)
  );
  const seasonal = new Set(
    (
      await fetchSenzuProducts(
        `${SENZU_SHOP_BASE}/collections/sazonal/products.json`
      )
    ).map((product) => product.handle)
  );

  const excludedHandles = new Set([
    ...excluded.map((product) => product.handle),
    ...products
      .filter((product) => product.handle.startsWith('subscricao-'))
      .map((product) => product.handle),
  ]);

  const coffees = [];
  for (const product of products) {
    if (excludedHandles.has(product.handle)) continue;
    const fields = parseLabeledFields(stripHtml(product.body_html));
    const variants = product.variants || [];
    const availableVariants = variants.filter((variant) => variant.available);
    const prices = variants
      .map((variant) => Number(variant.price))
      .filter((price) => Number.isFinite(price));
    const hasEspresso = espresso.has(product.handle);
    const hasSeasonal = seasonal.has(product.handle);
    coffees.push({
      roaster: 'senzu',
      roasterSlug: product.handle,
      name: stripHtml(product.title),
      url: `${SENZU_SHOP_BASE}/products/${product.handle}`,
      available: availableVariants.length > 0,
      purpose:
        hasEspresso && hasSeasonal
          ? 'both'
          : hasEspresso
            ? 'espresso'
            : hasSeasonal
              ? 'filter'
              : 'general',
      origin: {
        producer: fields.produtor || null,
        cultivar: splitList(fields.variedade),
        process: fields.processo || null,
        altitude: fields.altitude || null,
        harvest: fields.colheita || null,
      },
      notes: splitList(fields.notas),
      price: prices.length
        ? { amount: Math.min(...prices), currency: 'EUR' }
        : null,
      imageUrl: product.images && product.images[0] ? product.images[0].src : null,
      description: stripHtml(product.body_html),
      weightOptions: [
        ...new Set(variants.map((variant) => variant.title).filter(Boolean)),
      ],
    });
  }
  return coffees;
}

async function scrapeAll() {
  const olisipo = await scrapeOlisipo();
  await sleep(2000);
  const sevenG = await scrapeSevenG();
  await sleep(2000);
  const senzu = await scrapeSenzu();
  return [...olisipo, ...sevenG, ...senzu];
}

module.exports = { scrapeOlisipo, scrapeSevenG, scrapeSenzu, scrapeAll };
