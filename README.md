# coffee-buyer

My centralized app to browse coffee before buying. Gives me origin, purpose (general, espresso, filter) and allows me to keep track of which ones I bought. Is able to distinct which coffees are no longer available, even if the origin is the same, the producer may be different but the history of process is kept.

## First iteration

- **Web PWA** (React + Vite). Installable on iOS/Android via the browser; a native wrap (Capacitor) can come later.
- **Local-first**: your purchased list lives in `localStorage` on your device; the catalog is a JSON snapshot shipped with the app.
- **Scrapers** for [Olisipo](https://olisipo.coffee) and [7g Roaster](https://roaster.7groaster.pt), kept updated daily by a GitHub Actions workflow.

### Careful scraping

Both roasters run WooCommerce shops with public **Store API** endpoints, so no fragile HTML parsing is needed. The scraper:

- uses the official `User-Agent: coffee-buyer/1.0` and rate-limits requests (~1.5s between pages),
- reads only public product data (no cart/checkout/admin routes; robots.txt disallows are respected),
- detects sold-out coffees even when they vanish from the storefront API — 7g hides sold-out products from their API, so the scraper cross-checks the public product sitemap and marks anything missing as unavailable,
- keeps a per-coffee **availability history** (`history: [{date, status}]`) so the process/producer story of each coffee is preserved across seasons, even if the same origin returns next year as a new lot.

### Layout

```
scraper/
  roasters.js   shared HTTP + parsing helpers
  sources.js    per-roaster adapters (Store API + sitemap)
  catalog.js    merge logic preserving availability history
  update.js     entry point: scrape -> merge -> write data/catalog.json
  copy-catalog.js  copies the catalog into the app bundle
data/catalog.json   shared catalog snapshot (checked in)
app/                React PWA (Vite)
.github/workflows/  daily catalog refresh
```

### Use

```bash
# refresh the catalog manually
node scraper/update.js

# run the web app locally
cd app && npm install && npm run dev

# run tests
cd app && npm test
```
