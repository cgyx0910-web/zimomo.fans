import type { Metadata } from "next";

import { CreateCalendarEventForm } from "@/components/admin/calendar-event-form";

export const metadata: Metadata = {
  title: "新建日历条目 · 后台",
};

export default function NewCalendarEventPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">新建日历条目</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          发布后进入前台、sitemap 与 ICS 订阅范围；请以 UTC 录入时间或使用全天日期区间。
        </p>
      </div>

      <CreateCalendarEventForm />
    </div>
  );
}
