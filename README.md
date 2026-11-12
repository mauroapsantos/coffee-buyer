# coffee-buyer

My centralized app to browse coffee before buying. Gives me origin, purpose (general, espresso, filter) and lets me keep track of which ones I bought. It can tell which coffees are no longer available: even if the origin is the same, the producer may be different, and the history of each lot is kept.

Every coffee in the list links straight to the roaster's shop page.

- **Roasters:** [Olisipo](https://olisipo.coffee), [7g Roaster](https://roaster.7groaster.pt) and [Senzu](https://shop.senzucoffee.com).
- **Runs on the Raspberry Pi** with Docker, the same way as ptgamedeals: Postgres, a Next.js site and a worker that scrapes once a day.
- **History:** the database records every availability change and every price change. Cards show "New", "Back in stock" and price-drop badges.
- **Bought marks** are saved in the database, so every device sees the same list.

## Run it

```bash
docker compose up -d --build
```

- Site: <http://localhost:3001> (or `http://<pi-ip>:3001`). Change the port with `WEB_PORT` in `.env`.
- The worker applies migrations on start and scrapes every day at **06:30 Lisbon time**. If the last good scrape is more than 20 hours old, it also scrapes as soon as it starts.
- On an empty database, the worker first imports `data/catalog.json`, the last snapshot from the old GitHub Pages app, so first-seen dates and availability history carry over.

## Careful scraping

All three shops have public product APIs (the WooCommerce Store API and Shopify's `products.json`), so no fragile HTML parsing is needed.

- Requests use the `coffee-buyer` User-Agent and wait about 1.5 s between pages.
- Only public product data is read: no cart, checkout or admin routes.
- 7g hides sold-out coffees from its API. The scraper cross-checks the public product sitemap and marks anything missing from the API as unavailable.
- Each roaster is scraped separately. If one shop is down, its coffees are left as they were instead of being marked sold out.

## Development

Node isn't needed on the host. `scripts/n` runs any command in a Node 22 container with the repo mounted:

```bash
docker compose up -d db
scripts/n pnpm install
scripts/n pnpm test
scripts/n pnpm typecheck
PORTS=3001:3000 scripts/n pnpm dev     # dev server on :3001
scripts/n pnpm cli scrape              # scrape now
scripts/n pnpm cli stats
scripts/n pnpm cli import:json <file>  # seed from an old catalog.json
```

After changing `src/db/schema.ts`, run `scripts/n pnpm db:generate` and commit the new migration.

## Layout

```
src/scraper/   per-roaster adapters (sources.ts) and HTTP/parsing helpers
src/catalog/   merge rules: what changed since the last scrape
src/jobs/      scrape + import tasks, daily worker
src/db/        Drizzle schema and migrations
src/web/       list queries, filters and sorting
app/           Next.js site (one page: the coffee list)
data/          catalog.json seed from the old app
```
