import type { Metadata } from "next";
import { notFound } from "next/navigation";

import type { InferSelectModel } from "drizzle-orm";

import { wikiEntities } from "@guge/db/schema";

import { WikiEntryShell } from "@/components/wiki/wiki-entry-shell";
import { absoluteWikiEntityUrl } from "@/lib/articles/site";
import { toEditorialFaqItems } from "@/lib/faq/editorial-faq";
import { getPublishedWikiEntityBySlug } from "@/lib/wiki/public-queries";

export const revalidate = 180;

type WikiRecord = InferSelectModel<typeof wikiEntities>;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  let row: WikiRecord | null = null;

  try {
    row = await getPublishedWikiEntityBySlug(slug);
  } catch {
    return { title: "百科" };
  }

  if (!row) {
    return { title: "未找到" };
  }

  const title = `${row.title} · 百科`;
  const lead = row.lead.trim();
  const description =
    lead.length > 160 ? `${lead.slice(0, 157)}…`
    : lead.length > 0 ? lead
    : row.title;

  const canonical = absoluteWikiEntityUrl(row.slug);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      siteName: "zimomo.fans",
    },
  };
}

export default async function WikiEntityPage(props: PageProps) {
  const { slug } = await props.params;

  let row: WikiRecord | null = null;

  try {
    row = await getPublishedWikiEntityBySlug(slug);
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

  const pageAbsoluteUrl = absoluteWikiEntityUrl(row.slug);
  const editorialFaqItems = toEditorialFaqItems(row.editorialFaq);

  return (
    <WikiEntryShell
      body={row.body}
      editorialFaqItems={editorialFaqItems}
      lead={row.lead}
      pageAbsoluteUrl={pageAbsoluteUrl}
      slug={row.slug}
      sourceUrl={row.sourceUrl}
      subtitle={row.subtitle}
      title={row.title}
      updatedAt={
        row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt)
      }
    />
  );
}
