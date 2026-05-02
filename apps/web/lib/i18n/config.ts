export const locales = ["zh-CN", "en"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "zh-CN";

export function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

/** HTML `lang` 属性（与 BCP47 略有映射） */
export function htmlLangForLocale(locale: AppLocale): string {
  return locale === "en" ? "en" : "zh-CN";
}
