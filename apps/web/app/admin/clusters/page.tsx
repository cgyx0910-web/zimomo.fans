import Link from "next/link";

import { listClustersAdmin } from "@/lib/clusters/queries";

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

function formatCount(value: unknown): string {
  if (value === null || value === undefined) {
    return "0";
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value);
}

export default async function AdminClustersPage() {
  const rows = await listClustersAdmin();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">Story Clusters</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          阶段 C1：<code className="font-mono text-xs">story_clusters</code> 与{" "}
          <code className="font-mono text-xs">cluster_items</code> 骨架；C3 起可做编辑器合并与 Hub。
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          阶段 C2 v0：未入桶的 <code className="font-mono text-xs">content_items</code> 会写入{" "}
          <code className="font-mono text-xs">url_hash</code> / <code className="font-mono text-xs">simhash</code>
          ，先按<strong>相同规范化 URL</strong>归桶，再按 64 位 simhash 的{" "}
          <strong>Hamming 距离阈值</strong>（默认 4，可用环境变量{" "}
          <code className="font-mono text-xs">CLUSTER_SIMHASH_THRESHOLD</code> 覆盖）找近邻；否则新建{" "}
          <code className="font-mono text-xs">draft</code> cluster。可在「RSS 来源」页点「立即执行
          cluster」或调用 <code className="font-mono text-xs">POST /api/cluster/run</code>。
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          阶段 C3：在「编辑」中合并/拆分成员、将状态设为 <code className="font-mono text-xs">merged</code> 后，访客可通过{" "}
          <code className="font-mono text-xs">/clusters/[slug]</code> 查看多源时间线 Hub（仅 merged 公开）。
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          阶段 C4：可在「编辑」中关联站内主文 <code className="font-mono text-xs">articles</code>；主文已发布后 Hub 的 canonical 收敛到主文，且该 Hub 不再单独进入 sitemap。
        </p>
        <p className="text-sm text-neutral-500 dark:text-neutral-500">
          暂无 cluster 记录时属正常；请先 normalize 再执行 cluster 桶化。
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300">
            <tr>
              <th className="px-3 py-3">slug</th>
              <th className="px-3 py-3">标题</th>
              <th className="px-3 py-3">状态</th>
              <th className="px-3 py-3">条目数</th>
              <th className="px-3 py-3">主 content_item</th>
              <th className="px-3 py-3">更新时间</th>
              <th className="px-3 py-3">操作</th>
              <th className="px-3 py-3">公开</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-neutral-600" colSpan={8}>
                  暂无 story_clusters 记录。
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr className="border-t border-neutral-100 dark:border-neutral-900" key={row.id}>
                  <td className="px-3 py-3 font-[family-name:var(--font-geist-mono)] text-xs">
                    {row.slug}
                  </td>
                  <td className="px-3 py-3">{row.title ?? "(无标题)"}</td>
                  <td className="px-3 py-3">{row.status}</td>
                  <td className="px-3 py-3">{formatCount(row.itemCount)}</td>
                  <td className="px-3 py-3 font-mono text-xs">
                    {row.primaryContentItemId ?? "-"}
                  </td>
                  <td className="px-3 py-3">{formatDt(row.updatedAt)}</td>
                  <td className="px-3 py-3">
                    <Link className="text-sm underline" href={`/admin/clusters/${row.id}`}>
                      编辑
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    {row.status === "merged" ? (
                      <Link
                        className="text-sm underline"
                        href={`/clusters/${row.slug}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        打开 Hub
                      </Link>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
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
