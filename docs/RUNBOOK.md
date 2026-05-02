# 运维一页纸（Runbook）

> 占位：值班角色 / 升级路径 / 对外联络（Slack、手机）请按团队自行填写。

## 1. 数据库快照与还原

**假设**：生产 Postgres 可 SSH 或托管控制台执行 `pg_dump` / `pg_restore`。

```bash
# 自定义格式（推荐），含 schema + 数据
pg_dump --format=c --file=guge-$(date +%Y%m%d).dump "$DATABASE_URL"

# 还原到新库（先建空库并指向 DATABASE_URL）
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" guge-YYYYMMDD.dump
```

**保留**：每日增量或全量 + 每周冷备；至少保留 7 天日备 + 4 周周备（按合规调整）。

**cron 思路**（在备份机或 CI）：每日 02:00 全量；每周日额外归档到对象存储；失败发告警。

## 2. 密钥与凭据轮换

轮换时**不要**把真实值写入本仓库或聊天；在密钥管理器中生成后写入部署环境。

| 变量 | 说明 |
|------|------|
| `ADMIN_JWT_SECRET` | 轮换后所有 Admin Cookie 立即失效，需重新登录。 |
| `USER_JWT_SECRET` | 同上，前台用户会话失效。 |
| `ADMIN_PASSWORD_HASH` | 修改口令后更新 bcrypt 哈希。 |
| `INGEST_WEBHOOK_SECRET` / `NORMALIZE_WEBHOOK_SECRET` | 与上游 RSS/normalize 调用方同步更新。 |
| `EMAIL_TRANSPORT` 相关 SMTP 密码 | Newsletter 发信失败时检查。 |
| `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` | 控制台验证串变更时同步 `.env`。 |

**顺序建议**：先生成新 secret → 双写或短暂重叠（若平台支持）→ 切流量 → 废弃旧值。

### 2.1 Admin 白屏 / 全站 500 与 Postgres `28P01`（Docker Compose）

**现象**：浏览器仅显示 Next 摘要（如 `ERROR …/…`），`docker compose … logs web` 中出现 `password authentication failed for user "guge"` 或 `code: '28P01'`。

**根因**：`web` 使用的 `DATABASE_URL` 口令与 Postgres 数据目录里用户 `guge` 的真实口令不一致；或**已有数据卷**在首次初始化时用了旧口令，仅改 `.env` 不会自动改库内口令。

**处理顺序**：

1. 在仓库根（VPS 上 `/opt/guge`）执行自检脚本（不打印明文口令）：

   ```bash
   chmod +x scripts/verify-vps-admin-db.sh
   ./scripts/verify-vps-admin-db.sh
   ```

2. 在 `postgres` 容器内将 `guge` 口令改为与 `.env` 中 **`DATABASE_URL` 与 `POSTGRES_PASSWORD` 一致**（仅一条真源，二者须相同），例如：

   ```bash
   docker compose -f compose.vps.yaml exec postgres psql -U guge -d guge -c "ALTER USER guge WITH PASSWORD '你的强密码';"
   ```

3. **改 `.env` 后勿只 `docker compose restart web`**：Compose 在 **`up -d`（或 `--force-recreate web`）** 时才会把磁盘 `.env` 重新注入容器；否则 `web` 仍可能持有旧 `DATABASE_URL`。

   ```bash
   docker compose -f compose.vps.yaml -f compose.vps.domain.yaml up -d --force-recreate web
   ```

4. 若需**全新库口令且可丢数据**：`down` 后删除命名卷 `*_postgres_data` 再 `up`（会丢库；先备份）。

**相关 Compose 行为**：[`compose.vps.yaml`](../compose.vps.yaml) 中 `web.environment.DATABASE_URL` 在宿主机执行 `docker compose up` 时展开；`ADMIN_PASSWORD_HASH` 等 bcrypt 若经同一 `.env` 被 Compose 解析，字面量 `$` 可能需写成 `$$`（见 `.env.example` 注释）。

## 3. 入侵 / 泄露应急（概要）

1. **JWT**：轮换 `ADMIN_JWT_SECRET` / `USER_JWT_SECRET` 等效于撤销现有会话。
2. **Admin**：轮换口令哈希并审计最近后台操作日志（若有）。
3. **Webhook**：轮换 ingest/normalize secret，通知对接方。
4. **Newsletter**：必要时导出已确认订阅列表做合规通知；退订链接仍由既有 token 机制处理。

## 4. 公开写操作限流（内存）

默认由代码内配额约束（**单实例**、**重启清空**；多副本不共享，未来可换 KV）：

| 场景 | 维度 | 配额 |
|------|------|------|
| 评论提交 | IP + 用户 ID | 5 次 / 60 秒 |
| Newsletter 订阅 | IP + 邮箱 | 10 次 / 60 分钟 |
| 用户注册 | IP | 5 次 / 60 分钟 |
| 用户登录 | IP + 邮箱 | 10 次 / 15 分钟 |
| 管理员登录 | IP | 5 次 / 15 分钟 |

**应急放宽**：改代码常量并部署；或临时在**仅可信环境**设 `RATE_LIMIT_DISABLED=true`（**禁止生产长期开启**）。

**反代 IP**：默认读 `x-forwarded-for` 首段、`x-real-ip`；CDN 可用 `RATE_LIMIT_TRUSTED_HEADER=cf-connecting-ip` 等。

## 5. 监控与告警（占位）

- HTTP **5xx** 比例、关键路径 **4xx** 突增。
- `/api/ingest/rss` 失败率、normalize 队列堆积。
- LLM / enrich **成本** 日预算（若启用）。

具体阈值与告警渠道接 PagerDuty / 邮件 / IM。

## 6. 回滚

- **应用**：回滚到上一镜像 / 上一部署版本。
- **迁移失败**：勿强行 `db:migrate`；在 staging 复现后，用 Drizzle/人工 SQL 按迁移的逆序回退（保留备份后再动生产）。

## 7. 验证

```bash
pnpm verify:f5
```

检查 Runbook 文件、限流模块、各 Server Action 接入与内存限流冒烟。

## 8. 生产环境：定时 RSS 入库（仅 raw，不自动 published）

`POST /api/ingest/rss` 使用 Bearer `INGEST_WEBHOOK_SECRET`（与 `.env` / 部署密钥一致）。该接口只拉取白名单 feed 并写入 `raw_documents`，**不会**把 `articles` 设为 `published`；访客资讯列表仍依赖后台人审发布流程（见 `docs/INGEST_TO_PUBLISHED_PLAYBOOK.md`）。

1. 在生产环境设置 `INGEST_WEBHOOK_SECRET`（足够长的随机串）。
2. 复制 `scripts/curl-rss-ingest.example.sh` 为服务器上的可执行脚本，填入 `BASE_URL`（站点根，如 `https://example.com`）与 `INGEST_WEBHOOK_SECRET`。
3. 加入 crontab，例如每小时：

   ```cron
   0 * * * * /path/to/curl-rss-ingest.sh >> /var/log/guge-ingest.log 2>&1
   ```

4. 可选：用同一 secret 在 CI 或 k8s CronJob 中调用；失败时检查 Caddy/反代是否剥离了 `Authorization` 头、以及 `web` 容器日志中的 ingest 错误。

数据库侧快速计数（需 `DATABASE_URL`）：

```bash
pnpm verify:ingest-readiness
```
