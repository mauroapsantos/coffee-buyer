import { boolean, date, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * One row per coffee a roaster has ever listed. The id is `<roaster>:<slug>`,
 * so a returning origin from a new lot gets its own row and its own history.
 */
export const coffees = pgTable("coffees", {
  id: text("id").primaryKey(),
  roaster: text("roaster").notNull(),
  roasterSlug: text("roaster_slug").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  available: boolean("available").notNull(),
  /** general | espresso | filter | both */
  purpose: text("purpose").notNull(),
  producer: text("producer"),
  cultivar: text("cultivar").array().notNull().default([]),
  process: text("process"),
  altitude: text("altitude"),
  harvest: text("harvest"),
  notes: text("notes").array().notNull().default([]),
  priceCents: integer("price_cents"),
  imageUrl: text("image_url"),
  description: text("description").notNull().default(""),
  weightOptions: text("weight_options").array().notNull().default([]),
  grindOptions: text("grind_options").array().notNull().default([]),
  firstSeen: date("first_seen").notNull(),
  /** Last day the roaster's shop listed it (sitemap or API). */
  lastSeen: date("last_seen").notNull(),
});

/** One row each time a coffee's availability changes. */
export const availability = pgTable(
  "availability",
  {
    id: serial("id").primaryKey(),
    coffeeId: text("coffee_id")
      .notNull()
      .references(() => coffees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: text("status", { enum: ["available", "unavailable"] }).notNull(),
  },
  (t) => [index("availability_coffee_idx").on(t.coffeeId, t.date)],
);

/** One row each time a coffee's (lowest) price changes. */
export const prices = pgTable(
  "prices",
  {
    id: serial("id").primaryKey(),
    coffeeId: text("coffee_id")
      .notNull()
      .references(() => coffees.id, { onDelete: "cascade" }),
    priceCents: integer("price_cents").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("prices_coffee_idx").on(t.coffeeId, t.seenAt)],
);

/** Coffees I've bought. */
export const purchases = pgTable("purchases", {
  coffeeId: text("coffee_id")
    .primaryKey()
    .references(() => coffees.id, { onDelete: "cascade" }),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobRuns = pgTable("job_runs", {
  id: serial("id").primaryKey(),
  job: text("job").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ok: boolean("ok"),
  stats: jsonb("stats"),
  error: text("error"),
});
