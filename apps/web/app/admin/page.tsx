import Link from "next/link";

import type { InferSelectModel } from "drizzle-orm";

import { articles } from "@guge/db/schema";

import { listArticlesAdmin } from "@/lib/articles/queries";

type ArticleRow = InferSelectModel<typeof articles>;

function isPostgresAuthFailure(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message;
  const cause = "cause" in error ? (error as Error & { cause?: unknown }).cause : undefined;
  const causeMsg =
    cause instanceof Error ? cause.message : typeof cause === "object" && cause !== null && "message" in cause ?
      String((cause as { message: unknown }).message)
    : "";
  const causeCode =
    typeof cause === "object" && cause !== null && "code" in cause ?
      String((cause as { code: unknown }).code)
    : "";
  return (
    causeCode === "28P01" ||
    msg.includes("password authentication failed") ||
    causeMsg.includes("password authentication failed")
  );
}

function formatDt(value: Date | string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminHomePage() {
  let rows: ArticleRow[] = [];
  let dbError: "auth" | "other" | null = null;

  try {
    rows = await listArticlesAdmin();
  } catch (error) {
    console.error("[admin] listArticlesAdmin failed", error);
    dbError = isPostgresAuthFailure(error) ? "auth" : "other";
  }

  if (dbError === "auth") {
    return (
      <div className="space-y-4 rounded-lg border border-red-200 bg-red-50/90 p-6 text-sm text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
        <p className="font-medium">数据库认证失败（Postgres 28P01）</p>
        <p className="mt-2 leading-relaxed">
          应用使用的 <code className="rounded bg-red-100/80 px-1 font-mono text-xs dark:bg-red-900/50">DATABASE_URL</code>{" "}
          与库内用户 <code className="font-mono text-xs">guge</code> 的口令不一致，或修改{" "}
          <code className="font-mono text-xs">.env</code> 后仅执行了 <code className="font-mono text-xs">restart</code>{" "}
          导致容器仍用旧连接串。请在服务器核对{" "}
          <code className="font-mono text-xs">POSTGRES_PASSWORD</code> 与 URL 中密码一致，必要时在{" "}
          <code className="font-mono text-xs">postgres</code> 容器内对 <code className="font-mono text-xs">guge</code>{" "}
          执行 <code className="font-mono text-xs">ALTER USER</code> 改密（与 <code className="font-mono text-xs">.env</code>{" "}
          一致），然后执行{" "}
          <code className="font-mono text-xs">docker compose … up -d --force-recreate web</code>。详见{" "}
          <code className="font-mono text-xs">docs/RUNBOOK.md</code>（2.1 节）与{" "}
          <code className="font-mono text-xs">scripts/verify-vps-admin-db.sh</code>。
        </p>
      </div>
    );
  }

  if (dbError === "other") {
    return (
      <div className="space-y-4 rounded-lg border border-amber-200 bg-amber-50/90 p-6 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">数据库暂时不可用</p>
        <p className="mt-2">
          无法加载资讯列表。请在服务器查看{" "}
          <code className="rounded bg-amber-100/80 px-1 font-mono text-xs dark:bg-amber-900/50">
            docker compose -f compose.vps.yaml logs web --tail=80
          </code>
          。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">RSS 与前台资讯的关系</p>
        <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">
          「立即 ingest」只把条目写入{" "}
          <strong className="font-semibold">raw_documents</strong>
          ，不会自动出现在访客资讯列表。列表只展示本页表格里{" "}
          <strong className="font-semibold">published</strong> 的文章。流程：{" "}
          <Link className="underline" href="/admin/sources">
            RSS 来源
          </Link>
          （ingest → normalize）→{" "}
          <Link className="underline" href="/admin/raw-documents">
            Raw 文档
          </Link>
          、
          <Link className="underline" href="/admin/content-items">
            Content Items
          </Link>
          → 新建/编辑资讯 → published。运维说明见仓库{" "}
          <code className="rounded bg-amber-100/80 px-1 font-mono text-xs dark:bg-amber-900/50">
            docs/INGEST_TO_PUBLISHED_PLAYBOOK.md
          </code>
          ；库表计数可运行{" "}
          <code className="rounded bg-amber-100/80 px-1 font-mono text-xs dark:bg-amber-900/50">
            pnpm verify:ingest-readiness
          </code>
          。
        </p>
      </section>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">资讯列表</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            工作流：draft / in_review / blocked / published；仅 published 对访客与 sitemap 可见且须过质检。
          </p>
        </div>

        <Link
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          href="/admin/articles/new"
        >
          新建资讯
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300">
            <tr>
              <th className="px-3 py-3">slug</th>
              <th className="px-3 py-3">状态</th>
              <th className="px-3 py-3">标题</th>
              <th className="px-3 py-3">发布</th>
              <th className="px-3 py-3">更新</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-neutral-600" colSpan={6}>
                  暂无文章。
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  className="border-t border-neutral-100 dark:border-neutral-900"
                  key={row.id}
                >
                  <td className="px-3 py-3 font-[family-name:var(--font-geist-mono)] text-xs">
                    {row.slug}
                  </td>
                  <td className="px-3 py-3">{row.status}</td>
                  <td className="px-3 py-3">{row.title ?? "(无标题)"}</td>
                  <td className="px-3 py-3">{formatDt(row.publishedAt)}</td>
                  <td className="px-3 py-3">{formatDt(row.updatedAt)}</td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      className="text-sm underline"
                      href={`/admin/articles/${row.id}/edit`}
                    >
                      编辑
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
