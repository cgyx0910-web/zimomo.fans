"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { calendarEvents } from "@guge/db/schema";

import {
  createCalendarEventAction,
  deleteCalendarEventAction,
  updateCalendarEventAction,
  type CalendarEventActionState,
} from "@/actions/calendar-event-actions";
import {
  CALENDAR_BODY_MIN_PUBLISHED_LENGTH,
  CALENDAR_LEAD_MIN_PUBLISHED_LENGTH,
} from "@/lib/calendar/constants";
import {
  formatUtcDatetimeLocalInput,
  utcTodayYmd,
  utcYmdFromDate,
} from "@/lib/calendar/datetime";

export type CalendarEventRow = typeof calendarEvents.$inferSelect;

export type CalendarEventFormValues = {
  slug: string;
  title: string;
  lead: string;
  body: string;
  allDay: boolean;
  startDate: string;
  endDate: string;
  startsAtUtc: string;
  endsAtUtc: string;
  sourceUrl: string;
  status: "draft" | "published";
};

export function emptyCalendarEventDefaults(): CalendarEventFormValues {
  const ymd = utcTodayYmd();
  return {
    slug: "",
    title: "",
    lead: "",
    body: "",
    allDay: true,
    startDate: ymd,
    endDate: ymd,
    startsAtUtc: `${ymd}T12:00`,
    endsAtUtc: `${ymd}T13:00`,
    sourceUrl: "",
    status: "draft",
  };
}

export function calendarRowToFormDefaults(row: CalendarEventRow): CalendarEventFormValues {
  const s = row.startsAt instanceof Date ? row.startsAt : new Date(row.startsAt);
  const e = row.endsAt instanceof Date ? row.endsAt : new Date(row.endsAt);

  const ymdS = utcYmdFromDate(s);
  const ymdE = utcYmdFromDate(e);

  return {
    slug: row.slug,
    title: row.title,
    lead: row.lead,
    body: row.body ?? "",
    allDay: row.allDay,
    startDate: ymdS,
    endDate: ymdE,
    startsAtUtc: formatUtcDatetimeLocalInput(s),
    endsAtUtc: formatUtcDatetimeLocalInput(e),
    sourceUrl: row.sourceUrl ?? "",
    status: row.status === "published" ? "published" : "draft",
  };
}

function Feedback({ state }: { state: CalendarEventActionState | null }) {
  if (!state) {
    return null;
  }

  const fieldEntries = Object.entries(state.fieldErrors ?? {});

  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      {state.error ? (
        <p className="font-medium">{state.error}</p>
      ) : null}

      {fieldEntries.length ? (
        <ul className="list-disc space-y-1 pl-5">
          {fieldEntries.map(([key, msg]) => (
            <li key={key}>
              <span className="font-medium">{key}</span>: {msg}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Fields({
  defaults,
  allDay,
  onAllDayChange,
}: {
  defaults: CalendarEventFormValues;
  allDay: boolean;
  onAllDayChange: (v: boolean) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">slug</span>
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="slug"
          required
          defaultValue={defaults.slug}
          placeholder="labubu-paris-popup-2026"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="text-xs text-neutral-500">
          小写字母、数字与中划线。
        </span>
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">标题</span>
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="title"
          required
          defaultValue={defaults.title}
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">导语（对外 SEO）</span>
        <textarea
          className="min-h-20 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="lead"
          defaultValue={defaults.lead}
          placeholder={`发布后至少 ${CALENDAR_LEAD_MIN_PUBLISHED_LENGTH} 字`}
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">
          正文（发布至少 {CALENDAR_BODY_MIN_PUBLISHED_LENGTH} 字；草稿可不填）
        </span>
        <textarea
          className="min-h-40 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="body"
          defaultValue={defaults.body}
          placeholder={`发布后至少 ${CALENDAR_BODY_MIN_PUBLISHED_LENGTH} 字`}
        />
      </label>

      <label className="flex items-center gap-2 md:col-span-2">
        <input
          checked={allDay}
          className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600"
          name="all_day"
          onChange={(ev) => onAllDayChange(ev.target.checked)}
          type="checkbox"
        />
        <span className="text-sm font-medium">全天（按 UTC 日历日）</span>
      </label>

      {allDay ? (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">开始日（UTC）</span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              name="start_date"
              required={allDay}
              defaultValue={defaults.startDate}
              type="date"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">结束日（UTC，含）</span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              name="end_date"
              required={allDay}
              defaultValue={defaults.endDate}
              type="date"
            />
          </label>
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm font-medium">
              开始时间（UTC，YYYY-MM-DDTHH:mm）
            </span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm dark:border-neutral-700"
              name="starts_at_utc"
              required={!allDay}
              defaultValue={defaults.startsAtUtc}
              placeholder="2026-06-01T14:00"
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm font-medium">
              结束时间（UTC，YYYY-MM-DDTHH:mm）
            </span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm dark:border-neutral-700"
              name="ends_at_utc"
              required={!allDay}
              defaultValue={defaults.endsAtUtc}
              placeholder="2026-06-01T16:00"
            />
          </label>
          <p className="text-xs text-neutral-500 md:col-span-2">
            请将时间理解为 UTC（与爬虫/聚合一致）；非全天活动请在此处填写确切时刻。
          </p>
        </>
      )}

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">来源 URL（可选，HTTPS）</span>
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="source_url"
          defaultValue={defaults.sourceUrl}
          placeholder="https://..."
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">状态</span>
        <select
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          defaultValue={defaults.status}
          name="status"
        >
          <option value="draft">草稿</option>
          <option value="published">已发布（进 sitemap / 日历）</option>
        </select>
      </label>
    </div>
  );
}

export function CreateCalendarEventForm() {
  const defaults = useMemo(() => emptyCalendarEventDefaults(), []);
  const [allDay, setAllDay] = useState(defaults.allDay);
  const [state, action, pending] = useActionState(
    createCalendarEventAction,
    null
  );

  return (
    <form action={action} className="space-y-6">
      <Feedback state={state} />
      <Fields allDay={allDay} defaults={defaults} onAllDayChange={setAllDay} />

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          disabled={pending}
          type="submit"
        >
          {pending ? "保存中…" : "保存"}
        </button>

        <Link
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
          href="/admin/calendar-events"
        >
          取消
        </Link>
      </div>
    </form>
  );
}

export function EditCalendarEventForm(props: {
  eventId: string;
  defaults: CalendarEventFormValues;
}) {
  const [allDay, setAllDay] = useState(props.defaults.allDay);

  const boundAction = useMemo(
    () => (prev: CalendarEventActionState | null, formData: FormData) =>
      updateCalendarEventAction(props.eventId, prev, formData),
    [props.eventId]
  );

  const [state, action, pending] = useActionState(boundAction, null);

  return (
    <form action={action} className="space-y-6">
      <Feedback state={state} />
      <Fields
        allDay={allDay}
        defaults={props.defaults}
        onAllDayChange={setAllDay}
      />

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          disabled={pending}
          type="submit"
        >
          {pending ? "保存中…" : "保存修改"}
        </button>

        <Link
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
          href="/admin/calendar-events"
        >
          返回列表
        </Link>
      </div>
    </form>
  );
}

export function DeleteCalendarEventButton(props: { eventId: string; slug: string }) {
  return (
    <form
      action={deleteCalendarEventAction.bind(
        null,
        props.eventId,
        props.slug
      )}
      className="inline"
    >
      <button
        className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-800 hover:bg-red-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40"
        type="submit"
      >
        删除此条目
      </button>
    </form>
  );
}
