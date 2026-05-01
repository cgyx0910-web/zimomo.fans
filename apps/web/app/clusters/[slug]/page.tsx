import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { absoluteArticlePath, absoluteClusterPath } from "@/lib/articles/site";
import { getMergedClusterBySlug } from "@/lib/clusters/public-queries";
import { isPublicIndexingEnabled } from "@/lib/seo/indexable";

const SNIPPET_LEN = 240;

type PageProps = {
  params: Promise<{ slug: string }>;
};

function snippet(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= SNIPPET_LEN) {
    return t;
  }
  return `${t.slice(0, SNIPPET_LEN)}…`;
}

function isHttpsUrl(url: string | null | undefined): url is string {
  if (!url?.trim()) {
    return false;
  }
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  let cluster: Awaited<ReturnType<typeof getMergedClusterBySlug>> = null;
  try {
    cluster = await getMergedClusterBySlug(slug);
  } catch {
    return { title: "事件 Hub" };
  }

  if (!cluster) {
    return { title: "未找到" };
  }

  const primaryTitle =
    cluster.members.find((m) => m.role === "primary")?.title?.trim() || null;
  const title = cluster.title?.trim() || primaryTitle || cluster.slug;
  const description = cluster.summary?.trim() || undefined;
  const pub = cluster.publishedArticle;
  const canonical =
    pub?.status === "published" ?
      (pub.canonicalUrl?.trim() || absoluteArticlePath(pub.slug))
    : absoluteClusterPath(cluster.slug);

  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical },
    robots: {
      index: isPublicIndexingEnabled(),
      follow: isPublicIndexingEnabled(),
    },
    openGraph: {
      type: "website",
      url: canonical,
      title,
      ...(description ? { description } : {}),
    },
  };
}

export default async function ClusterHubPage(props: PageProps) {
  const { slug } = await props.params;
  let cluster: Awaited<ReturnType<typeof getMergedClusterBySlug>> = null;
  try {
    cluster = await getMergedClusterBySlug(slug);
  } catch {
    notFound();
  }

  if (!cluster || cluster.members.length === 0) {
    notFound();
  }

  const heading = cluster.title?.trim() || cluster.members[0]?.title?.trim() || cluster.slug;
  const pub = cluster.publishedArticle;
  const showPrimaryArticleBanner = pub?.status === "published";

  return (
    <article className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <header className="space-y-3 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <p className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
          非官方信息汇总 · 多来源对照
        </p>
        {showPrimaryArticleBanner && pub ? (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
            <p className="font-medium">本站「全文」主文</p>
            <p className="mt-1 text-blue-900/90 dark:text-blue-100/90">
              搜索引擎规范 URL 指向主文页；本页为多源摘录与外链对照。
            </p>
            <p className="mt-2">
              <Link
                className="font-medium underline underline-offset-2"
                href={`/articles/${pub.slug}`}
              >
                {pub.title?.trim() || pub.slug}
              </Link>
            </p>
          </div>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        {cluster.summary?.trim() ? (
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            {cluster.summary.trim()}
          </p>
        ) : null}
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          以下为编辑部整理的时间线摘录；事实请以各来源原文为准。
        </p>
      </header>

      <section aria-labelledby="timeline-heading" className="space-y-4">
        <h2 className="text-lg font-semibold" id="timeline-heading">
          时间线
        </h2>
        <ol className="relative space-y-6 border-s border-neutral-200 ps-6 dark:border-neutral-800">
          {cluster.members.map((m) => {
            const when = m.publishedAt ?? null;
            const whenValid =
              when !== null && !Number.isNaN(new Date(when as string | Date).getTime());
            const hrefOk = isHttpsUrl(m.sourceUrl);

            return (
              <li className="space-y-2" key={m.contentItemId}>
                <div className="absolute -start-[7px] mt-1.5 size-3 rounded-full border border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-950" />
                <div className="flex flex-wrap items-baseline gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {m.sourceName}
                  </span>
                  {m.role === "primary" ? (
                    <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-xs dark:bg-neutral-800">
                      主条目
                    </span>
                  ) : null}
                  {whenValid && when ? (
                    <time className="tabular-nums" dateTime={new Date(when).toISOString()}>
                      {new Intl.DateTimeFormat("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(when))}
                    </time>
                  ) : (
                    <span className="text-neutral-500">时间未知</span>
                  )}
                </div>
                <h3 className="text-base font-medium text-neutral-900 dark:text-neutral-50">
                  {m.title?.trim() || "（无标题）"}
                </h3>
                <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {snippet(m.normalizedText)}
                </p>
                <div className="text-sm">
                  {hrefOk ? (
                    <a
                      className="text-blue-700 underline underline-offset-2 dark:text-blue-300"
                      href={m.sourceUrl!.trim()}
                      rel="nofollow noopener noreferrer"
                      target="_blank"
                    >
                      查看原文（外部站点）
                    </a>
                  ) : (
                    <span className="text-neutral-500">暂无 HTTPS 来源链接</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <footer className="border-t border-neutral-200 pt-6 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        <p>
          本站为粉丝资讯枢纽，与 POP MART 等商标持有人无隶属关系。如需纠错请见{" "}
          <Link className="underline" href="/copyright">
            版权与联系
          </Link>
          。
        </p>
      </footer>
    </article>
  );
}
