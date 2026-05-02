import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";

import { getSiteOrigin } from "@/lib/articles/site";
import { defaultLocale, htmlLangForLocale, isAppLocale } from "@/lib/i18n/config";
import type { AppLocale } from "@/lib/i18n/config";
import { isPublicIndexingEnabled } from "@/lib/seo/indexable";
import { getSiteVerificationMetadata } from "@/lib/seo/site-verification";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const indexable = isPublicIndexingEnabled();

  return {
    metadataBase: new URL(getSiteOrigin()),
    title: {
      template: "%s · Zimomo/Labubu 资讯（非官方）",
      default: "Zimomo/Labubu 资讯（非官方）",
    },
    description:
      "粉丝自建资讯站：已发布条目、可追溯来源链接与 canonical 说明。非品牌官网。",
    robots:
      indexable ?
        undefined
      : {
          index: false,
          follow: false,
          nocache: true,
          googleBot: { index: false, follow: false },
        },
    verification: getSiteVerificationMetadata(),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const h = await headers();
  const raw = h.get("x-guge-locale") ?? defaultLocale;
  const locale: AppLocale = isAppLocale(raw) ? raw : defaultLocale;

  return (
    <html
      lang={htmlLangForLocale(locale)}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
