import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

const pkgDir = dirname(fileURLToPath(import.meta.url));
const pkgEnv = resolve(pkgDir, ".env");
const rootEnv = resolve(pkgDir, "../..", ".env");

dotenv.config({ path: rootEnv });
dotenv.config({ path: pkgEnv });

/** Matches repo `compose.yaml` defaults for local CLI only — override via `.env`. */
const DATABASE_URL_FALLBACK =
  "postgresql://guge:guge@127.0.0.1:5432/guge";

const url = process.env.DATABASE_URL ?? DATABASE_URL_FALLBACK;

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
});
