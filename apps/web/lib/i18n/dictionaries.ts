import type { AppLocale } from "@/lib/i18n/config";

export type FooterMessages = {
  brandLine: string;
  maintainerLine: string;
  disclaimerLink: string;
  navAria: string;
  home: string;
  articles: string;
  calendar: string;
  wiki: string;
  login: string;
  account: string;
  newsletter: string;
  legalAbout: string;
  legalAds: string;
  legalDisclaimer: string;
  legalPrivacy: string;
  legalCookies: string;
  legalCopyright: string;
};

const zhCN: FooterMessages = {
  brandLine: "非官方粉丝资讯站",
  maintainerLine: "本站由爱好者维护。",
  disclaimerLink: "免责声明",
  navAria: "站点与法务",
  home: "首页",
  articles: "资讯",
  calendar: "日历",
  wiki: "百科",
  login: "登录",
  account: "账户",
  newsletter: "订阅",
  legalAbout: "关于",
  legalAds: "广告与联盟",
  legalDisclaimer: "免责声明",
  legalPrivacy: "隐私",
  legalCookies: "Cookie",
  legalCopyright: "版权与联络",
};

const en: FooterMessages = {
  brandLine: "Unofficial fan hub",
  maintainerLine: "Maintained by volunteers.",
  disclaimerLink: "Disclaimer",
  navAria: "Site and legal",
  home: "Home",
  articles: "News",
  calendar: "Calendar",
  wiki: "Wiki",
  login: "Log in",
  account: "Account",
  newsletter: "Newsletter",
  legalAbout: "About",
  legalAds: "Ads & affiliates",
  legalDisclaimer: "Disclaimer",
  legalPrivacy: "Privacy",
  legalCookies: "Cookies",
  legalCopyright: "Copyright & contact",
};

const map: Record<AppLocale, FooterMessages> = {
  "zh-CN": zhCN,
  en,
};

export function getFooterDictionary(locale: AppLocale): FooterMessages {
  return map[locale] ?? zhCN;
}
