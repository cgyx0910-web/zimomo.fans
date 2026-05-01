# 愿景与硬约束（与 Plan 对齐）

本文档是给开发与 Cursor Agent 的**单一事实来源**之一；如有冲突以此与 `docs/DEVELOPMENT_PLAN.md` 为准。

## 定位

非官方 POP MART / THE MONSTERS（含 Labubu、Zimomo 等）**粉丝资讯 + 可查档案**。主线盈利方向：展示广告（合规）、联盟链接（显性披露）、中长期赞助或会员试点。

## 域名（技术侧必须体现）

| 域名 | 角色 |
|------|------|
| `zimomo.fans` | **旗舰**：资讯、日历、百科、社区主入口；SEO 权重主投此处。 |
| `zimomo.games` | 卫星：quiz/活动；不向索引提交与旗舰**相同正文**的另一 URL。 |
| `zimomo.art` | 卫星：策展/画廊向。 |
| `zimomo.fan` | 301→`.fans` 或短链。 |
| `labubus.cn` / `labubus.hk`（若使用） | 华语或区域线；双语须 `hreflang` + 配对，避免双全文重复。 |

**Canonical**：任一资讯「全文」仅一个权威 URL（默认在旗舰）。

### Hub 与主文 canonical 约定（C4）

- 同一「事件」的**全文权威**落在站内一篇 `articles` 主文（`canonical_url` 或 `/articles/{slug}`）。
- `story_clusters` 可选关联 `published_article_id`；当主文状态为 **`published`** 时：
  - 公开 Hub（`/clusters/{slug}`）的 HTML `canonical` 指向主文 URL；
  - `sitemap.xml` **不再**单独提交该 Hub URL，避免与主文双收录；
  - Hub 页仍可对访客开放（多源时间线 + 出站摘录），主文页可反向链到 Hub。
- 主文仍为草稿或未关联时：Hub **自承** canonical，且可按 `merged` 规则进入 sitemap（与 C3 一致）。

## AI

- ✅ 允许的：编辑部摘要/FAQ **草案**、结构化字段抽取、翻译草案、聚类辅助，**均为 draft 直至人审**。
- ✅ 真实评论出现后：可作**标明「讨论摘要」**的聚合（非冒充单条真人）。
- ❌ 禁止：伪造用户评论、虚假互动计数、水军式会话。

## 内容诚信

每条对外资讯：至少一处 **可查证的来源 URL**；图片优先自有/授权/CC；大段复制需法律依据或放弃。

## 合规页（须在阶段 A 末可路由访问）

Disclaimer（非官方）、About、Privacy、Cookie 同意说明、版权声明与纠错/侵权联系渠道。
