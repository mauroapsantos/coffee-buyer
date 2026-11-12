import { describe, expect, it } from "vitest";
import type { ScrapedCoffee } from "@/src/scraper/types";
import { planMerge, type KnownCoffee } from "./merge";

const scraped = (slug: string, patch: Partial<ScrapedCoffee> = {}): ScrapedCoffee => ({
  roaster: "olisipo",
  roasterSlug: slug,
  name: slug,
  url: `https://olisipo.coffee/${slug}`,
  available: true,
  purpose: "espresso",
  origin: { producer: null, cultivar: [], process: null, altitude: null, harvest: null },
  notes: [],
  priceCents: 1420,
  imageUrl: null,
  description: "",
  weightOptions: [],
  grindOptions: [],
  ...patch,
});

const known = (id: string, patch: Partial<KnownCoffee> = {}): KnownCoffee => ({
  id,
  roaster: id.split(":")[0]!,
  available: true,
  lastStatus: "available",
  priceCents: 1420,
  ...patch,
});

const all = new Set(["olisipo", "7g", "senzu"]);

describe("planMerge", () => {
  it("records status and price for a new coffee", () => {
    const plan = planMerge([], [scraped("a")], all);
    expect(plan.upserts.map((c) => c.id)).toEqual(["olisipo:a"]);
    expect(plan.statusChanges).toEqual([{ coffeeId: "olisipo:a", status: "available" }]);
    expect(plan.priceChanges).toEqual([{ coffeeId: "olisipo:a", priceCents: 1420 }]);
  });

  it("adds no history when nothing changed", () => {
    const plan = planMerge([known("olisipo:a")], [scraped("a")], all);
    expect(plan.statusChanges).toEqual([]);
    expect(plan.priceChanges).toEqual([]);
  });

  it("appends history when status or price changes", () => {
    const plan = planMerge([known("olisipo:a")], [scraped("a", { available: false, priceCents: 1250 })], all);
    expect(plan.statusChanges).toEqual([{ coffeeId: "olisipo:a", status: "unavailable" }]);
    expect(plan.priceChanges).toEqual([{ coffeeId: "olisipo:a", priceCents: 1250 }]);
  });

  it("marks coffees that vanished from their roaster as unavailable", () => {
    const plan = planMerge([known("olisipo:a"), known("olisipo:gone")], [scraped("a")], all);
    expect(plan.vanished).toEqual(["olisipo:gone"]);
    expect(plan.statusChanges).toEqual([{ coffeeId: "olisipo:gone", status: "unavailable" }]);
  });

  it("does not repeat the unavailable entry for coffees already gone", () => {
    const plan = planMerge([known("olisipo:gone", { available: false, lastStatus: "unavailable" })], [], all);
    expect(plan.vanished).toEqual([]);
    expect(plan.statusChanges).toEqual([]);
  });

  it("leaves coffees alone when their roaster's scrape failed", () => {
    const plan = planMerge([known("7g:x")], [scraped("a")], new Set(["olisipo"]));
    expect(plan.vanished).toEqual([]);
    expect(plan.statusChanges.map((s) => s.coffeeId)).toEqual(["olisipo:a"]);
  });
});
