import type { Metadata } from "next";

import type { AppLocale } from "@/lib/i18n/config";
import { defaultLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/paths";
import { getSiteOrigin } from "@/lib/articles/site";

/** 同一 slug 下已发布的各语言版本 → `alternates.languages` + `x-default` */
export function buildArticleLanguageAlternates(
  slug: string,
  publishedLocales: readonly AppLocale[]
): NonNullable<Metadata["alternates"]>["languages"] {
  const origin = getSiteOrigin();
  const languages: Record<string, string> = {};
  for (const loc of publishedLocales) {
    languages[loc] = `${origin}${localePath(loc, `/articles/${slug}`)}`;
  }
  languages["x-default"] = `${origin}${localePath(defaultLocale, `/articles/${slug}`)}`;
  return languages;
}
