#!/usr/bin/env sh
# 示例：由服务器 cron 定时触发 RSS 入库（仍为 draft/ingested，不经人审不会进 sitemap）。
# 用法：复制为 curl-rss-ingest.sh，填入 BASE_URL 与 INGEST_WEBHOOK_SECRET，chmod +x 后加入 crontab。
# crontab 示例（每小时）：
#   0 * * * * /path/to/curl-rss-ingest.sh >> /var/log/guge-ingest.log 2>&1
set -e
BASE_URL="${BASE_URL:-https://zimomo.fans}"
SECRET="${INGEST_WEBHOOK_SECRET:?set INGEST_WEBHOOK_SECRET}"
curl -sS -X POST "${BASE_URL}/api/ingest/rss" \
  -H "Authorization: Bearer ${SECRET}" \
  -H "Content-Type: application/json" \
  -d '{}' | tee /dev/stderr
