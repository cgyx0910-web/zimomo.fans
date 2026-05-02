# 从 RSS 入库到前台「已发布资讯」

本仓库的设计是：**RSS 只负责入库（`raw_documents` / `content_items`），不负责把内容自动变成访客可见的已发布文章**。前台列表与 sitemap 只认 `articles` 表中 `status = published` 且带正确 `locale` 的行。

## 1. 确认来源与执行 ingest（阶段 B1）

1. 登录 Admin，打开 **RSS 来源**：`/admin/sources`。
2. 确认至少一条来源为启用状态，且 `feed_url` 在白名单逻辑允许范围内。
3. 点击 **「立即执行 ingest」**。成功后 `raw_documents` 会出现新行（状态多为 `ingested`）。
4. 可选：在部署环境用 `POST /api/ingest/rss` + `Authorization: Bearer <INGEST_WEBHOOK_SECRET>` 做定时拉取（仍只增加 raw，不自动 published）。示例见 `scripts/curl-rss-ingest.example.sh` 与 `docs/RUNBOOK.md`。
5. 打开 **Raw 文档**：`/admin/raw-documents`，确认有条目。

命令行自检（需可连 `DATABASE_URL` 的库）：

```bash
pnpm verify:ingest-readiness
```

## 2. 规范化到 content_items（阶段 B3）

1. 仍在 `/admin/sources`，点击 **「立即执行 normalize」**（或运行你们配置的 normalize worker）。
2. 打开 **Content Items**：`/admin/content-items`，确认由 raw 生成的 `ingested` 行。
3. 在 Raw 详情页可查看提取文本；**此处不提供「一键对公网发布」**（见 `DEVELOPMENT_PLAN` B4）。

## 3. 撰写资讯稿并人工发布（阶段 C/D）

1. 在 **后台首页** `/admin` 或 **新建资讯** `/admin/articles/new`，根据编辑部流程撰写或粘贴资讯稿（可引用 content_items / raw 中的事实，须符合版权与引用规范）。
2. 填写 **slug、locale、标题、正文**，按质检要求处理摘要/FAQ 等字段。
3. 将 **状态** 保存为 **published**（且满足应用内质检闸门）后，访客路径 `/{locale}/articles` 与对应文章页才会展示；未 published 时前台会显示「暂无已发布资讯」属预期行为。

## 4. 常见问题

| 现象 | 可能原因 |
|------|----------|
| 前台一直「暂无已发布资讯」 | 无 `articles.published` 行，或 `locale` 与当前前台语言不一致。 |
| ingest 后前台仍无变化 | 设计如此：ingest 只写 raw，须再走 normalize → 编辑文章 → published。 |
| 期望「拉完 RSS 就上列表」 | 与当前合规/SEO 闸门冲突，需单独产品决策后再开发；默认禁止零人审自动上站。 |
