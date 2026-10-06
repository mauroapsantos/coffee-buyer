const fs = require('fs/promises');

function coffeeId(coffee) {
  return `${coffee.roaster}:${coffee.roasterSlug}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function mergeCatalog(previous, scraped, scrapeDate = today()) {
  const previousById = new Map(previous.coffees.map((coffee) => [coffee.id, coffee]));
  const scrapedIds = new Set(scraped.map((coffee) => coffeeId(coffee)));

  const coffees = [];

  for (const item of scraped) {
    const id = coffeeId(item);
    const existing = previousById.get(id);
    const history = existing ? [...existing.history] : [];
    const lastStatus = history[history.length - 1];
    const status = item.available ? 'available' : 'unavailable';
    if (!lastStatus || lastStatus.status !== status) {
      history.push({ date: scrapeDate, status });
    }
    coffees.push({
      ...item,
      id,
      firstSeen: existing ? existing.firstSeen : scrapeDate,
      lastSeen: scrapeDate,
      history,
    });
  }

  for (const coffee of previous.coffees) {
    if (scrapedIds.has(coffee.id)) continue;
    const stillListed = coffee.lastListedOn
      ? coffee.lastListedOn === scrapeDate
      : false;
    const history = [...coffee.history];
    const lastStatus = history[history.length - 1];
    if (!lastStatus || lastStatus.status !== 'unavailable') {
      history.push({ date: scrapeDate, status: 'unavailable' });
    }
    coffees.push({
      ...coffee,
      lastSeen: coffee.lastSeen,
      lastListedOn: stillListed ? coffee.lastListedOn : coffee.lastListedOn,
      history,
    });
  }

  coffees.sort((a, b) => a.id.localeCompare(b.id));

  return {
    updatedAt: scrapeDate,
    roasters: ['olisipo', '7g', 'senzu'],
    coffees,
  };
}

async function loadCatalog(path) {
  try {
    return JSON.parse(await fs.readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { coffees: [] };
    }
    throw error;
  }
}

async function saveCatalog(catalog, path) {
  await fs.writeFile(path, JSON.stringify(catalog, null, 2) + '\n');
}

module.exports = { mergeCatalog, loadCatalog, saveCatalog, coffeeId };
