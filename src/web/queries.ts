import { sql } from "drizzle-orm";
import { db } from "@/src/db/client";

export type CoffeeRow = {
  id: string;
  roaster: string;
  name: string;
  url: string;
  available: boolean;
  purpose: string;
  producer: string | null;
  process: string | null;
  cultivar: string[];
  altitude: string | null;
  notes: string[];
  priceCents: number | null;
  /** The price before the latest change, if there was one. */
  previousPriceCents: number | null;
  imageUrl: string | null;
  firstSeen: string;
  /** Date of the latest availability change. */
  statusSince: string | null;
  /** Number of availability changes recorded. */
  statusChanges: number;
  purchasedAt: Date | null;
};

/** Every coffee, with its bought mark and recent price/availability changes. */
export async function listCoffees(): Promise<CoffeeRow[]> {
  const rows = await db.execute<Record<string, unknown>>(sql`
    select c.id, c.roaster, c.name, c.url, c.available, c.purpose, c.producer, c.process, c.cultivar,
           c.altitude, c.notes, c.price_cents, c.image_url, c.first_seen::text as first_seen,
           pp.price_cents as previous_price_cents,
           st.since::text as status_since, st.changes::int as status_changes,
           pu.purchased_at
    from coffees c
    left join purchases pu on pu.coffee_id = c.id
    left join lateral (
      select price_cents from prices where coffee_id = c.id order by seen_at desc, id desc offset 1 limit 1
    ) pp on true
    left join lateral (
      select max(date) as since, count(*) as changes from availability where coffee_id = c.id
    ) st on true`);
  return rows.map((r) => ({
    id: r.id as string,
    roaster: r.roaster as string,
    name: r.name as string,
    url: r.url as string,
    available: r.available as boolean,
    purpose: r.purpose as string,
    producer: r.producer as string | null,
    process: r.process as string | null,
    cultivar: (r.cultivar as string[] | null) ?? [],
    altitude: r.altitude as string | null,
    notes: (r.notes as string[] | null) ?? [],
    priceCents: r.price_cents as number | null,
    previousPriceCents: r.previous_price_cents as number | null,
    imageUrl: r.image_url as string | null,
    firstSeen: r.first_seen as string,
    statusSince: r.status_since as string | null,
    statusChanges: (r.status_changes as number | null) ?? 0,
    purchasedAt: r.purchased_at ? new Date(r.purchased_at as string) : null,
  }));
}

export async function lastScrape(): Promise<Date | null> {
  const [row] = await db.execute<{ at: string | null }>(
    sql`select max(finished_at) as at from job_runs where job = 'scrape' and ok`,
  );
  return row?.at ? new Date(row.at) : null;
}
