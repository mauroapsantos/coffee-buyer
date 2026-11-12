"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/src/db/client";
import { purchases } from "@/src/db/schema";

/** Mark a coffee as bought, or remove the mark if it's already there. */
export async function togglePurchased(form: FormData) {
  const coffeeId = String(form.get("coffeeId") ?? "");
  if (!coffeeId) return;
  const removed = await db.delete(purchases).where(eq(purchases.coffeeId, coffeeId)).returning();
  if (removed.length === 0) await db.insert(purchases).values({ coffeeId }).onConflictDoNothing();
  revalidatePath("/");
}
