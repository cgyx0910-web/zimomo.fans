import type { Metadata } from "next";
import Link from "next/link";

import { listCalendarEventsAdmin } from "@/lib/calendar/queries";
import { utcYmdFromDate, formatUtcDatetimeLocalInput } from "@/lib/calendar/datetime";

export const metadata: Metadata = {
  title: "日历 · 后台",
};

function tsCell(d: Date | string): string {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) {
    return "-";
  }
  return formatUtcDatetimeLocalInput(x).replace("T", " ");
}

export default async function AdminCalendarEventsPage() {
  const rows = await listCalendarEventsAdmin();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">活动日历</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            阶段 E1：后台录入发布后展示于前台日历与 ICS；非官方时间表，请以来源链接为准。
          </p>
        </div>
        <Link
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
          href="/admin/calendar-events/new"
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
              <th className="px-3 py-2 font-medium">开始 UTC</th>
              <th className="px-3 py-2 font-medium">状态</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-neutral-500" colSpan={5}>
                  暂无条目。点击「新建条目」录入。
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  className="border-t border-neutral-100 dark:border-neutral-800"
                  key={row.id}
                >
                  <td className="px-3 py-2 font-mono text-xs">{row.slug}</td>
                  <td className="max-w-[14rem] truncate px-3 py-2" title={row.title}>
                    {row.title}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                    {row.allDay ? (
                      <>
                        {utcYmdFromDate(
                          row.startsAt instanceof Date ?
                            row.startsAt
                          : new Date(row.startsAt)
                        )}{" "}
                        —{" "}
                        {utcYmdFromDate(
                          row.endsAt instanceof Date ?
                            row.endsAt
                          : new Date(row.endsAt)
                        )}{" "}
                        <span className="text-neutral-400">全日</span>
                      </>
                    ) : (
                      tsCell(row.startsAt)
                    )}
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <Link
                      className="font-medium underline"
                      href={`/admin/calendar-events/${row.id}/edit`}
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
        <Link className="ml-1 underline" href="/calendar">
          /calendar
        </Link>
      </p>
    </div>
  );
}
