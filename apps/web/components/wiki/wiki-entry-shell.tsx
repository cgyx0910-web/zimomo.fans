import Link from "next/link";

import type { AppLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/paths";

import { AdSlot } from "@/components/ads/ad-slot";
import { AffiliateDisclosureShort } from "@/components/ads/affiliate-disclosure-short";
import { EditorialFaq } from "@/components/faq/editorial-faq";
import { buildFaqPageJsonLd } from "@/lib/faq/faq-page-json-ld";
import type { EditorialFaqItem } from "@/lib/faq/editorial-faq";

type WikiEntryShellProps = {
  locale: AppLocale;
  slug: string;
  title: string;
  subtitle: string | null;
  lead: string;
  body: string | null;
  /** 用于 FAQPage JSON-LD 的页面绝对 URL（与 canonical 一致） */
  pageAbsoluteUrl: string;
  editorialFaqItems: EditorialFaqItem[];
  sourceUrl: string | null;
  updatedAt: Date | string;
};

function formatLastUpdated(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d) + " UTC";
}

/** 阶段 E2：百科条目统一版式（面包屑、徽章、导语、正文、来源与 Last updated） */
export function WikiEntryShell(props: WikiEntryShellProps) {
  const faqLang = props.locale === "en" ? "en" : "zh-CN";
  const faqJsonLd =
    props.editorialFaqItems.length > 0 ?
      buildFaqPageJsonLd(
        props.pageAbsoluteUrl,
        props.editorialFaqItems,
        faqLang
      )
    : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-14">
      <header className="space-y-5 border-b border-neutral-200 pb-8 dark:border-neutral-800">
        <nav aria-label="层级" className="text-sm text-neutral-600 dark:text-neutral-400">
          <Link
            className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
            href={localePath(props.locale, "/wiki")}
          >
            百科
          </Link>
          <span className="mx-2 text-neutral-400">/</span>
          <span className="font-mono text-xs text-neutral-500">{props.slug}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-3 py-0.5 text-xs font-medium text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/50 dark:text-violet-200">
              爱好者整理 · 非官方
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
              {props.title}
            </h1>
            {props.subtitle?.trim() ?
              <p className="text-base text-neutral-600 dark:text-neutral-400">
                {props.subtitle.trim()}
              </p>
            : null}
          </div>
        </div>

        <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {props.lead.trim()}
        </p>

        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          本站条目由粉丝志愿维护，不一定反映品牌方最新口径；若需正式信息请核实品牌与许可渠道。
        </p>
      </header>

      {props.body?.trim() ?
        <article
          aria-label="正文"
          className="prose prose-neutral max-w-none text-sm dark:prose-invert"
        >
          <div className="whitespace-pre-wrap">{props.body.trim()}</div>
        </article>
      : null}

      {faqJsonLd ?
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          type="application/ld+json"
        />
      : null}

      <EditorialFaq items={props.editorialFaqItems} />

      <div className="space-y-2">
        <AdSlot slotName="wiki-inline" />
        <AffiliateDisclosureShort />
      </div>

      <section className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/80 px-4 py-4 dark:border-neutral-800 dark:bg-neutral-950/40">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          可查来源（可选）
        </h2>
        {props.sourceUrl?.trim() ?
          <a
            className="break-all text-sm font-medium text-emerald-700 underline dark:text-emerald-400"
            href={props.sourceUrl.trim()}
            rel="noopener noreferrer"
            target="_blank"
          >
            {props.sourceUrl.trim()}
          </a>
        : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            编辑部未录入单独来源链接；请参阅正文内引用或自行检索核验。
          </p>
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-6 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
        <span>
          Last updated{" "}
          <time dateTime={
            props.updatedAt instanceof Date ?
              props.updatedAt.toISOString()
            : new Date(props.updatedAt).toISOString()
          }>
            {formatLastUpdated(props.updatedAt)}
          </time>
        </span>
        <Link className="underline" href={localePath(props.locale, "/wiki")}>
          返回百科索引
        </Link>
      </footer>
    </div>
  );
}
