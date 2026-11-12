import { readFile } from "node:fs/promises";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/src/db/client";
import { availability, coffees, jobRuns, prices } from "@/src/db/schema";
import { planMerge, type KnownCoffee } from "@/src/catalog/merge";
import { sleep } from "@/src/scraper/http";
import { SOURCES } from "@/src/scraper/sources";
import { coffeeId, type ScrapedCoffee } from "@/src/scraper/types";

/** Today's date in Lisbon, YYYY-MM-DD. */
export const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Lisbon" });

async function withRun<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const [run] = await db.insert(jobRuns).values({ job: name }).returning({ id: jobRuns.id });
  console.log(`${name}: start`);
  try {
    const stats = await fn();
    await db.update(jobRuns).set({ finishedAt: new Date(), ok: true, stats }).where(eq(jobRuns.id, run!.id));
    console.log(`${name}: done ${JSON.stringify(stats)}`);
    return stats;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(jobRuns).set({ finishedAt: new Date(), ok: false, error: message }).where(eq(jobRuns.id, run!.id));
    console.error(`${name}: FAILED ${message}`);
    throw err;
  }
}

async function loadKnown(): Promise<KnownCoffee[]> {
  const rows = await db.execute<{
    id: string;
    roaster: string;
    available: boolean;
    price_cents: number | null;
    last_status: "available" | "unavailable" | null;
  }>(sql`
    select c.id, c.roaster, c.available, c.price_cents, a.status as last_status
    from coffees c
    left join lateral (
      select status from availability where coffee_id = c.id order by date desc, id desc limit 1
    ) a on true`);
  return rows.map((r) => ({
    id: r.id,
    roaster: r.roaster,
    available: r.available,
    priceCents: r.price_cents,
    lastStatus: r.last_status,
  }));
}

const columns = (c: ScrapedCoffee) => ({
  roaster: c.roaster,
  roasterSlug: c.roasterSlug,
  name: c.name,
  url: c.url,
  available: c.available,
  purpose: c.purpose,
  producer: c.origin.producer,
  cultivar: c.origin.cultivar,
  process: c.origin.process,
  altitude: c.origin.altitude,
  harvest: c.origin.harvest,
  notes: c.notes,
  priceCents: c.priceCents,
  imageUrl: c.imageUrl,
  description: c.description,
  weightOptions: c.weightOptions,
  grindOptions: c.grindOptions,
});

/** Scrape every roaster and merge the result into the database. */
export function scrape() {
  return withRun("scrape", async () => {
    const scraped: ScrapedCoffee[] = [];
    const ok = new Set<string>();
    const failed: Record<string, string> = {};
    for (const [roaster, fn] of Object.entries(SOURCES)) {
      try {
        const items = await fn();
        scraped.push(...items);
        ok.add(roaster);
        console.log(`  ${roaster}: ${items.length} coffees`);
      } catch (err) {
        failed[roaster] = err instanceof Error ? err.message : String(err);
        console.error(`  ${roaster}: FAILED ${failed[roaster]}`);
      }
      await sleep(2000);
    }
    if (ok.size === 0) throw new Error(`every roaster failed: ${JSON.stringify(failed)}`);

    const date = today();
    const plan = planMerge(await loadKnown(), scraped, ok);
    await db.transaction(async (tx) => {
      for (const c of plan.upserts) {
        const values = columns(c);
        await tx
          .insert(coffees)
          .values({ id: c.id, ...values, firstSeen: date, lastSeen: date })
          .onConflictDoUpdate({ target: coffees.id, set: { ...values, lastSeen: date } });
      }
      if (plan.vanished.length) {
        await tx.update(coffees).set({ available: false }).where(inArray(coffees.id, plan.vanished));
      }
      if (plan.statusChanges.length) {
        await tx.insert(availability).values(plan.statusChanges.map((s) => ({ ...s, date })));
      }
      if (plan.priceChanges.length) await tx.insert(prices).values(plan.priceChanges);
    });

    return {
      scraped: plan.upserts.length,
      available: plan.upserts.filter((c) => c.available).length,
      vanished: plan.vanished.length,
      statusChanges: plan.statusChanges.length,
      priceChanges: plan.priceChanges.length,
      failed,
    };
  });
}

type JsonCoffee = Omit<ScrapedCoffee, "priceCents" | "weightOptions" | "grindOptions"> & {
  id?: string;
  price: { amount: number } | null;
  weightOptions?: string[];
  grindOptions?: string[];
  firstSeen: string;
  lastSeen: string;
  history: { date: string; status: "available" | "unavailable" }[];
};

/**
 * Seed the database from the old GitHub Pages catalog.json, keeping each
 * coffee's first-seen date and availability history. Coffees already in the
 * database are skipped, so this is safe to run more than once.
 */
export function importJson(file: string) {
  return withRun("import-json", async () => {
    const catalog = JSON.parse(await readFile(file, "utf8")) as { coffees: JsonCoffee[] };
    let imported = 0;
    await db.transaction(async (tx) => {
      for (const c of catalog.coffees) {
        const id = c.id ?? coffeeId(c);
        const priceCents = c.price ? Math.round(c.price.amount * 100) : null;
        const inserted = await tx
          .insert(coffees)
          .values({
            id,
            ...columns({ ...c, priceCents, weightOptions: c.weightOptions ?? [], grindOptions: c.grindOptions ?? [] }),
            firstSeen: c.firstSeen,
            lastSeen: c.lastSeen,
          })
          .onConflictDoNothing()
          .returning({ id: coffees.id });
        if (inserted.length === 0) continue;
        imported += 1;
        if (c.history.length) {
          await tx.insert(availability).values(c.history.map((h) => ({ coffeeId: id, date: h.date, status: h.status })));
        }
        if (priceCents !== null) {
          await tx.insert(prices).values({ coffeeId: id, priceCents, seenAt: new Date(`${c.lastSeen}T12:00:00Z`) });
        }
      }
    });
    return { inFile: catalog.coffees.length, imported };
  });
}
