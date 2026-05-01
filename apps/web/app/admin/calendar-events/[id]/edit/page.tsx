import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  calendarRowToFormDefaults,
  DeleteCalendarEventButton,
  EditCalendarEventForm,
} from "@/components/admin/calendar-event-form";
import { getCalendarEventById } from "@/lib/calendar/queries";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `编辑日历 ${params.id} · 后台`,
  };
}

export default async function EditCalendarEventPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const row = await getCalendarEventById(params.id);
  if (!row) {
    notFound();
  }

  const defaults = calendarRowToFormDefaults(row);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">编辑日历条目</h1>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          id: <span className="font-mono">{row.id}</span>
        </p>
      </div>

      <EditCalendarEventForm defaults={defaults} eventId={row.id} />

      <div className="flex flex-wrap items-center gap-6 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <DeleteCalendarEventButton eventId={row.id} slug={row.slug} />
        <Link
          className="text-sm text-neutral-600 underline dark:text-neutral-400"
          href="/calendar"
          rel="noopener noreferrer"
          target="_blank"
        >
          访客视图（若为已发布）
        </Link>
      </div>
    </div>
  );
}
