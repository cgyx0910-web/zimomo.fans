# guge · 粉丝资讯站（自建）

分阶段开发与 Cursor Plan 模式的依据文档：

- [docs/VISION_CONSTRAINTS.md](docs/VISION_CONSTRAINTS.md) — 定位、域名、AI 边界
- [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) — 阶段 A–F、验收标准、切片建议

在项目根 `.cursor/rules/plan-driven-development.mdc` 中已启用「按计划推进」的 Agent 指引。

常用校验命令：

- `pnpm verify:a`：执行阶段 A 关键验收（build + production/staging 索引策略检查）。
- `pnpm verify:b1`：执行阶段 B1 验收（RSS ingest webhook 鉴权 + sitemap 隔离检查）。
- `pnpm verify:b2`：执行阶段 B2 验收（raw_documents 持久化链路与后台路由隔离检查）。
- `pnpm verify:b3`：执行阶段 B3 验收（normalize webhook 鉴权 + content_items 后台隔离检查）。
- `pnpm verify:b4`：执行阶段 B4 验收（raw 详情后台路由保护 + sitemap 隔离检查）。
- `pnpm verify:c1`：执行阶段 C1 验收（`story_clusters` 查询冒烟可选 + sitemap 隔离 + `/admin/clusters` 鉴权）。
- `pnpm verify:c2`：执行阶段 C2 验收（`/api/cluster/run` 鉴权 + sitemap 隔离 + `runClusterBucketBatch` 冒烟可选）。
- `pnpm verify:c3`：执行阶段 C3 验收（Hub 404 + 后台详情鉴权 + 禁索引时 sitemap 空 + public-queries 冒烟可选）。
- `pnpm verify:c4`：执行阶段 C4 验收（Hub 404 + 后台详情鉴权 + 禁索引时 sitemap 空 + DB 冒烟可选）。
- `pnpm verify:d1`：阶段 D1 质量闸门（build + 本地逻辑冒烟）。
- `pnpm verify:d2`：阶段 D2 enrich 草案（build + Zod/JSON 冒烟）。
- `pnpm verify:d3`：阶段 D3 文章工作流状态解析（build + 冒烟）。
- `pnpm verify:e1` … `pnpm verify:e4`：阶段 E 切片验收（见 `package.json`）。
- `pnpm verify:f1`：阶段 F1 前台 Email/密码注册登录（关键文件 + SEO/会话不变量）。
- `pnpm verify:f2`：阶段 F2 评论（注册用户 + 审核队列 + 基础反垃圾，无 LLM 评论路径）。
- `pnpm verify:f3`：阶段 F3 Newsletter 双 opt-in + UTM 文档（关键文件 + SEO/发件层不变量）。
- `pnpm verify:f4`：阶段 F4 GSC/Bing 验证占位（meta 注入闸门 + public 禁验证文件）。
- `pnpm verify:f5`：阶段 F5 备份/runbook 与公开写操作内存限流（关键文件 + 冒烟）；运维摘要见 [docs/RUNBOOK.md](docs/RUNBOOK.md)。

站点验证运维说明见 [docs/SEARCH_CONSOLE_VERIFICATION.md](docs/SEARCH_CONSOLE_VERIFICATION.md)。

前台用户会话需配置 **`USER_JWT_SECRET`**（与 `ADMIN_JWT_SECRET` 分离）；本地可参考根目录 [`.env.example`](.env.example)。

Newsletter 默认 **`EMAIL_TRANSPORT=console`**（终端打印确认/退订绝对链接）；UTM 命名见 [docs/UTM_GUIDE.md](docs/UTM_GUIDE.md)。
