import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { InferSelectModel } from "drizzle-orm";

import { articles } from "@guge/db/schema";

import {
  getPublishedArticleBySlug,
  listTagSlugsByArticleId,
} from "@/lib/articles/public-queries";
import { AdSlot } from "@/components/ads/ad-slot";
import { AffiliateDisclosureShort } from "@/components/ads/affiliate-disclosure-short";
import { EditorialFaq } from "@/components/faq/editorial-faq";
import { getHubByPublishedArticleId } from "@/lib/clusters/public-queries";
import { absoluteArticlePath } from "@/lib/articles/site";
import { toEditorialFaqItems } from "@/lib/faq/editorial-faq";
import { buildFaqPageJsonLd } from "@/lib/faq/faq-page-json-ld";
import { ArticleCommentsSection } from "@/components/comments/article-comments-section";

/** ISR 间隔（秒），与 `lib/articles/constants.ts` 中 `ARTICLES_REVALIDATE_SECONDS` 保持一致 */
export const revalidate = 180;

function formatDt(value: Date | string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

type ArticleRecord = InferSelectModel<typeof articles>;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  let article: ArticleRecord | null = null;

  try {
    article = await getPublishedArticleBySlug(slug);
  } catch {
    return { title: "资讯" };
  }

  if (!article) {
    return { title: "未找到" };
  }

  const title =
    article.ogTitle?.trim() ||
    article.title?.trim() ||
    article.slug;

  const description =
    article.ogDescription?.trim() ||
    article.excerpt?.trim() ||
    undefined;

  const canonical = article.canonicalUrl?.trim()
    ? article.canonicalUrl.trim()
    : absoluteArticlePath(article.slug);

  const ogUrl = canonical;

  const openGraph = {
    type: "article" as const,
    url: ogUrl,
    title,
    ...(description ? { description } : {}),
    ...(article.ogImageUrl?.trim() ?
      { images: [{ url: article.ogImageUrl.trim() }] }
    : {}),
  };

  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical },
    openGraph,
    twitter: {
      card: article.ogImageUrl?.trim() ? "summary_large_image" : "summary",
      title,
      ...(description ? { description } : {}),
      ...(article.ogImageUrl?.trim() ?
        { images: [article.ogImageUrl.trim()] }
      : {}),
    },
  };
}

export default async function ArticleDetailPage(props: PageProps) {
  const { slug } = await props.params;

  let article: ArticleRecord | null = null;

  try {
    article = await getPublishedArticleBySlug(slug);
  } catch {
    notFound();
  }

  if (!article) {
    notFound();
  }

  const source = article.primarySourceUrl?.trim();
  if (!source) {
    // 理论上 published 必填；防御性避免坏数据
    notFound();
  }

  const tagSlugs = await listTagSlugsByArticleId(article.id);
  const canonical = article.canonicalUrl?.trim() ?? absoluteArticlePath(slug);

  const faqItems = toEditorialFaqItems(article.editorialFaq);
  const faqJsonLd =
    faqItems.length > 0 ? buildFaqPageJsonLd(canonical, faqItems) : null;

  let relatedHub: { slug: string; title: string | null } | null = null;
  try {
    relatedHub = await getHubByPublishedArticleId(article.id);
  } catch {
    relatedHub = null;
  }

  return (
    <article className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-14">
      <header className="space-y-3 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <p className="text-xs text-neutral-500">
          <Link className="underline" href="/articles">
            资讯
          </Link>
          <span aria-hidden className="px-2">
            /
          </span>
          <span>{article.slug}</span>
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {article.title ?? article.slug}
        </h1>
        {article.excerpt ? (
          <p className="text-lg text-neutral-600 dark:text-neutral-400">
            {article.excerpt}
          </p>
        ) : null}
      </header>

      <section
        aria-label="正文"
        className="whitespace-pre-wrap font-[family-name:var(--font-geist-sans)] text-base leading-relaxed text-neutral-900 dark:text-neutral-100"
      >
        {article.body ?? ""}
      </section>

      <div className="space-y-2">
        <AdSlot slotName="article-inline" />
        <AffiliateDisclosureShort />
      </div>

      {faqJsonLd ?
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          type="application/ld+json"
        />
      : null}

      <EditorialFaq items={faqItems} />

      {relatedHub ? (
        <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900/40">
          <h2 className="font-medium text-neutral-900 dark:text-neutral-100">相关事件 Hub</h2>
          <p className="mt-2 text-neutral-700 dark:text-neutral-300">
            多来源时间线与摘录对照：{" "}
            <Link className="font-medium underline" href={`/clusters/${relatedHub.slug}`}>
              {relatedHub.title?.trim() || relatedHub.slug}
            </Link>
          </p>
        </section>
      ) : null}

      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="font-medium text-neutral-900 dark:text-neutral-100">
          来源与规范 URL
        </h2>
        <ul className="mt-3 list-inside list-disc space-y-2 text-neutral-700 dark:text-neutral-300">
          <li>
            可追溯来源：{" "}
            <a
              className="font-medium underline"
              href={source}
              rel="noopener noreferrer"
              target="_blank"
            >
              {source}
            </a>
          </li>
          <li>
            规范链接（canonical）：{" "}
            <span className="break-all font-mono text-xs">{canonical}</span>
          </li>
        </ul>
      </section>

      {tagSlugs.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            标签
          </h2>
          <ul className="flex flex-wrap gap-2">
            {tagSlugs.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-700 dark:border-neutral-700 dark:text-neutral-300"
              >
                #{tag}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ArticleCommentsSection articleId={article.id} articleSlug={slug} />

      <footer className="flex flex-col gap-3 text-sm text-neutral-500">
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          最后更新：<time dateTime={article.updatedAt.toISOString()}>{formatDt(article.updatedAt)}</time>
        </p>
        <div className="flex flex-wrap gap-4">
          <Link className="underline" href="/articles">
            返回资讯列表
          </Link>
          <Link className="underline" href="/">
            首页
          </Link>
        </div>
      </footer>
    </article>
  );
}
