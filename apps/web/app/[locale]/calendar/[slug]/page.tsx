import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { InferSelectModel } from "drizzle-orm";

import { calendarEvents } from "@guge/db/schema";

import { absoluteCalendarEventUrl } from "@/lib/articles/site";
import {
  formatUtcDatetimeLocalInput,
  utcYmdFromDate,
} from "@/lib/calendar/datetime";
import { getPublishedCalendarEventBySlug } from "@/lib/calendar/public-queries";
import type { AppLocale } from "@/lib/i18n/config";
import { isAppLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/paths";

type CalendarRecord = InferSelectModel<typeof calendarEvents>;

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug, locale: raw } = await props.params;
  const locale = isAppLocale(raw) ? raw : undefined;
  if (!locale) {
    return { title: "Calendar" };
  }

  let row: CalendarRecord | null = null;

  try {
    row = await getPublishedCalendarEventBySlug(slug, locale);
  } catch {
    return { title: "日历" };
  }

  if (!row) {
    return { title: "未找到" };
  }

  const title = `${row.title} · 日历`;
  const lead = row.lead.trim();
  const description =
    lead.length > 160 ? `${lead.slice(0, 157)}…`
    : lead.length > 0 ? lead
    : row.title;

  const canonical = absoluteCalendarEventUrl(row.slug, locale);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      description,
      siteName: "zimomo.fans",
    },
  };
}

export default async function CalendarEventDetailPage(props: PageProps) {
  const { slug, locale: raw } = await props.params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;

  let row: CalendarRecord | null = null;

  try {
    row = await getPublishedCalendarEventBySlug(slug, locale);
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 text-sm text-neutral-600">
        暂无数据库连接。
      </div>
    );
  }

  if (!row) {
    notFound();
  }

  const timeLabel = row.allDay ?
    <>
      UTC 全天：{" "}
      <span className="font-mono">
        {utcYmdFromDate(
          row.startsAt instanceof Date ? row.startsAt : new Date(row.startsAt)
        )}{" "}
        —{" "}
        {utcYmdFromDate(
          row.endsAt instanceof Date ? row.endsAt : new Date(row.endsAt)
        )}
      </span>
    </>
  : <>
      UTC：{" "}
      <span className="font-mono">
        {formatUtcDatetimeLocalInput(
          row.startsAt instanceof Date ? row.startsAt : new Date(row.startsAt)
        )}
      </span>{" "}
      —{" "}
      <span className="font-mono">
        {formatUtcDatetimeLocalInput(
          row.endsAt instanceof Date ? row.endsAt : new Date(row.endsAt)
        )}
      </span>
    </>;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-14">
      <header className="space-y-4 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <nav className="text-sm text-neutral-600 dark:text-neutral-400">
          <Link className="underline" href={localePath(locale, "/calendar")}>
            日历
          </Link>
          <span className="mx-2">/</span>
          <span className="text-neutral-500">{row.slug}</span>
        </nav>
        <h1 className="text-3xl font-semibold tracking-tight">{row.title}</h1>
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{row.lead}</p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{timeLabel}</p>
        {row.sourceUrl?.trim() ?
          <p className="text-sm">
            <span className="text-neutral-500">来源：</span>
            <a
              className="break-all text-emerald-700 underline dark:text-emerald-400"
              href={row.sourceUrl.trim()}
              rel="noopener noreferrer"
              target="_blank"
            >
              {row.sourceUrl.trim()}
            </a>
          </p>
        : null}
        <p className="text-xs text-neutral-500">
          本站为粉丝自建资讯，非品牌官网；事实性信息请交叉核对来源。
        </p>
      </header>

      {row.body?.trim() ?
        <article className="prose prose-neutral max-w-none text-sm dark:prose-invert">
          <div className="whitespace-pre-wrap">{row.body.trim()}</div>
        </article>
      : null}

      <footer className="border-t border-neutral-200 pt-6 text-sm dark:border-neutral-800">
        <Link className="underline" href={localePath(locale, "/calendar")}>
          返回日历
        </Link>
      </footer>
    </div>
  );
}
