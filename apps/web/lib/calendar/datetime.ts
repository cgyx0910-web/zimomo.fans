/** `YYYY-MM-DD`（UTC 日历日） */
export function utcTodayYmd(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 表单 `datetime-local` 风格：`YYYY-MM-DDTHH:mm`（UTC） */
export function formatUtcDatetimeLocalInput(d: Date): string {
  const x = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}T${pad(x.getUTCHours())}:${pad(x.getUTCMinutes())}`;
}

export function utcYmdFromDate(d: Date): string {
  const x = new Date(d);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${x.getUTCFullYear()}-${pad(x.getUTCMonth() + 1)}-${pad(x.getUTCDate())}`;
}

/** 解析表单 `YYYY-MM-DD` → 当日 00:00:00.000 UTC */
export function parseUtcDayStart(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) {
    throw new Error("bad_date");
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!mo || mo > 12 || !d || d > 31) {
    throw new Error("bad_date");
  }
  const t = Date.UTC(y, mo - 1, d, 0, 0, 0, 0);
  return new Date(t);
}

/** 解析表单 `YYYY-MM-DD` → 当日 23:59:59.999 UTC（含整日） */
export function parseUtcDayEnd(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) {
    throw new Error("bad_date");
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d, 23, 59, 59, 999);
  return new Date(t);
}

/** `YYYY-MM-DDTHH:mm` 按 UTC 解析 */
export function parseUtcDatetimeLocal(s: string): Date {
  const m =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) {
    throw new Error("bad_datetime");
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const min = Number(m[5]);
  return new Date(Date.UTC(y, mo - 1, d, h, min, 0, 0));
}

/** `year`/`month`（1–12）对应的 UTC 月起止，用于日历月视图查询 */
export function utcMonthBounds(year: number, month: number): {
  monthStart: Date;
  monthEnd: Date;
} {
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return { monthStart, monthEnd };
}
