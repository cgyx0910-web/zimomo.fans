import Link from "next/link";

import type { InferSelectModel } from "drizzle-orm";

import { articles } from "@guge/db/schema";

import { listArticlesAdmin } from "@/lib/articles/queries";

type ArticleRow = InferSelectModel<typeof articles>;

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
  const rows: ArticleRow[] = await listArticlesAdmin();

  return (
    <div className="space-y-6">
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
