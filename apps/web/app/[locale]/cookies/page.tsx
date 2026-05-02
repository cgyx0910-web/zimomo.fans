import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  BilingualSection,
  SiteLegalPage,
} from "@/components/site/site-legal-page";
import type { AppLocale } from "@/lib/i18n/config";
import { isAppLocale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "Cookie 说明（占位）",
  description:
    "Draft cookie preference and transparency copy. CMP vendor unspecified.",
};

export default async function CookiesPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await props.params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;

  return (
    <SiteLegalPage locale={locale} title="Cookie 与同类技术 · 占位草案">
      <BilingualSection
        en={
          <>
            <p>
              <strong>Draft only.</strong> We plan to distinguish essential /
              strictly necessary cookies (authentication or security-only if
              added) from analytics or marketing scripts. Where required,
              preference controls and revocation paths should be surfaced;
              specific consent management platform integrations are deliberately
              not named in this placeholder.
            </p>
            <p>
              Update this page when real cookies, lifetimes, and partners are
              finalized.
            </p>
          </>
        }
        enTitle="English · Cookie transparency placeholder"
        zh={
          <>
            <p>
              <strong>仅为占位草稿。</strong>
              预计在正式运营时区分必要性 Cookie（仅限安全/登录等不可替代功能）与分析/
              营销类脚本所需的同意或退出机制；
              <strong>
                本稿不预设具体 CMP 供应商名称
              </strong>
              ，以免与最终实现不一致。
            </p>
            <p>
              当 Cookie 生命周期、域名范围与第三方脚本清单确定后，请替换本节为可审计版本。
            </p>
          </>
        }
        zhTitle="中文 · Cookie 同意说明占位"
      />
    </SiteLegalPage>
  );
}
