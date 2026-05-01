"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { calendarEvents } from "@guge/db/schema";
import { getDb } from "@guge/db";

import {
  CALENDAR_BODY_MIN_PUBLISHED_LENGTH,
  CALENDAR_LEAD_MIN_PUBLISHED_LENGTH,
} from "@/lib/calendar/constants";
import {
  parseUtcDatetimeLocal,
  parseUtcDayEnd,
  parseUtcDayStart,
} from "@/lib/calendar/datetime";
import {
  formatZodError,
  optionalHttpsUrl,
  optionalText,
  requiredText,
  slugSchema,
} from "@/lib/articles/validation";
import { assertAdminSession } from "@/lib/auth/session";

export type CalendarEventActionState =
  | { error?: undefined; fieldErrors?: undefined }
  | { error: string; fieldErrors?: Record<string, string> }
  | { error?: string; fieldErrors: Record<string, string> };

function isPgUniqueViolation(error: unknown): boolean {
  const walk = (e: unknown): boolean => {
    if (!e || typeof e !== "object") {
      return false;
    }
    const any = e as { code?: unknown; cause?: unknown };
    if (any.code === "23505") {
      return true;
    }
    if (typeof any.cause !== "undefined") {
      return walk(any.cause);
    }
    return false;
  };
  return walk(error);
}

const statusSchema = z.enum(["draft", "published"]);

function readAllDay(formData: FormData): boolean {
  return formData.get("all_day") === "on";
}

function parseCalendarBasics(formData: FormData) {
  const status = statusSchema.parse(
    (typeof formData.get("status") === "string" ?
      formData.get("status")
    : "draft"
    )!.toString().trim() || "draft"
  );

  const allDay = readAllDay(formData);

  const slug = slugSchema.parse(formData.get("slug"));
  const title = requiredText.parse(formData.get("title"));
  const lead = (optionalText.parse(formData.get("lead")) ?? "").trim();
  const body = optionalText.parse(formData.get("body"));
  const sourceUrl = optionalHttpsUrl.parse(formData.get("source_url"));

  let startsAt: Date;
  let endsAt: Date;

  if (allDay) {
    const startDate = requiredText.parse(formData.get("start_date"));
    const endDate = requiredText.parse(formData.get("end_date"));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "请使用合法的日期格式 YYYY-MM-DD。",
          path: ["start_date"],
        },
      ]);
    }
    startsAt = parseUtcDayStart(startDate);
    endsAt = parseUtcDayEnd(endDate);
    if (endsAt.getTime() < startsAt.getTime()) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "结束日不能早于开始日。",
          path: ["end_date"],
        },
      ]);
    }
  } else {
    const ss = requiredText.parse(formData.get("starts_at_utc"));
    const ee = requiredText.parse(formData.get("ends_at_utc"));
    try {
      startsAt = parseUtcDatetimeLocal(ss);
      endsAt = parseUtcDatetimeLocal(ee);
    } catch {
      throw new z.ZodError([
        {
          code: "custom",
          message:
            "时间须为 UTC，格式 YYYY-MM-DDTHH:mm（例 2026-05-01T08:30）。",
          path: ["starts_at_utc"],
        },
      ]);
    }
    if (endsAt.getTime() < startsAt.getTime()) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "结束时间不能早于开始时间。",
          path: ["ends_at_utc"],
        },
      ]);
    }
  }

  const leadTrim = lead;
  if (
    status === "published" &&
    leadTrim.length < CALENDAR_LEAD_MIN_PUBLISHED_LENGTH
  ) {
    throw new z.ZodError([
      {
        code: "custom",
        message: `发布时导语至少 ${CALENDAR_LEAD_MIN_PUBLISHED_LENGTH} 字。`,
        path: ["lead"],
      },
    ]);
  }

  const bodyTrim = typeof body === "string" ? body.trim() : "";
  if (
    status === "published" &&
    bodyTrim.length < CALENDAR_BODY_MIN_PUBLISHED_LENGTH
  ) {
    throw new z.ZodError([
      {
        code: "custom",
        message:
          `发布时正文至少 ${CALENDAR_BODY_MIN_PUBLISHED_LENGTH} 字，避免程序化薄页。`,
        path: ["body"],
      },
    ]);
  }

  return {
    status,
    allDay,
    slug,
    title,
    lead: leadTrim.length ? leadTrim : "",
    body: bodyTrim,
    sourceUrl,
    startsAt,
    endsAt,
  };
}

function revalidateCalendarPaths(slug: string) {
  revalidatePath("/admin/calendar-events");
  revalidatePath("/calendar");
  revalidatePath(`/calendar/${slug}`);
  revalidatePath("/calendar/feed");
  revalidatePath("/sitemap.xml");
}

export async function createCalendarEventAction(
  _prevState: CalendarEventActionState | null,
  formData: FormData
): Promise<CalendarEventActionState> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  let parsed: ReturnType<typeof parseCalendarBasics>;
  try {
    parsed = parseCalendarBasics(formData);
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return {
        error: "请修正表单。",
        fieldErrors: formatZodError(e),
      };
    }
    return { error: "表单校验失败。" };
  }

  const db = getDb();

  let newId: string | undefined;

  try {
    const publishedAt =
      parsed.status === "published" ? new Date() : null;

    const inserted = await db
      .insert(calendarEvents)
      .values({
        slug: parsed.slug,
        title: parsed.title,
        lead: parsed.lead || "",
        body: parsed.body,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        allDay: parsed.allDay,
        status: parsed.status,
        sourceUrl: parsed.sourceUrl,
        publishedAt,
      })
      .returning({ id: calendarEvents.id });

    newId = inserted[0]?.id;
  } catch (e: unknown) {
    if (isPgUniqueViolation(e)) {
      return { error: "slug 已被占用，请换一个。" };
    }
    console.error(e);
    return { error: "保存失败，请稍后重试。" };
  }

  if (!newId) {
    return { error: "写入成功但未返回 id（异常）。" };
  }

  revalidateCalendarPaths(parsed.slug);
  redirect(`/admin/calendar-events/${newId}/edit`);
}

export async function updateCalendarEventAction(
  eventId: string,
  _prevState: CalendarEventActionState | null,
  formData: FormData
): Promise<CalendarEventActionState> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  let parsed: ReturnType<typeof parseCalendarBasics>;
  try {
    parsed = parseCalendarBasics(formData);
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return {
        error: "请修正表单。",
        fieldErrors: formatZodError(e),
      };
    }
    return { error: "表单校验失败。" };
  }

  const db = getDb();

  const existing = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, eventId))
    .limit(1);

  const prevRow = existing[0];
  if (!prevRow) {
    return { error: "条目不存在或已被删除。" };
  }

  let publishedAt: Date | null;
  if (parsed.status === "published") {
    publishedAt = prevRow.publishedAt ?? new Date();
  } else {
    publishedAt = null;
  }

  try {
    await db
      .update(calendarEvents)
      .set({
        slug: parsed.slug,
        title: parsed.title,
        lead: parsed.lead || "",
        body: parsed.body,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        allDay: parsed.allDay,
        status: parsed.status,
        sourceUrl: parsed.sourceUrl,
        publishedAt,
      })
      .where(eq(calendarEvents.id, eventId));
  } catch (e: unknown) {
    if (isPgUniqueViolation(e)) {
      return { error: "slug 已被占用，请换一个。" };
    }
    console.error(e);
    return { error: "保存失败，请稍后重试。" };
  }

  revalidateCalendarPaths(parsed.slug);

  const oldSlug = prevRow.slug;
  if (oldSlug !== parsed.slug) {
    revalidatePath(`/calendar/${oldSlug}`);
  }

  return {};
}

export async function deleteCalendarEventAction(
  eventId: string,
  slug: string
): Promise<void> {
  await assertAdminSession();
  const db = getDb();
  await db.delete(calendarEvents).where(eq(calendarEvents.id, eventId));
  revalidateCalendarPaths(slug);
  redirect("/admin/calendar-events");
}
