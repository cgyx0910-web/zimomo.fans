import Link from "next/link";

import { ADVERTISING_DISCLOSURE_PATH } from "@/lib/ads/constants";

const legalLinks = [
  { href: "/about", label: "关于" },
  { href: ADVERTISING_DISCLOSURE_PATH, label: "广告与联盟" },
  { href: "/disclaimer", label: "免责声明" },
  { href: "/privacy", label: "隐私" },
  { href: "/cookies", label: "Cookie" },
  { href: "/copyright", label: "版权与联络" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-200 bg-neutral-50 px-4 py-10 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950/80 dark:text-neutral-400">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:justify-between md:gap-12">
        <div className="max-w-md space-y-2">
          <p className="font-medium text-neutral-800 dark:text-neutral-200">
            非官方粉丝资讯站
          </p>
          <p lang="zh-CN">
            本站由爱好者维护。
            <Link className="ml-1 underline" href="/disclaimer">
              免责声明
            </Link>
          </p>
        </div>
        <nav
          aria-label="站点与法务"
          className="flex flex-col gap-3 md:items-end"
        >
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link className="underline hover:text-neutral-900 dark:hover:text-neutral-100" href="/">
              首页
            </Link>
            <Link className="underline hover:text-neutral-900 dark:hover:text-neutral-100" href="/articles">
              资讯
            </Link>
            <Link className="underline hover:text-neutral-900 dark:hover:text-neutral-100" href="/calendar">
              日历
            </Link>
            <Link className="underline hover:text-neutral-900 dark:hover:text-neutral-100" href="/wiki">
              百科
            </Link>
            <Link
              className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
              href="/account/login"
            >
              登录
            </Link>
            <Link
              className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
              href="/account"
            >
              账户
            </Link>
            <Link
              className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
              href="/newsletter"
            >
              订阅
            </Link>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {legalLinks.map((link) => (
              <Link
                className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </footer>
  );
}
