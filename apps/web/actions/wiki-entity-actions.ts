"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { EditorialFaqJson } from "@guge/db/schema";
import { wikiEntities } from "@guge/db/schema";
import { getDb } from "@guge/db";

import {
  formatZodError,
  optionalHttpsUrl,
  optionalText,
  requiredText,
  slugSchema,
} from "@/lib/articles/validation";
import { parseEditorialFaqFromFormData } from "@/lib/faq/editorial-faq";
import { assertAdminSession } from "@/lib/auth/session";
import {
  WIKI_BODY_MIN_PUBLISHED_LENGTH,
  WIKI_LEAD_MIN_PUBLISHED_LENGTH,
} from "@/lib/wiki/constants";

export type WikiEntityActionState =
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

function parseWikiBasics(formData: FormData): {
  status: "draft" | "published";
  slug: string;
  title: string;
  subtitle: string | null;
  lead: string;
  body: string | null;
  sourceUrl: string | null;
  editorialFaq: EditorialFaqJson | null;
} {
  const status = statusSchema.parse(
    (typeof formData.get("status") === "string" ?
      formData.get("status")
    : "draft"
    )!.toString().trim() || "draft"
  );

  const slug = slugSchema.parse(formData.get("slug"));
  const title = requiredText.parse(formData.get("title"));
  const subtitle = optionalText.parse(formData.get("subtitle"));
  const lead = (optionalText.parse(formData.get("lead")) ?? "").trim();
  const bodyRaw = optionalText.parse(formData.get("body"));
  const body = bodyRaw?.trim() ?? null;
  const sourceUrl = optionalHttpsUrl.parse(formData.get("source_url"));

  if (
    status === "published" &&
    lead.length < WIKI_LEAD_MIN_PUBLISHED_LENGTH
  ) {
    throw new z.ZodError([
      {
        code: "custom",
        message: `发布时导语至少 ${WIKI_LEAD_MIN_PUBLISHED_LENGTH} 字。`,
        path: ["lead"],
      },
    ]);
  }

  const bodyLen = body?.length ?? 0;
  if (status === "published" && bodyLen < WIKI_BODY_MIN_PUBLISHED_LENGTH) {
    throw new z.ZodError([
      {
        code: "custom",
        message:
          `发布时正文至少 ${WIKI_BODY_MIN_PUBLISHED_LENGTH} 字，避免程序化薄页。`,
        path: ["body"],
      },
    ]);
  }

  const editorialFaq = parseEditorialFaqFromFormData(formData);

  return {
    status,
    slug,
    title,
    subtitle,
    lead: lead.length ? lead : "",
    body,
    sourceUrl,
    editorialFaq,
  };
}

function revalidateWikiPaths(slug: string) {
  revalidatePath("/admin/wiki-entities");
  revalidatePath("/wiki");
  revalidatePath(`/wiki/${slug}`);
  revalidatePath("/sitemap.xml");
}

export async function createWikiEntityAction(
  _prevState: WikiEntityActionState | null,
  formData: FormData
): Promise<WikiEntityActionState> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  let parsed: ReturnType<typeof parseWikiBasics>;
  try {
    parsed = parseWikiBasics(formData);
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
      .insert(wikiEntities)
      .values({
        slug: parsed.slug,
        title: parsed.title,
        subtitle: parsed.subtitle,
        lead: parsed.lead || "",
        body: parsed.body,
        editorialFaq: parsed.editorialFaq,
        status: parsed.status,
        sourceUrl: parsed.sourceUrl,
        publishedAt,
      })
      .returning({ id: wikiEntities.id });

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

  revalidateWikiPaths(parsed.slug);
  redirect(`/admin/wiki-entities/${newId}/edit`);
}

export async function updateWikiEntityAction(
  entityId: string,
  _prevState: WikiEntityActionState | null,
  formData: FormData
): Promise<WikiEntityActionState> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  let parsed: ReturnType<typeof parseWikiBasics>;
  try {
    parsed = parseWikiBasics(formData);
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
    .from(wikiEntities)
    .where(eq(wikiEntities.id, entityId))
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
      .update(wikiEntities)
      .set({
        slug: parsed.slug,
        title: parsed.title,
        subtitle: parsed.subtitle,
        lead: parsed.lead || "",
        body: parsed.body,
        editorialFaq: parsed.editorialFaq,
        status: parsed.status,
        sourceUrl: parsed.sourceUrl,
        publishedAt,
      })
      .where(eq(wikiEntities.id, entityId));
  } catch (e: unknown) {
    if (isPgUniqueViolation(e)) {
      return { error: "slug 已被占用，请换一个。" };
    }
    console.error(e);
    return { error: "保存失败，请稍后重试。" };
  }

  revalidateWikiPaths(parsed.slug);

  const oldSlug = prevRow.slug;
  if (oldSlug !== parsed.slug) {
    revalidatePath(`/wiki/${oldSlug}`);
  }

  return {};
}

export async function deleteWikiEntityAction(
  entityId: string,
  slug: string
): Promise<void> {
  await assertAdminSession();
  const db = getDb();
  await db.delete(wikiEntities).where(eq(wikiEntities.id, entityId));
  revalidateWikiPaths(slug);
  redirect("/admin/wiki-entities");
}
