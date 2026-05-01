import type { Metadata } from "next";
import Link from "next/link";

import { listPublishedWikiEntitiesByTitle } from "@/lib/wiki/public-queries";

export const revalidate = 180;

export const metadata: Metadata = {
  title: "百科",
  description:
    "非官方 POP MART / THE MONSTERS 粉丝自建百科条目；导语与正文由编辑部维护，可修订。",
};

export default async function WikiIndexPage() {
  let rows: Awaited<ReturnType<typeof listPublishedWikiEntitiesByTitle>> = [];

  try {
    rows = await listPublishedWikiEntitiesByTitle();
  } catch {
    /* DB 不可用 */
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-14">
      <header className="space-y-2 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-3 py-0.5 text-xs font-medium text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/50 dark:text-violet-200">
          爱好者百科 · 非官方
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">百科</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          每条目含独立导语与正文节选；内容与品牌／版权方并无必然关联，引用请以可追溯来源为准。
        </p>
      </header>

      <ul className="flex flex-col gap-4">
        {rows.length === 0 ?
          <li className="text-sm text-neutral-600 dark:text-neutral-400">
            暂无已发布百科条目。
          </li>
        : rows.map((row) => (
            <li key={row.slug}>
              <article className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                <h2 className="text-lg font-medium">
                  <Link
                    className="hover:underline"
                    href={`/wiki/${row.slug}`}
                  >
                    {row.title}
                  </Link>
                </h2>
                {row.subtitle?.trim() ?
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {row.subtitle.trim()}
                  </p>
                : null}
                <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                  {row.lead}
                </p>
              </article>
            </li>
          ))
        }
      </ul>
    </div>
  );
}
