import type { ReactNode } from "react";
import Link from "next/link";

export function LegalDraftBanner() {
  return (
    <aside
      className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
      role="note"
    >
      <p className="font-medium">占位草案 · 非正式法律文本</p>
      <p className="mt-1 opacity-95" lang="zh-CN">
        以下内容仅供产品与编辑流程占位，不构成法律意见，正式对外前须经法律顾问与人审复核。
      </p>
      <p className="mt-2 opacity-95" lang="en">
        This is placeholder copy for drafting only; it is{" "}
        <strong>not legal advice</strong> and must be reviewed before production
        use.
      </p>
    </aside>
  );
}

export function BilingualSection(props: {
  zhTitle: string;
  enTitle: string;
  zh: ReactNode;
  en: ReactNode;
}) {
  return (
    <div className="space-y-8">
      <section lang="zh-CN" className="space-y-3">
        <h2 className="text-lg font-semibold">{props.zhTitle}</h2>
        <div className="space-y-3 text-neutral-700 dark:text-neutral-300">
          {props.zh}
        </div>
      </section>
      <hr className="border-neutral-200 dark:border-neutral-800" />
      <section lang="en" className="space-y-3">
        <h2 className="text-lg font-semibold">{props.enTitle}</h2>
        <div className="space-y-3 text-neutral-700 dark:text-neutral-300">
          {props.en}
        </div>
      </section>
    </div>
  );
}

export function SiteLegalPage(props: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-12 md:py-16">
      <nav
        aria-label="站内导航"
        className="mb-8 flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-600 dark:text-neutral-400"
      >
        <Link className="underline hover:text-neutral-900 dark:hover:text-neutral-100" href="/">
          首页
        </Link>
        <Link className="underline hover:text-neutral-900 dark:hover:text-neutral-100" href="/articles">
          资讯
        </Link>
        <Link className="underline hover:text-neutral-900 dark:hover:text-neutral-100" href="/disclaimer">
          免责声明
        </Link>
      </nav>

      <article className="space-y-4 leading-relaxed text-neutral-900 dark:text-neutral-100">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight md:text-3xl">
          {props.title}
        </h1>
        <LegalDraftBanner />
        {props.children}
      </article>
    </div>
  );
}
