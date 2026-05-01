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
