import Link from "next/link";

import { listRawDocumentsAdmin } from "@/lib/ingest/queries";

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

export default async function AdminRawDocumentsPage() {
  const rows = await listRawDocumentsAdmin(200);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Raw Documents</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          阶段 B4：可查看 raw 元数据、关联提取状态与详情文本，不提供公开发布动作。
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
              <th className="px-3 py-3">抓取时间</th>
              <th className="px-3 py-3">发布时刻</th>
              <th className="px-3 py-3">提取状态</th>
              <th className="px-3 py-3">blob</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-neutral-600" colSpan={9}>
                  暂无 raw_documents 记录。
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
                  <td className="px-3 py-3">{formatDt(row.fetchedAt)}</td>
                  <td className="px-3 py-3">{formatDt(row.publishedAt)}</td>
                  <td className="px-3 py-3">
                    {row.contentItemId ? `已提取 (${row.normalizedStatus ?? "ingested"})` : "未提取"}
                  </td>
                  <td className="px-3 py-3 font-[family-name:var(--font-geist-mono)] text-xs">
                    {row.storageKind}:{row.storageKey} ({row.blobSize}B)
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link className="text-sm underline" href={`/admin/raw-documents/${row.id}`}>
                      详情
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
