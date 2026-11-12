import { fileURLToPath } from "node:url";
import { Cron } from "croner";
import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/src/db/client";
import { runMigrations } from "@/src/db/migrate";
import { coffees, jobRuns } from "@/src/db/schema";
import { importJson, scrape } from "./tasks";

/** Long-running scheduler: scrapes the roasters once a day (Lisbon time). */
const TZ = "Europe/Lisbon";
const SEED = fileURLToPath(new URL("../../data/catalog.json", import.meta.url));

let running: Promise<unknown> = Promise.resolve();
const runScrape = () => {
  running = running.then(scrape).catch(() => {}); // withRun already logged it
};

async function main() {
  await runMigrations();

  const [known] = await db.select({ n: count() }).from(coffees);
  if (!known?.n) await importJson(SEED).catch(() => {});

  new Cron("30 6 * * *", { timezone: TZ }, runScrape);

  // Catch up straight away if the last good scrape is older than 20 hours.
  const since = new Date(Date.now() - 20 * 3600_000);
  const [recent] = await db
    .select({ n: count() })
    .from(jobRuns)
    .where(and(eq(jobRuns.job, "scrape"), eq(jobRuns.ok, true), gt(jobRuns.startedAt, since)));
  if (!recent?.n) runScrape();

  console.log("worker ready (Lisbon time): scrape daily at 06:30");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
