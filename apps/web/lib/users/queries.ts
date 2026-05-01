import { eq } from "drizzle-orm";

import { getDb } from "@guge/db";
import { users } from "@guge/db/schema";

export type UserRow = typeof users.$inferSelect;

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return rows[0] ?? null;
}

export async function createUser(params: {
  email: string;
  passwordHash: string;
  displayName?: string | null;
}): Promise<UserRow> {
  const db = getDb();
  const inserted = await db
    .insert(users)
    .values({
      email: params.email,
      passwordHash: params.passwordHash,
      displayName: params.displayName ?? null,
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to create user");
  }
  return row;
}

export async function touchLastLoginAt(userId: string): Promise<void> {
  const db = getDb();
  await db
    .update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, userId));
}
