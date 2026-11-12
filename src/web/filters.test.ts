import { describe, expect, it } from "vitest";
import { filterCoffees, formatPrice, sortCoffees, type Filterable } from "./filters";

const coffees: (Filterable & { id: string; firstSeen: string })[] = [
  {
    id: "olisipo:a",
    name: "El Tambo",
    roaster: "olisipo",
    purpose: "espresso",
    available: true,
    notes: ["Molasses", "Orange Zest"],
    producer: "ASMUCAFE",
    process: "Washed",
    priceCents: 1420,
    firstSeen: "2026-10-01",
  },
  {
    id: "7g:b",
    name: "Kenya Lot 20",
    roaster: "7g",
    purpose: "filter",
    available: false,
    notes: ["Blackcurrant"],
    producer: null,
    process: null,
    priceCents: null,
    firstSeen: "2026-11-01",
  },
  {
    id: "olisipo:c",
    name: "Salam Blend",
    roaster: "olisipo",
    purpose: "both",
    available: true,
    notes: [],
    producer: null,
    process: "Washed",
    priceCents: 1200,
    firstSeen: "2026-09-01",
  },
];

describe("filterCoffees", () => {
  it("returns all with default filters", () => {
    expect(filterCoffees(coffees, {})).toHaveLength(3);
  });

  it("filters by roaster", () => {
    expect(filterCoffees(coffees, { roaster: "7g" }).map((c) => c.id)).toEqual(["7g:b"]);
  });

  it("includes espresso & filter coffees under espresso and under filter", () => {
    expect(filterCoffees(coffees, { purpose: "espresso" }).map((c) => c.id)).toEqual(["olisipo:a", "olisipo:c"]);
    expect(filterCoffees(coffees, { purpose: "filter" }).map((c) => c.id)).toEqual(["7g:b", "olisipo:c"]);
  });

  it("keeps the espresso & filter option to those coffees only", () => {
    expect(filterCoffees(coffees, { purpose: "both" }).map((c) => c.id)).toEqual(["olisipo:c"]);
  });

  it("hides unavailable coffees", () => {
    const result = filterCoffees(coffees, { hideUnavailable: true });
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.available)).toBe(true);
  });

  it("searches name, producer and notes", () => {
    for (const query of ["tambo", "asmucafe", "blackcurrant"]) {
      expect(filterCoffees(coffees, { query })).toHaveLength(1);
    }
  });
});

describe("sortCoffees", () => {
  it("sorts available first", () => {
    const result = sortCoffees(coffees, "available-first");
    expect(result[0]!.available).toBe(true);
    expect(result.at(-1)!.available).toBe(false);
  });

  it("sorts by price ascending, coffees without price last", () => {
    expect(sortCoffees(coffees, "price-asc").map((c) => c.id)).toEqual(["olisipo:c", "olisipo:a", "7g:b"]);
  });

  it("sorts by price descending, coffees without price last", () => {
    expect(sortCoffees(coffees, "price-desc").map((c) => c.id)).toEqual(["olisipo:a", "olisipo:c", "7g:b"]);
  });

  it("sorts newest first", () => {
    expect(sortCoffees(coffees, "newest").map((c) => c.id)).toEqual(["7g:b", "olisipo:a", "olisipo:c"]);
  });
});

describe("formatPrice", () => {
  it("formats euro cents", () => {
    expect(formatPrice(1420)).toMatch(/14,20/);
  });

  it("returns empty string for missing price", () => {
    expect(formatPrice(null)).toBe("");
  });
});
