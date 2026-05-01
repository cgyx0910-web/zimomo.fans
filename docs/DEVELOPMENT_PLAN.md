# 分阶段开发计划（Plan 模式就绪）

面向：**Zimomo/Labubu 粉丝资讯枢纽**自建站（对齐总蓝图修订版）。

## 如何用本文件配合 Cursor Plan 模式

1. **单次 Plan** 尽量只锁定**一个阶段（A–F）内的一个可交付切片**（例如「A1：初始化仓库与 DB schema 草案」），避免单次范围过大。
2. 每个切片结束时，勾选本文 **验收标准**，再开启下一阶段 Plan。
3. 若实现与蓝图冲突，以 **`docs/VISION_CONSTRAINTS.md`**（非官方、无假评论、全站 canonical 策略）为准。

---

## 全局约束（任何阶段都必须遵守）

| 类别 | 约束 |
|------|------|
| 品牌 | 全站显性 **非官方**；不搞「高仿官网」。 |
| AI | LLM **仅草稿**；**禁止**伪造用户评论/虚假互动；事实类不设「零人审自动发布」。 |
| 内容 | 资讯须有 **可追溯来源 URL**；FAQ/摘要须可复核；不用 Review 伪造 schema。 |
| SEO | **全文权威 URL** 仅在旗舰域（默认 `zimomo.fans`）；卫星域不重复长篇全文；`canonical`/`hreflang` 策略见约束文档。 |
| 法务页 | Privacy、Cookie（面向欧/美用户）、About、Disclaimer、版权/纠错通道 —— **阶段 A 末须可访问（可先占位文案）**。 |

---

## Plan 模板（每次开工可复制）

> 用于 Cursor Plan 模式：单次只做一个切片，写清边界、产出、验收与风险。

```md
## Phase/切片
- 阶段：A/B/C/D/E/F
- 切片编号：如 A4、B2、D1
- 目标（一句话）：

## In Scope（本次要做）
- 
- 

## Out of Scope（本次不做）
- 
- 

## 文件/模块清单
- 
- 

## 设计与实现要点
- 
- 

## 验收标准（引用 DEVELOPMENT_PLAN checkbox）
- [ ] 
- [ ] 

## 风险与回滚
- 风险：
- 回滚策略：

## 结果记录（完成后补）
- 实际产出：
- 遗留问题：
- 下一切片建议：
```

---

## 自动化流水线模板（B→C→D）

完整流水线不是单阶段完成，按以下顺序推进：

1. **B 入库**：sources -> raw_documents -> content_items（ingested）
2. **C 聚类**：去重 + story_clusters + Hub 合并/拆分
3. **D 增强**：quality_gate + enrich_worker（LLM draft）+ 发布状态机

---

## LLM/模型调用模板（D 阶段起生效）

### 原则

- LLM 仅用于草案与辅助提取，默认写入 `draft`，不得直发公网。
- 必须保留 `source_urls`，不确定字段标记 `unknown`。
- 禁止使用 LLM 伪造评论或虚假互动。

### 推荐路由（含 DeepSeek）

| 任务 | 建议模型 | 说明 |
|------|----------|------|
| 摘要草案 | DeepSeek（chat 类） | 成本友好，输出写入 `draft.summary`。 |
| FAQ 草案 | DeepSeek（chat 类） | 仅作编辑部 FAQ 草稿，不冒充用户评论。 |
| 翻译草案 | DeepSeek（chat 类） | 中英互译后仍需人工润色。 |
| 结构化字段抽取（日期/地区/渠道） | DeepSeek + 规则校验 | 结果进入 `draft.fields`，通过 gate 后才可发布。 |
| 高风险事实复核 | 人工为主（可二次模型复核） | 价格、时间、官方声明等以人工确认为准。 |

### 调用闸门（必须满足）

- 403/404 链接检测通过
- 相似度告警在阈值内（避免大段雷同）
- 状态机到达 `in_review` 后由编辑确认再 `published`

---

## 阶段 A：地基（可手发文章 + 前台 + 合规壳）

**目标**：证明「发布—展示—索引」通路；法务与 SEO 基线就位。

**建议切片（可拆开成多个 Plan）**

- A1：Monorepo/单仓骨架（Next.js App Router + TS）。
- A2：PostgreSQL 连接与当地迁移工具；最小 `articles` / `tags` 表。
- A3：Admin 仅本人：创建/编辑草稿与已发布。
- A4：前台：资讯列表、详情页 ISR/SSG 策略、`sitemap.xml`、`robots.txt`。
- A5：静态法务页路由与占位中英文案。
- A6：**禁止**staging 被索引的规则（robots/meta）。

**验收标准**

- [ ] 能手写发布一篇带 `canonical`、OG、来源链接的文章并公开访问。
- [ ] `sitemap` 列出已发布 URL；staging 不向搜索引擎开放。
- [ ] 法务五件套路由存在（可先 Lorem，但结构固定）。

---

## 阶段 B：入库（RSS  ingest，只吃进 draft）

**目标**：外部信息进入库，但不自动对公网索引。

**建议切片**

- B1：`sources` 白名单配置与 Cron/webhook。
- B2：`raw_documents` + 对象存储或本地 blobs。
- B3：规范化 worker → `content_items`，状态 `ingested`。
- B4：Admin 可查看 raw 与提取文本，**无「一键公开」**直到过 C 阶段闸门（或临时仅生成内部 `preview`）。

**验收标准**

- [ ] 白名单 RSS 可被拉取并落库。
- [ ] 默认 **`noindex`** 或未绑定 `published_article_id` 的条目不可出现在 sitemap。

---

## 阶段 C：Hub（去重聚类 + 编辑器合并）

**目标**：多篇报道合并为一个「事件」，减少站内重复与用户价值。

**建议切片**

- C1：`story_clusters`、`cluster_items`。（实现中 / C1 地基：`pnpm verify:c1`）
- C2：去重（URL 哈希 + 相似度阈值 v0）。（实现中 / C2：`pnpm verify:c2`、`CLUSTER_WEBHOOK_SECRET`）
- C3：Admin：**合并为多源 Hub** / 拆分；Hub 模板：时间线 + 多来源外链。（实现中 / C3：`pnpm verify:c3`、`/clusters/[slug]`）
- C4：**内链**：Hub ↔ 单一「主文」canonical 约定（写明在约束文档）。（实现中 / C4：`pnpm verify:c4`）

**验收标准**

- [ ] 至少 3 条 `content_items` 可演示合并为一个 cluster 并对访客展示 Hub。
- [ ] Hub 每一处事实性论断可跳到 `article_sources` 或出站链接。

---

## 阶段 D：闸门与 LLM 草案（人审后发）

**目标**：规模化起草，人命负责事实。

**建议切片**

- D1：`quality_gate`：出站 403/404、与来源文本雷同度告警。
- D2：`enrich_worker`：摘要/FAQ 草案 → 仅写入 `draft` 字段。
- D3：**状态机**：`blocked` · `draft` · `in_review` · `published`；发布后 `revalidate`。

**验收标准**

- [ ] Gate 触发时无法进入 `published`（除管理员 override 且有审计日志可选）。
- [ ] 已发布文含 `Last updated` 字段（DB 或 frontmatter）。

---

## 阶段 E：常青页 + 变现占位

**目标**：日历/百科增厚 SEO；Ads/联盟**位置与披露**就位（可先占位）

**建议切片**

- E1：`calendar_events` CRUD + 前台日历 + ICS 导出（可先手工录入）。
- E2：`wiki_entities` schema + 条目模板。
- E3：**FAQ 组件**（非伪装评论）+ 可选 FAQPage JSON-LD。
- E4：**广告槽组件**（懒加载占位）；**联盟披露**页与正文披露短句。

**验收标准**

- [ ] 日历与至少 3 条百科可被索引且含独特导语（非空壳）。
- [ ] 页脚/关于页可链到「广告与联盟」披露。

---

## 阶段 F：互动、私域与运维

**目标**：留存与再营销；不负责「造假热度」。

**建议切片**

- F1：注册/登录（Email 或 OAuth）。（实现中 / F1：`pnpm verify:f1` — 当前为 Email + 密码，OAuth 后续切片）
- F2：**评论**：审核队列、spam 基础拦截。（实现中 / F2：`pnpm verify:f2`）
- F3：**Newsletter** 订阅双 opt-in（欧区）；UTM 规范文档。（实现中 / F3：`pnpm verify:f3`）
- F4：Bing Webmaster / Search Console 验证占位说明。（实现中 / F4：`pnpm verify:f4`）
- F5：**备份/runbook**：DB 快照、密钥轮换一页纸。（实现中 / F5：`pnpm verify:f5` — 含 `docs/RUNBOOK.md` 与公开写操作 in-memory 限流）

**验收标准**

- [ ] 评论为真用户时可运行；不与「AI 假评论」路径混用。
- [ ] Newsletter 有可验证的 unsubscribe。

---

## 跨阶段月度核对（自检表）

复制到 issue 或 Notion：

- [ ] 是否出现程序化 **thin URL**（无独特导语）。
- [ ] LLM **幻觉**是否在 UI 上对编辑可见（风险提示）。
- [ ]  satellite 域名是否误出现全文 duplicate。
- [ ] 成本告警：LLM 与抓取是否超阈值。

---

## 版本

- `1.0`：与总蓝图修订版对齐，供 Plan 模式逐步开发。
