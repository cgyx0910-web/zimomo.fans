import type { Metadata } from "next";
import Link from "next/link";

import { listWikiEntitiesAdmin } from "@/lib/wiki/queries";

export const metadata: Metadata = {
  title: "百科 · 后台",
};

export default async function AdminWikiEntitiesPage() {
  const rows = await listWikiEntitiesAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">百科条目</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            阶段 E2：编辑器维护长青档案页；发布后进入 /wiki、sitemap。
          </p>
        </div>
        <Link
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          href="/admin/wiki-entities/new"
        >
          新建条目
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
            <tr>
              <th className="px-3 py-2 font-medium">slug</th>
              <th className="px-3 py-2 font-medium">标题</th>
              <th className="px-3 py-2 font-medium">状态</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-neutral-500" colSpan={4}>
                  暂无条目。
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  className="border-t border-neutral-100 dark:border-neutral-800"
                  key={row.id}
                >
                  <td className="px-3 py-2 font-mono text-xs">{row.slug}</td>
                  <td className="max-w-[18rem] truncate px-3 py-2" title={row.title}>
                    {row.title}
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <Link
                      className="font-medium underline"
                      href={`/admin/wiki-entities/${row.id}/edit`}
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

      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        前台预览：
        <Link className="ml-1 underline" href="/wiki">
          /wiki
        </Link>
      </p>
    </div>
  );
}
