import Link from "next/link";

import { ADVERTISING_DISCLOSURE_PATH } from "@/lib/ads/constants";
import type { AppLocale } from "@/lib/i18n/config";
import { getFooterDictionary } from "@/lib/i18n/dictionaries";
import { localePath } from "@/lib/i18n/paths";

export function SiteFooter(props: { locale: AppLocale }) {
  const t = getFooterDictionary(props.locale);
  const { locale } = props;

  const legalLinks = [
    { href: localePath(locale, "/about"), label: t.legalAbout },
    { href: localePath(locale, ADVERTISING_DISCLOSURE_PATH), label: t.legalAds },
    { href: localePath(locale, "/disclaimer"), label: t.legalDisclaimer },
    { href: localePath(locale, "/privacy"), label: t.legalPrivacy },
    { href: localePath(locale, "/cookies"), label: t.legalCookies },
    { href: localePath(locale, "/copyright"), label: t.legalCopyright },
  ] as const;

  return (
    <footer className="mt-auto border-t border-neutral-200 bg-neutral-50 px-4 py-10 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950/80 dark:text-neutral-400">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:justify-between md:gap-12">
        <div className="max-w-md space-y-2">
          <p className="font-medium text-neutral-800 dark:text-neutral-200">
            {t.brandLine}
          </p>
          <p lang={locale === "en" ? "en" : "zh-CN"}>
            {t.maintainerLine}
            <Link className="ml-1 underline" href={localePath(locale, "/disclaimer")}>
              {t.disclaimerLink}
            </Link>
          </p>
        </div>
        <nav
          aria-label={t.navAria}
          className="flex flex-col gap-3 md:items-end"
        >
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link
              className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
              href={localePath(locale, "/")}
            >
              {t.home}
            </Link>
            <Link
              className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
              href={localePath(locale, "/articles")}
            >
              {t.articles}
            </Link>
            <Link
              className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
              href={localePath(locale, "/calendar")}
            >
              {t.calendar}
            </Link>
            <Link
              className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
              href={localePath(locale, "/wiki")}
            >
              {t.wiki}
            </Link>
            <Link
              className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
              href={localePath(locale, "/account/login")}
            >
              {t.login}
            </Link>
            <Link
              className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
              href={localePath(locale, "/account")}
            >
              {t.account}
            </Link>
            <Link
              className="underline hover:text-neutral-900 dark:hover:text-neutral-100"
              href={localePath(locale, "/newsletter")}
            >
              {t.newsletter}
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
