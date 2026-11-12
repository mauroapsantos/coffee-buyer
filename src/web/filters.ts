// Ported from app/src/filters.js; same filtering and sorting rules.

export type Filterable = {
  name: string;
  roaster: string;
  purpose: string;
  available: boolean;
  producer: string | null;
  process: string | null;
  notes: string[];
  priceCents: number | null;
};

export type Filters = {
  roaster?: string;
  purpose?: string;
  query?: string;
  hideUnavailable?: boolean;
};

export const SORTS = [
  { value: "available-first", label: "Available first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "newest", label: "Newest first" },
] as const;
export type Sort = (typeof SORTS)[number]["value"] | "name" | "roaster";

/** "Espresso & Filter" coffees count as espresso and as filter. */
export function matchesPurpose(coffeePurpose: string, wanted: string): boolean {
  if (coffeePurpose === wanted) return true;
  return coffeePurpose === "both" && (wanted === "espresso" || wanted === "filter");
}

export function filterCoffees<T extends Filterable>(coffees: T[], { roaster, purpose, query, hideUnavailable }: Filters): T[] {
  const q = (query ?? "").trim().toLowerCase();
  return coffees.filter((c) => {
    if (roaster && roaster !== "all" && c.roaster !== roaster) return false;
    if (purpose && purpose !== "all" && !matchesPurpose(c.purpose, purpose)) return false;
    if (hideUnavailable && !c.available) return false;
    if (q) {
      const haystack = [c.name, c.roaster, c.producer ?? "", c.process ?? "", ...c.notes].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function sortCoffees<T extends Filterable & { firstSeen?: string }>(coffees: T[], sort: Sort = "name"): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name);
  const sorted = [...coffees];
  if (sort === "name") sorted.sort(byName);
  else if (sort === "roaster") sorted.sort((a, b) => a.roaster.localeCompare(b.roaster) || byName(a, b));
  else if (sort === "available-first") sorted.sort((a, b) => Number(b.available) - Number(a.available) || byName(a, b));
  else if (sort === "newest") sorted.sort((a, b) => (b.firstSeen ?? "").localeCompare(a.firstSeen ?? "") || byName(a, b));
  else if (sort === "price-asc" || sort === "price-desc") {
    const direction = sort === "price-asc" ? 1 : -1;
    sorted.sort((a, b) => {
      if (a.priceCents === null && b.priceCents === null) return byName(a, b);
      if (a.priceCents === null) return 1;
      if (b.priceCents === null) return -1;
      return (a.priceCents - b.priceCents) * direction || byName(a, b);
    });
  }
  return sorted;
}

const eur = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });
export const formatPrice = (cents: number | null) => (cents === null ? "" : eur.format(cents / 100));
