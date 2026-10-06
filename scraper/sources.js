const {
  sleep,
  fetchAllProducts,
  fetchSitemap,
  stripHtml,
  parseLabeledFields,
  splitList,
  priceFromCents,
} = require('./roasters');

const OLISIPO_BASE = 'https://olisipo.coffee';
const SEVEN_G_BASE = 'https://roaster.7groaster.pt';

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

async function scrapeAll() {
  const olisipo = await scrapeOlisipo();
  await sleep(2000);
  const sevenG = await scrapeSevenG();
  return [...olisipo, ...sevenG];
}

module.exports = { scrapeOlisipo, scrapeSevenG, scrapeAll };
