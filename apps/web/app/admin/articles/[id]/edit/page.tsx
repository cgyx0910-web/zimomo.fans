import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { InferSelectModel } from "drizzle-orm";

import { articles } from "@guge/db/schema";

import { ArticleEnrichDraftPanel } from "@/components/admin/article-enrich-draft-panel";
import { ArticleGateOverrideAudit } from "@/components/admin/article-gate-override-audit";
import {
  EditArticleForm,
  type ArticleFormValues,
} from "@/components/admin/article-form";
import { getArticleById, listTagSlugsByArticleId } from "@/lib/articles/queries";
import { padEditorialFaqSlotsForForm } from "@/lib/faq/editorial-faq";

type ArticleRow = InferSelectModel<typeof articles>;

function toFormDefaults(row: ArticleRow, tagSlugs: string[]): ArticleFormValues {
  const loc = row.locale === "en" ? "en" : "zh-CN";
  return {
    slug: row.slug,
    locale: loc,
    title: row.title ?? "",
    excerpt: row.excerpt ?? "",
    body: row.body ?? "",
    status: row.status as ArticleFormValues["status"],
    canonicalUrl: row.canonicalUrl ?? "",
    primarySourceUrl: row.primarySourceUrl ?? "",
    ogTitle: row.ogTitle ?? "",
    ogDescription: row.ogDescription ?? "",
    ogImageUrl: row.ogImageUrl ?? "",
    tags: tagSlugs.join(", "),
    faqSlots: padEditorialFaqSlotsForForm(row.editorialFaq),
  };
}

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `编辑 ${params.id} · 后台`,
  };
}

export default async function EditArticlePage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const row = await getArticleById(params.id);
  if (!row) {
    notFound();
  }
  const tagSlugs = await listTagSlugsByArticleId(row.id);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">编辑资讯</h1>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          id: <span className="font-mono">{row.id}</span>
        </p>
      </div>

      <EditArticleForm
        articleId={row.id}
        defaults={toFormDefaults(row, tagSlugs)}
      />

      <ArticleEnrichDraftPanel
        articleId={row.id}
        articleStatus={row.status}
        initialDraft={row.enrichDraft ?? null}
      />

      <ArticleGateOverrideAudit events={row.qualityGateOverrideEvents ?? []} />
    </div>
  );
}
