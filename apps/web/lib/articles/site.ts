import type { AppLocale } from "@/lib/i18n/config";
import { defaultLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/paths";

/** 去掉尾部 `/`，供 sitemap/metadata 拼接 */
export function getSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteArticlePath(
  slug: string,
  locale: AppLocale = defaultLocale
): string {
  return `${getSiteOrigin()}${localePath(locale, `/articles/${slug}`)}`;
}

export function absoluteClusterPath(
  slug: string,
  locale: AppLocale = defaultLocale
): string {
  return `${getSiteOrigin()}${localePath(locale, `/clusters/${slug}`)}`;
}

export function absoluteCalendarEventUrl(
  slug: string,
  locale: AppLocale = defaultLocale
): string {
  return `${getSiteOrigin()}${localePath(locale, `/calendar/${slug}`)}`;
}

export function absoluteWikiEntityUrl(
  slug: string,
  locale: AppLocale = defaultLocale
): string {
  return `${getSiteOrigin()}${localePath(locale, `/wiki/${slug}`)}`;
}
