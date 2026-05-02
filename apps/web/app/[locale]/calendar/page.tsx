import type { Metadata } from "next";
import Link from "next/link";

import {
  formatUtcDatetimeLocalInput,
  utcMonthBounds,
  utcYmdFromDate,
} from "@/lib/calendar/datetime";
import {
  listPublishedCalendarEventsOverlappingRange,
} from "@/lib/calendar/public-queries";
import { getSiteOrigin } from "@/lib/articles/site";
import type { AppLocale } from "@/lib/i18n/config";
import { isAppLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/paths";
import { notFound } from "next/navigation";

/** 使用 `?month=YYYY-MM` 时需动态渲染；页级 `revalidate` 与兄弟动态段在 Next 16 下触发 segment 校验错误，故不设 ISR。后台保存会 `revalidatePath`。 */
export const metadata: Metadata = {
  title: "日历",
  description:
    "非官方 POP MART / THE MONSTERS 粉丝自建活动与时间线节选；请以来源链接核验。",
};

/** `searchParams`/月视图为动态路由，避免构建阶段误判为静态预渲染 */
export const dynamic = "force-dynamic";

type Search = { month?: string | string[] | undefined };

function parseMonthParam(raw: string | undefined): { y: number; m: number } {
  const d = new Date();
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth() + 1;
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [yy, mm] = raw.split("-").map(Number);
    if (
      Number.isFinite(yy) &&
      Number.isFinite(mm) &&
      mm >= 1 &&
      mm <= 12 &&
      yy >= 1970 &&
      yy <= 2100
    ) {
      y = yy;
      m = mm;
    }
  }
  return { y, m };
}

function ym(y: number, month: number) {
  return `${y}-${String(month).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, delta: number) {
  const t = new Date(Date.UTC(year, month - 1 + delta, 1));
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth() + 1,
  };
}

export default async function CalendarPage(props: {
  searchParams: Promise<Search>;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await props.params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;

  const sp = await props.searchParams;
  const rawMonth = typeof sp.month === "string" ? sp.month : undefined;

  const { y, m } = parseMonthParam(rawMonth);
  const { monthStart, monthEnd } = utcMonthBounds(y, m);

  let rows: Awaited<ReturnType<typeof listPublishedCalendarEventsOverlappingRange>> =
    [];

  try {
    rows = await listPublishedCalendarEventsOverlappingRange(
      monthStart,
      monthEnd,
      locale
    );
  } catch {
    /* 构建或未连 DB：空列表由 UI 兜底 */
  }

  const prev = shiftMonth(y, m, -1);
  const next = shiftMonth(y, m, 1);
  const monthHeading = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(monthStart);

  const feedUrl = `${getSiteOrigin()}/calendar/feed.ics`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-14">
      <header className="space-y-3 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <h1 className="text-2xl font-semibold tracking-tight">日历</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          非官方自建资讯站节选的活动与档期（UTC）。请以各活动来源链接核验；本站不代表品牌方。
        </p>
        <p className="text-sm font-medium">
          <a
            className="text-emerald-700 underline hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
            href="/calendar/feed.ics"
          >
            订阅 ICS
          </a>
          <span className="ml-2 text-xs font-normal text-neutral-500">{feedUrl}</span>
        </p>
      </header>

      <nav className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            href={`${localePath(locale, "/calendar")}?month=${ym(prev.y, prev.m)}`}
          >
            上一月
          </Link>
          <Link
            className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            href={`${localePath(locale, "/calendar")}?month=${ym(next.y, next.m)}`}
          >
            下一月
          </Link>
          <Link
            className="rounded-md px-3 py-1.5 underline text-neutral-600 dark:text-neutral-400"
            href={localePath(locale, "/calendar")}
          >
            本月（UTC）
          </Link>
        </div>
        <span className="text-neutral-600 dark:text-neutral-400">{monthHeading}</span>
      </nav>

      <section>
        <h2 className="sr-only">本月活动</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            本月暂无已发布活动。{" "}
            <Link
              className="underline"
              href={`${localePath(locale, "/calendar")}?month=${ym(next.y, next.m)}`}
            >
              查看下一月
            </Link>
            或通过 ICS 持续关注。
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {rows.map((row) => (
              <li key={row.id}>
                <article className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-medium">
                      <Link
                        className="hover:underline"
                        href={localePath(locale, `/calendar/${row.slug}`)}
                      >
                        {row.title}
                      </Link>
                    </h3>
                    <span className="font-mono text-xs text-neutral-500">
                      {row.allDay ?
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
                          <span className="text-neutral-400">全日 UTC</span>
                        </>
                      : <>
                          {formatUtcDatetimeLocalInput(
                            row.startsAt instanceof Date ?
                              row.startsAt
                            : new Date(row.startsAt)
                          ).replace("T", " ")}{" "}
                          UTC
                        </>
                      }
                    </span>
                  </div>
                  {row.lead ? (
                    <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                      {row.lead}
                    </p>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
