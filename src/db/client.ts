import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// The driver connects lazily, so importing this during `next build` is safe.
const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };
globalForDb.pg ??= postgres(process.env.DATABASE_URL ?? "postgres://localhost/unset", { max: 5, onnotice: () => {} });

export const db = drizzle({ client: globalForDb.pg, schema });
export type Db = typeof db;

export async function closeDb() {
  await globalForDb.pg?.end();
}
