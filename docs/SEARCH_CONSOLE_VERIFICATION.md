# Google Search Console / Bing Webmaster 站点验证（F4）

本文档说明如何在**不提交 HTML 验证文件到仓库**的前提下，完成站点所有权验证，并与 [`apps/web/lib/seo/indexable.ts`](../apps/web/lib/seo/indexable.ts) 的索引策略一致。

## 原则

1. **优先 DNS TXT**：与 Next.js 代码解耦，换主机不丢所有权；不向 `apps/web/public/` 添加 `google*.html`、`BingSiteAuth.xml` 等文件（避免 staging 静态资源被误收录后「抢占」线上验证）。
2. **次选 meta 标签（本仓库已支持）**：仅在 **`isPublicIndexingEnabled()` 为 `true`** 时，根布局 [`apps/web/app/layout.tsx`](../apps/web/app/layout.tsx) 才会通过 `metadata.verification` 输出验证 meta；staging / 本地默认 **不输出**。
3. **密钥不入仓**：验证 token 只放在部署环境的密钥管理 / `.env`（生产），不要写入 Git。

## 环境变量

| 变量 | 用途 |
|------|------|
| `GOOGLE_SITE_VERIFICATION` | Google Search Console「HTML 标签」方式中的 `content` 值 |
| `BING_SITE_VERIFICATION` | Bing Webmaster 的验证 token（将输出为 `<meta name="msvalidate.01" content="...">`） |
| `OTHER_SITE_VERIFICATION` | 可选；多行或分号分隔，每行 `metaName=value`（如 Yandex、百度站长自定义 meta） |

`OTHER_SITE_VERIFICATION` 示例（换行书写）：

```env
OTHER_SITE_VERIFICATION=yandex-verification=abc123
baidu-site-verification=def456
```

## 操作步骤（推荐顺序）

### A. DNS TXT（推荐）

1. 在 Google Search Console / Bing Webmaster 选择「DNS 记录验证」。
2. 在 DNS 托管商处添加平台给出的 **TXT** 记录（主机名多为 `@` 或子域前缀）。
3. 等待解析生效后在平台点击「验证」。

### B. Meta 标签（代码路径，生产可索引时生效）

1. 确认生产环境满足 **`isPublicIndexingEnabled() === true`**（通常 `DEPLOYMENT_ENV=production` 且未强制 noindex）。
2. 在平台选择「HTML 标签」验证，复制 token。
3. 在部署环境设置：
   - Google：`GOOGLE_SITE_VERIFICATION=<token>`
   - Bing：`BING_SITE_VERIFICATION=<token>`
4. 重新部署 / 重启进程后，查看首页 HTML `<head>` 是否出现对应 meta。

### C. HTML 文件验证（不推荐入仓）

若平台强制要求固定文件名：可在**生产**临时添加路由或静态文件，**验证完成后立即删除**；不要将带真实 token 的文件提交到 Git。需要时单独开切片实现受控 route。

## 回滚

- 删除或清空上述环境变量后重新部署即可移除 meta 验证标签。
- DNS TXT 验证：在 DNS 控制台删除对应 TXT 记录。

## 验收自检

- staging：`PUBLIC_INDEXING_OVERRIDE=false` 或 `DEPLOYMENT_ENV!=production` 时，首页 **不应**出现 `google-site-verification` / `msvalidate.01`。
- 生产：设置 env 后应出现上述 meta（可用「查看网页源代码」确认）。

本地可运行：`pnpm verify:f4`。
