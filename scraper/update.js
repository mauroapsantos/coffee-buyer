#!/usr/bin/env node
const path = require('path');
const { scrapeAll } = require('./sources');
const { mergeCatalog, loadCatalog, saveCatalog } = require('./catalog');

const CATALOG_PATH = path.join(__dirname, '..', 'data', 'catalog.json');

async function main() {
  console.log('Scraping roasters...');
  const scraped = await scrapeAll();
  console.log(`Scraped ${scraped.length} coffees.`);
  const previous = await loadCatalog(CATALOG_PATH);
  const catalog = mergeCatalog(previous, scraped);
  await saveCatalog(catalog, CATALOG_PATH);
  const available = catalog.coffees.filter((coffee) => coffee.available).length;
  console.log(
    `Catalog updated: ${catalog.coffees.length} coffees (${available} available). Wrote ${CATALOG_PATH}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
