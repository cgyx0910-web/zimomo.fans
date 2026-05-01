import type { InferSelectModel } from "drizzle-orm";

import { calendarEvents } from "@guge/db/schema";

import { absoluteCalendarEventUrl, getSiteOrigin } from "@/lib/articles/site";

export type CalendarEventIcsRow = InferSelectModel<typeof calendarEvents>;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** yyyyMMdd in UTC calendar */
function utcYyyymmdd(d: Date): string {
  const x = new Date(d);
  const y = x.getUTCFullYear();
  const m = x.getUTCMonth() + 1;
  const day = x.getUTCDate();
  return `${y}${pad2(m)}${pad2(day)}`;
}

/**
 * ICS 日历日结束为「不包含」次日；数据库存的为含结束日的整日边界（23:59:59.999 UTC）。
 */
function exclusiveEndCalendarDateUtc(endsAt: Date): string {
  const x = new Date(endsAt);
  const next = Date.UTC(
    x.getUTCFullYear(),
    x.getUTCMonth(),
    x.getUTCDate() + 1,
    0,
    0,
    0,
    0
  );
  return utcYyyymmdd(new Date(next));
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function foldLine(line: string): string {
  const max = 73;
  if (line.length <= max) {
    return line;
  }
  const parts: string[] = [];
  let rest = line;
  while (rest.length > max) {
    parts.push(rest.slice(0, max));
    rest = ` ${rest.slice(max)}`;
  }
  if (rest.length) {
    parts.push(rest.trimStart());
  }
  return parts.join("\r\n ");
}

/** UTC 瞬时 → `YYYYMMDDTHHmmss` + `Z` */
function utcDateTimeStamp(d: Date): string {
  const x = new Date(d);
  return (
    `${x.getUTCFullYear()}${pad2(x.getUTCMonth() + 1)}${pad2(x.getUTCDate())}T` +
    `${pad2(x.getUTCHours())}${pad2(x.getUTCMinutes())}${pad2(x.getUTCSeconds())}Z`
  );
}

function buildUid(slug: string): string {
  let host = "localhost";
  try {
    const o = getSiteOrigin();
    host = new URL(o).host || host;
  } catch {
    /* keep default */
  }
  return `${slug}@${host}`;
}

export function buildIcsCalendarDocument(rows: CalendarEventIcsRow[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "PRODID:-//zimomo.fans//Calendar//ZH",
    "X-WR-CALNAME:zimomo.fans calendar",
    "METHOD:PUBLISH",
  ];

  const nowStamp = utcDateTimeStamp(new Date());

  for (const row of rows) {
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${escapeText(buildUid(row.slug))}`);
    lines.push(`DTSTAMP:${nowStamp}`);

    const start =
      row.startsAt instanceof Date ? row.startsAt : new Date(row.startsAt);
    const end =
      row.endsAt instanceof Date ? row.endsAt : new Date(row.endsAt);

    if (row.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${utcYyyymmdd(start)}`);
      lines.push(`DTEND;VALUE=DATE:${exclusiveEndCalendarDateUtc(end)}`);
    } else {
      lines.push(`DTSTART:${utcDateTimeStamp(start)}`);
      lines.push(`DTEND:${utcDateTimeStamp(end)}`);
    }

    lines.push(foldLine(`SUMMARY:${escapeText(row.title)}`));

    const detailUrl = absoluteCalendarEventUrl(row.slug);
    const descParts = [row.lead.trim(), `详情 ${detailUrl}`];
    const desc = escapeText(descParts.filter(Boolean).join("\\n"));

    lines.push(foldLine(`DESCRIPTION:${desc}`));

    const urlHref = row.sourceUrl?.trim() || detailUrl;
    lines.push(foldLine(`URL:${escapeText(urlHref)}`));

    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return lines.join("\r\n") + "\r\n";
}
