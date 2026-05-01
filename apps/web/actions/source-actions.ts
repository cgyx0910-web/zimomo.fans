"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@guge/db";
import { sources } from "@guge/db/schema";

import { runRssIngest } from "@/lib/ingest/rss";
import { assertAdminSession } from "@/lib/auth/session";
import {
  formatSourceFieldErrors,
  sourceFeedUrlSchema,
  sourceNameSchema,
} from "@/lib/sources/validation";

export type SourceActionState =
  | { error?: undefined; fieldErrors?: undefined }
  | { error: string; fieldErrors?: Record<string, string> }
  | { error?: string; fieldErrors: Record<string, string> };

function parseBoolean(input: FormDataEntryValue | null): boolean {
  return String(input ?? "") === "true";
}

function isUniqueViolation(error: unknown): boolean {
  const current = error as { code?: unknown; cause?: unknown } | undefined;
  if (!current || typeof current !== "object") {
    return false;
  }
  if (current.code === "23505") {
    return true;
  }
  if (typeof current.cause !== "undefined") {
    return isUniqueViolation(current.cause);
  }
  return false;
}

export async function createSourceAction(
  _prevState: SourceActionState | null,
  formData: FormData
): Promise<SourceActionState> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  let parsed: { name: string; feedUrl: string };
  try {
    const parsedUnknown = z
      .object({
        name: sourceNameSchema,
        feedUrl: sourceFeedUrlSchema,
      })
      .parse({
        name: formData.get("name"),
        feedUrl: formData.get("feed_url"),
      });
    parsed = {
      name: String(parsedUnknown.name),
      feedUrl: String(parsedUnknown.feedUrl),
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: "请修正表单。",
        fieldErrors: formatSourceFieldErrors(error),
      };
    }
    return { error: "表单校验失败。" };
  }

  const db = getDb();
  try {
    await db.insert(sources).values({
      name: parsed.name,
      feedUrl: parsed.feedUrl,
      isActive: true,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "该 feed URL 已存在于白名单。" };
    }
    console.error(error);
    return { error: "来源保存失败，请稍后重试。" };
  }

  revalidatePath("/admin/sources");
  return {};
}

export async function toggleSourceActiveAction(formData: FormData): Promise<void> {
  await assertAdminSession();

  const sourceId = String(formData.get("source_id") ?? "");
  const nextActive = parseBoolean(formData.get("next_active"));
  if (!sourceId) {
    throw new Error("source_id is required");
  }

  const db = getDb();
  await db
    .update(sources)
    .set({ isActive: nextActive })
    .where(eq(sources.id, sourceId));

  revalidatePath("/admin/sources");
}

export async function runIngestNowAction(): Promise<
  { error: string } | { summary: Awaited<ReturnType<typeof runRssIngest>> }
> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  try {
    const summary = await runRssIngest();
    revalidatePath("/admin/sources");
    revalidatePath("/admin/raw-documents");
    return { summary };
  } catch (error) {
    console.error(error);
    return { error: "执行 ingest 失败，请稍后重试。" };
  }
}
