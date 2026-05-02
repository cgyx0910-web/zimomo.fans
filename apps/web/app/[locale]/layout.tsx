import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import type { AppLocale } from "@/lib/i18n/config";
import { isAppLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout(props: Props) {
  const { locale: raw } = await props.params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;

  return (
    <>
      <div className="flex flex-1 flex-col">{props.children}</div>
      <SiteFooter locale={locale} />
    </>
  );
}
