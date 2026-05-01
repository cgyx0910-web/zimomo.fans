import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { sql } from "drizzle-orm";

import { getDb, releasePool } from "../src/db";

const scriptDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(scriptDir, "../.env") });
dotenv.config({ path: resolve(scriptDir, "../../..", ".env") });

process.env.DATABASE_URL ||= "postgresql://guge:guge@127.0.0.1:5432/guge";

async function main() {
  const db = getDb();
  await db.execute(sql`select 1::int as one`);
  console.log("PostgreSQL reachable via Drizzle (@guge/db)");
  await releasePool();
}

main().catch((err: unknown) => {
  console.error(err);
  void releasePool().finally(() => process.exit(1));
});
