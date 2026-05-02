"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { EditorialFaqJson } from "@guge/db/schema";
import { articleTags, articles, tags } from "@guge/db/schema";
import { getDb } from "@guge/db";

import {
  formatZodError,
  httpsRequired,
  optionalHttpsUrl,
  optionalText,
  requiredText,
  slugSchema,
} from "@/lib/articles/validation";
import { assertAdminSession } from "@/lib/auth/session";
import type { ArticleWorkflowStatus } from "@/lib/articles/workflow";
import { parseArticleWorkflowStatusFromForm } from "@/lib/articles/workflow";
import { parseEditorialFaqFromFormData } from "@/lib/faq/editorial-faq";
import { appendQualityGateOverrideEvent, runArticlePublishQualityGate } from "@/lib/quality-gate";
import { revalidateArticlePublicPaths } from "@/lib/i18n/revalidate-public";

export type ArticleActionState =
  | { error?: undefined; fieldErrors?: undefined }
  | { error: string; fieldErrors?: Record<string, string> }
  | { error?: string; fieldErrors: Record<string, string> };

function readStatus(formData: FormData): ArticleWorkflowStatus {
  return parseArticleWorkflowStatusFromForm(formData);
}

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

const articleLocaleSchema = z.enum(["zh-CN", "en"]);

type ParsedBasics = {
  slug: string;
  locale: z.infer<typeof articleLocaleSchema>;
  title: string | null;
  excerpt: string | null;
  body: string | null;
  canonicalUrl: string | null;
  primarySourceUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  tagSlugs: string[];
  editorialFaq: EditorialFaqJson | null;
};

function parseTagSlugs(value: FormDataEntryValue | null): string[] {
  if (typeof value !== "string") {
    return [];
  }

  const unique = new Set<string>();
  for (const chunk of value.split(",")) {
    const slug = chunk.trim().toLowerCase();
    if (!slug) {
      continue;
    }
    if (!/^[a-z0-9-]{1,48}$/.test(slug)) {
      throw new z.ZodError([
        {
          code: "custom",
          message: "tags 仅允许小写字母、数字、中划线，长度 1-48。",
          path: ["tags"],
        },
      ]);
    }
    unique.add(slug);
  }
  return Array.from(unique);
}

async function syncArticleTags(
  articleId: string,
  tagSlugs: string[]
): Promise<void> {
  const db = getDb();

  await db.delete(articleTags).where(eq(articleTags.articleId, articleId));
  if (tagSlugs.length === 0) {
    return;
  }

  await db
    .insert(tags)
    .values(tagSlugs.map((slug) => ({ slug, label: slug })))
    .onConflictDoNothing({ target: tags.slug });

  const tagRows = await db
    .select({ id: tags.id })
    .from(tags)
    .where(inArray(tags.slug, tagSlugs));

  if (tagRows.length === 0) {
    return;
  }

  await db
    .insert(articleTags)
    .values(tagRows.map((row) => ({ articleId, tagId: row.id })))
    .onConflictDoNothing();
}

function parseDraft(formData: FormData): Omit<ParsedBasics, "editorialFaq"> {
  return {
    slug: slugSchema.parse(String(formData.get("slug") ?? "")),
    locale: articleLocaleSchema.parse(
      String(formData.get("locale") ?? "zh-CN").trim() || "zh-CN"
    ),
    title: optionalText.parse(formData.get("title")),
    excerpt: optionalText.parse(formData.get("excerpt")),
    body: optionalText.parse(formData.get("body")),
    canonicalUrl: optionalText.parse(formData.get("canonical_url")),
    primarySourceUrl: optionalText.parse(formData.get("primary_source_url")),
    ogTitle: optionalText.parse(formData.get("og_title")),
    ogDescription: optionalText.parse(formData.get("og_description")),
    ogImageUrl: optionalHttpsUrl.parse(formData.get("og_image_url")),
    tagSlugs: parseTagSlugs(formData.get("tags")),
  };
}

function parsePublished(formData: FormData): Omit<ParsedBasics, "editorialFaq"> {
  return {
    slug: slugSchema.parse(String(formData.get("slug") ?? "")),
    locale: articleLocaleSchema.parse(
      String(formData.get("locale") ?? "zh-CN").trim() || "zh-CN"
    ),
    title: requiredText.parse(String(formData.get("title") ?? "")),
    excerpt: optionalText.parse(formData.get("excerpt")),
    body: requiredText.parse(String(formData.get("body") ?? "")),
    canonicalUrl: httpsRequired.parse(String(formData.get("canonical_url") ?? "")),
    primarySourceUrl: httpsRequired.parse(
      String(formData.get("primary_source_url") ?? "")
    ),
    ogTitle: optionalText.parse(formData.get("og_title")),
    ogDescription: optionalText.parse(formData.get("og_description")),
    ogImageUrl: optionalHttpsUrl.parse(formData.get("og_image_url")),
    tagSlugs: parseTagSlugs(formData.get("tags")),
  };
}

function parseArticleFields(
  status: ArticleWorkflowStatus,
  formData: FormData
): Omit<ParsedBasics, "editorialFaq"> {
  return status === "published" ? parsePublished(formData) : parseDraft(formData);
}

function parseArticleFormDataComplete(formData: FormData): {
  status: ArticleWorkflowStatus;
  parsed: ParsedBasics;
} {
  const status = readStatus(formData);
  const base = parseArticleFields(status, formData);
  const editorialFaq = parseEditorialFaqFromFormData(formData);
  return { status, parsed: { ...base, editorialFaq } };
}

export async function createArticleAction(
  _prevState: ArticleActionState | null,
  formData: FormData
): Promise<ArticleActionState> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  let status: ArticleWorkflowStatus;
  let parsed: ParsedBasics;
  try {
    const out = parseArticleFormDataComplete(formData);
    status = out.status;
    parsed = out.parsed;
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return {
        error: "请修正表单。",
        fieldErrors: formatZodError(e),
      };
    }
    return { error: "表单校验失败。" };
  }

  let gateBypassed = false;
  if (status === "published") {
    const gate = await runArticlePublishQualityGate(
      {
        slug: parsed.slug,
        primarySourceUrl: parsed.primarySourceUrl ?? "",
        body: parsed.body ?? "",
        canonicalUrl: parsed.canonicalUrl ?? "",
      },
      formData
    );
    if (!gate.ok) {
      return {
        error: "质检未通过，请根据下列字段修正后重试。",
        fieldErrors: gate.fieldErrors,
      };
    }
    gateBypassed = gate.bypassedByOverride;
  }

  const db = getDb();

  let newId: string | undefined;

  try {
    const publishedAt = status === "published" ? new Date() : null;

    const inserted = await db
      .insert(articles)
      .values({
        slug: parsed.slug,
        locale: parsed.locale,
        title: parsed.title,
        excerpt: parsed.excerpt,
        body: parsed.body,
        status,
        canonicalUrl: parsed.canonicalUrl,
        primarySourceUrl: parsed.primarySourceUrl,
        ogTitle: parsed.ogTitle,
        ogDescription: parsed.ogDescription,
        ogImageUrl: parsed.ogImageUrl,
        editorialFaq: parsed.editorialFaq,
        publishedAt,
      })
      .returning({ id: articles.id });

    newId = inserted[0]?.id;
  } catch (e: unknown) {
    if (isPgUniqueViolation(e)) {
      return { error: "该 slug 在当前语言版本中已存在，请更换 slug 或语言。" };
    }
    console.error(e);
    return { error: "保存失败，请稍后重试。" };
  }

  if (!newId) {
    return { error: "写入成功但未返回 id（异常）。" };
  }

  try {
    await syncArticleTags(newId, parsed.tagSlugs);
  } catch (e) {
    console.error(e);
    return { error: "标签保存失败，请稍后重试。" };
  }

  if (status === "published" && gateBypassed && newId) {
    try {
      await appendQualityGateOverrideEvent(newId, parsed.slug);
    } catch (e) {
      console.error(e);
    }
  }

  revalidatePath("/admin");
  revalidateArticlePublicPaths(parsed.slug);
  if (status === "published") {
    revalidatePath("/sitemap.xml");
  }
  redirect(`/admin/articles/${newId}/edit`);
}

export async function updateArticleAction(
  articleId: string,
  _prevState: ArticleActionState | null,
  formData: FormData
): Promise<ArticleActionState> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  let status: ArticleWorkflowStatus;
  let parsed: ParsedBasics;
  try {
    const out = parseArticleFormDataComplete(formData);
    status = out.status;
    parsed = out.parsed;
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return {
        error: "请修正表单。",
        fieldErrors: formatZodError(e),
      };
    }
    return { error: "表单校验失败。" };
  }

  let gateBypassed = false;
  if (status === "published") {
    const gate = await runArticlePublishQualityGate(
      {
        slug: parsed.slug,
        articleId,
        primarySourceUrl: parsed.primarySourceUrl ?? "",
        body: parsed.body ?? "",
        canonicalUrl: parsed.canonicalUrl ?? "",
      },
      formData
    );
    if (!gate.ok) {
      return {
        error: "质检未通过，请根据下列字段修正后重试。",
        fieldErrors: gate.fieldErrors,
      };
    }
    gateBypassed = gate.bypassedByOverride;
  }

  const db = getDb();

  const existing = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  const prevRow = existing[0];
  if (!prevRow) {
    return { error: "文章不存在或已被删除。" };
  }

  let publishedAt: Date | null;
  if (status === "published") {
    publishedAt = prevRow.publishedAt ?? new Date();
  } else {
    publishedAt = null;
  }

  try {
    await db
      .update(articles)
      .set({
        slug: parsed.slug,
        title: parsed.title,
        excerpt: parsed.excerpt,
        body: parsed.body,
        status,
        canonicalUrl: parsed.canonicalUrl,
        primarySourceUrl: parsed.primarySourceUrl,
        ogTitle: parsed.ogTitle,
        ogDescription: parsed.ogDescription,
        ogImageUrl: parsed.ogImageUrl,
        editorialFaq: parsed.editorialFaq,
        publishedAt,
      })
      .where(eq(articles.id, articleId));
  } catch (e: unknown) {
    if (isPgUniqueViolation(e)) {
      return { error: "该 slug 在当前语言版本中已存在，请更换 slug 或语言。" };
    }
    console.error(e);
    return { error: "保存失败，请稍后重试。" };
  }

  try {
    await syncArticleTags(articleId, parsed.tagSlugs);
  } catch (e) {
    console.error(e);
    return { error: "标签保存失败，请稍后重试。" };
  }

  if (status === "published" && gateBypassed) {
    try {
      await appendQualityGateOverrideEvent(articleId, parsed.slug);
    } catch (e) {
      console.error(e);
    }
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/articles/${articleId}/edit`);
  revalidateArticlePublicPaths(parsed.slug);
  if (prevRow.slug !== parsed.slug) {
    revalidateArticlePublicPaths(prevRow.slug);
  }
  if (prevRow.status === "published" || status === "published") {
    revalidatePath("/sitemap.xml");
  }
  redirect(`/admin/articles/${articleId}/edit`);
}
