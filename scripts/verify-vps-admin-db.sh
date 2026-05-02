#!/usr/bin/env sh
# 在 VPS 的 /opt/guge 目录执行，用于核对 Admin 500 / Postgres 28P01（计划「vps-verify-logs」「vps-verify-env」）。
# 用法：chmod +x scripts/verify-vps-admin-db.sh && ./scripts/verify-vps-admin-db.sh
# 或：sh scripts/verify-vps-admin-db.sh
set -eu
COMPOSE="docker compose -f compose.vps.yaml"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== 1) web 最近日志（查找 28P01 / password authentication） =="
$COMPOSE logs web --tail=120 2>&1 | grep -E '28P01|password authentication failed|FATAL' || echo "(本段无匹配，可能近期无此类错误)"

echo ""
echo "== 2) 容器内 DATABASE_URL 解析（仅 host / user / 密码长度，不打印密码） =="
$COMPOSE exec -T web node -e "
const raw = process.env.DATABASE_URL;
if (!raw) { console.error('DATABASE_URL is empty'); process.exit(1); }
try {
  const u = new URL(raw);
  console.log('host=', u.hostname, 'user=', u.username, 'pwLen=', (u.password || '').length);
} catch (e) {
  console.error('DATABASE_URL is not a valid URL');
  process.exit(1);
}
"

echo ""
echo "== 3) Postgres 内 guge 能否执行 select 1 =="
$COMPOSE exec -T postgres psql -U guge -d guge -c 'select 1 as one;'

echo ""
echo "若 2) 与 3) 不一致：在 postgres 内 ALTER USER guge WITH PASSWORD '与 .env 一致'，然后执行："
echo "  docker compose -f compose.vps.yaml -f compose.vps.domain.yaml up -d --force-recreate web"
echo "（勿仅 restart；改 .env 后须 up 或 force-recreate 以重载环境变量。）"
