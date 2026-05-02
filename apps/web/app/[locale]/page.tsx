import Link from "next/link";
import { notFound } from "next/navigation";

import { AdSlot } from "@/components/ads/ad-slot";
import { AffiliateDisclosureShort } from "@/components/ads/affiliate-disclosure-short";
import type { AppLocale } from "@/lib/i18n/config";
import { isAppLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/paths";

export default async function Home(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await props.params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;

  return (
    <main className="mx-auto flex min-h-full flex-1 max-w-xl flex-col justify-center gap-8 px-4 py-20">
      <div className="space-y-3">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          非官方粉丝自建站 · 不与 POP MART / 品牌构成关联
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Labubu · Zimomo 资讯
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          查看已发布的资讯条目、可追溯来源链接与规范的 canonical URL。
        </p>
        <p className="text-xs text-neutral-500">
          {locale === "zh-CN" ?
            <Link className="underline" href={localePath("en", "/")} hrefLang="en">
              English
            </Link>
          : null}
          {locale === "en" ?
            <Link className="underline" href={localePath("zh-CN", "/")} hrefLang="zh-CN">
              中文
            </Link>
          : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          className="inline-flex rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          href={localePath(locale, "/articles")}
        >
          进入资讯列表
        </Link>
        <Link
          className="inline-flex rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-900"
          href={localePath(locale, "/calendar")}
        >
          粉丝活动日历
        </Link>
        <Link
          className="inline-flex rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-900"
          href={localePath(locale, "/wiki")}
        >
          百科条目
        </Link>
      </div>
      <div className="space-y-2 border-t border-neutral-200 pt-8 dark:border-neutral-800">
        <AdSlot slotName="home-footer" />
        <AffiliateDisclosureShort />
      </div>
    </main>
  );
}
