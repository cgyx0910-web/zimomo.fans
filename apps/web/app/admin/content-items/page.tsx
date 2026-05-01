import Link from "next/link";

import { listContentItemsAdmin } from "@/lib/content-items/queries";

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

export default async function AdminContentItemsPage() {
  const rows = await listContentItemsAdmin();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Content Items</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          阶段 B3：由 raw_documents 规范化生成，默认状态为 ingested。
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300">
            <tr>
              <th className="px-3 py-3">来源</th>
              <th className="px-3 py-3">标题</th>
              <th className="px-3 py-3">source_url</th>
              <th className="px-3 py-3">状态</th>
              <th className="px-3 py-3">发布时间</th>
              <th className="px-3 py-3">raw 抓取时间</th>
              <th className="px-3 py-3">更新</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-neutral-600" colSpan={8}>
                  暂无 content_items 记录。
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr className="border-t border-neutral-100 dark:border-neutral-900" key={row.id}>
                  <td className="px-3 py-3">{row.sourceName}</td>
                  <td className="px-3 py-3">{row.title ?? "(无标题)"}</td>
                  <td className="px-3 py-3 font-[family-name:var(--font-geist-mono)] text-xs">
                    {row.sourceUrl ?? "-"}
                  </td>
                  <td className="px-3 py-3">{row.status}</td>
                  <td className="px-3 py-3">{formatDt(row.publishedAt)}</td>
                  <td className="px-3 py-3">{formatDt(row.rawFetchedAt)}</td>
                  <td className="px-3 py-3">{formatDt(row.updatedAt)}</td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      className="text-sm underline"
                      href={`/admin/raw-documents/${row.rawDocumentId}`}
                    >
                      查看 raw
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
