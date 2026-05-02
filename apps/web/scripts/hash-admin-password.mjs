#!/usr/bin/env node
/**
 * 生成 ADMIN_PASSWORD_HASH（bcrypt）。用法：
 *   pnpm --filter web exec node ./scripts/hash-admin-password.mjs '你的明文口令'
 * 或在仓库根：
 *   pnpm --filter web run hash-admin-password -- '你的明文口令'
 */
import bcrypt from "bcryptjs";

const plain = process.argv[2];
if (!plain || plain === "-h" || plain === "--help") {
  console.error("用法: node ./scripts/hash-admin-password.mjs '<明文口令>'");
  process.exit(plain ? 0 : 1);
}
console.log(bcrypt.hashSync(plain, 10));
