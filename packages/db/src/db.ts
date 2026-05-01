import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema/index";

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required (copy .env.example to .env at repo root)."
    );
  }
  return url;
}

let pool: Pool | undefined;

/** Shared pool — call `releasePool()` in tests/long-running CLI if needed. */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: requireDatabaseUrl() });
  }
  return pool;
}

export async function releasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

/** Drizzle client bound to Postgres + generated schema */
export function getDb() {
  return drizzle(getPool(), { schema });
}
