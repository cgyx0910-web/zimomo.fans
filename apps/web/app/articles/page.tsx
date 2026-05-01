import type { Metadata } from "next";
import Link from "next/link";

import { listPublishedArticles } from "@/lib/articles/public-queries";

/** ISR 间隔（秒），与 `lib/articles/constants.ts` 中 `ARTICLES_REVALIDATE_SECONDS` 保持一致 */
export const revalidate = 180;

export const metadata: Metadata = {
  title: "资讯",
  description: "已发布的粉丝资讯条目（非官方网站）。",
};

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

export default async function ArticlesIndexPage() {
  let rows: Awaited<ReturnType<typeof listPublishedArticles>> = [];

  try {
    rows = await listPublishedArticles();
  } catch {
    /* 构建期或未配置 DATABASE_URL 时避免因 DB 不可用导致整页失败 */
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-14">
      <header className="space-y-2 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <h1 className="text-2xl font-semibold tracking-tight">资讯</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          以下为已发布内容；本站为粉丝自建资讯聚合，非 POP MART / 品牌官网。
        </p>
      </header>

      <ul className="flex flex-col gap-4">
        {rows.length === 0 ? (
          <li className="text-sm text-neutral-600 dark:text-neutral-400">
            暂无已发布资讯。
          </li>
        ) : (
          rows.map((article) => (
            <li key={article.id}>
              <article className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-medium">
                    <Link
                      className="hover:underline"
                      href={`/articles/${article.slug}`}
                    >
                      {article.title ?? article.slug}
                    </Link>
                  </h2>
                  <div className="text-right text-xs tabular-nums text-neutral-500">
                    {article.publishedAt ?
                      <p>
                        发布：
                        <time dateTime={article.publishedAt.toISOString()}>
                          {formatDt(article.publishedAt)}
                        </time>
                      </p>
                    : null}
                    <p>
                      最后更新：
                      <time dateTime={article.updatedAt.toISOString()}>{formatDt(article.updatedAt)}</time>
                    </p>
                  </div>
                </div>
                {article.excerpt ? (
                  <p className="mt-2 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {article.excerpt}
                  </p>
                ) : null}
              </article>
            </li>
          ))
        )}
      </ul>

      <footer className="text-sm text-neutral-500">
        <Link className="underline" href="/">
          返回首页
        </Link>
      </footer>
    </div>
  );
}
