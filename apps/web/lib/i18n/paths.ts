import type { AppLocale } from "@/lib/i18n/config";

/** 前台路径加 locale 前缀（path 须以 `/` 开头；`/` 表示首页） */
export function localePath(locale: AppLocale, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") {
    return `/${locale}`;
  }
  return `/${locale}${normalized}`;
}
