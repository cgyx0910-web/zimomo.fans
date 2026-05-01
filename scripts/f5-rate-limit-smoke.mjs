import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsEntry = path.join(root, "scripts", "f5-rate-limit-smoke.ts");

const res = spawnSync("pnpm", ["exec", "tsx", tsEntry], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

process.exit(res.status === null ? 1 : res.status);
