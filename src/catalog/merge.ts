import { coffeeId, type ScrapedCoffee } from "@/src/scraper/types";

/** What we already know about a coffee before a scrape. */
export type KnownCoffee = {
  id: string;
  roaster: string;
  available: boolean;
  lastStatus: "available" | "unavailable" | null;
  priceCents: number | null;
};

export type MergePlan = {
  /** Scraped coffees to insert or update (lastSeen = today). */
  upserts: (ScrapedCoffee & { id: string })[];
  /** Known coffees missing from a roaster that scraped fine: now unavailable. */
  vanished: string[];
  /** Availability history rows to append (only when the status changes). */
  statusChanges: { coffeeId: string; status: "available" | "unavailable" }[];
  /** Price history rows to append (only when the price changes). */
  priceChanges: { coffeeId: string; priceCents: number }[];
};

/**
 * Same rules as the old catalog merge: history only grows when a coffee's
 * status changes, a coffee that disappears from its roaster's shop is marked
 * unavailable but kept (with its origin/process story), and `firstSeen` never
 * moves. Roasters whose scrape failed are left alone, so a network error
 * never marks their whole catalogue as sold out.
 */
export function planMerge(known: KnownCoffee[], scraped: ScrapedCoffee[], scrapedRoasters: Set<string>): MergePlan {
  const knownById = new Map(known.map((k) => [k.id, k]));
  const plan: MergePlan = { upserts: [], vanished: [], statusChanges: [], priceChanges: [] };
  const seen = new Set<string>();

  for (const item of scraped) {
    const id = coffeeId(item);
    if (seen.has(id)) continue;
    seen.add(id);
    const prev = knownById.get(id);
    const status = item.available ? "available" : "unavailable";
    if (prev?.lastStatus !== status) plan.statusChanges.push({ coffeeId: id, status });
    if (item.priceCents !== null && item.priceCents !== prev?.priceCents) {
      plan.priceChanges.push({ coffeeId: id, priceCents: item.priceCents });
    }
    plan.upserts.push({ ...item, id });
  }

  for (const prev of known) {
    if (seen.has(prev.id) || !scrapedRoasters.has(prev.roaster)) continue;
    if (prev.available) plan.vanished.push(prev.id);
    if (prev.lastStatus !== "unavailable") plan.statusChanges.push({ coffeeId: prev.id, status: "unavailable" });
  }

  return plan;
}
