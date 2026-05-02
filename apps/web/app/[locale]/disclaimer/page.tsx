import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  BilingualSection,
  SiteLegalPage,
} from "@/components/site/site-legal-page";
import type { AppLocale } from "@/lib/i18n/config";
import { isAppLocale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "免责声明",
  description:
    "Non-official fan site disclaimer. Not affiliated with POP MART or trademark owners.",
};

export default async function DisclaimerPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await props.params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;

  return (
    <SiteLegalPage locale={locale} title="免责声明（非官方）">
      <BilingualSection
        en={
          <>
            <p>
              This is a <strong>fan-made, non-official</strong> website. Names,
              characters, product lines, and trademarks mentioned may belong to
              their respective owners. Use of third-party marks is for
              descriptive and fan-newsworthy purposes only; there is no
              sponsorship, endorsement, or partnership unless explicitly stated
              for a specific piece of content.
            </p>
            <p>
              Information may be incomplete or become outdated. Always refer
              to official channels for authoritative announcements.
            </p>
          </>
        }
        enTitle="English · Non-official disclaimer"
        zh={
          <>
            <p>
              本站为<strong>粉丝自建、非官方网站</strong>
              。文内出现的名称、角色、产品线与商标等，可能属于各自权利人；引用仅作描述性与资讯摘要用途，
              <strong>
                除非某条正文另行写明，本站与 POP MART、THE MONSTERS
                等品牌方不构成赞助、背书或合作关系
              </strong>
              。
            </p>
            <p>
              资讯可能不完整或随时间失真；请以品牌与权利人的<strong>官方渠道</strong>
              或可追溯来源为准。
            </p>
          </>
        }
        zhTitle="中文 · 非官方声明占位"
      />
    </SiteLegalPage>
  );
}
