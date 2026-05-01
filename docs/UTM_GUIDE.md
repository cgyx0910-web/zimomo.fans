# UTM 参数规范（站内与 Newsletter）

本文档为编辑部与开发共用的**命名约定**，与 `DEVELOPMENT_PLAN.md` 阶段 F3 对齐。

## 原则

1. **站内导航链接禁止带 `utm_*`**：避免站内跳转污染 referrer、重复归因与 thin URL。
2. **外部投放 / 邮件 / 二维码落地**允许带 UTM：用于区分渠道与活动。
3. **Newsletter 表单**：可从落地 URL 的 query 读取 `utm_source`、`utm_medium`、`utm_campaign`（各 ≤64 字符）写入订阅记录，便于回溯；**不**写入站内 canonical 或 sitemap。

## 推荐取值

| 参数 | 约束 | 示例 |
|------|------|------|
| `utm_source` | 小写 slug；域名或平台名 | `instagram`、`wechat`、`newsletter` |
| `utm_medium` | 限定集合 | `email`、`social`、`paid`、`referral`、`qr` |
| `utm_campaign` | `kebab-case` + 可选年月后缀 | `spring-drop-202605` |

## 报表口径

- 同一用户多次点击同一带 UTM 链接：以**首次落地**写入的 UTM 为准（若后续需要 click id，另开字段，勿滥用 `utm_*`）。
- 与联盟链接：联盟参数按「广告与联盟」披露页执行，不与 UTM 混用同一短链 unless 产品明确需要。

## 校验

- 应用层对 UTM 字段做长度与字符白名单（已在订阅表单 Zod 中截断至 64 字符）。
