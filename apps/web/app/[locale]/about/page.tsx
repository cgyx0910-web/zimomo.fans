import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BilingualSection,
  SiteLegalPage,
} from "@/components/site/site-legal-page";
import { ADVERTISING_DISCLOSURE_PATH } from "@/lib/ads/constants";
import type { AppLocale } from "@/lib/i18n/config";
import { isAppLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/paths";

export const metadata: Metadata = {
  title: "关于本站",
  description:
    "About this fan-maintained hub (non-official). Placeholder bilingual copy.",
};

export default async function AboutPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await props.params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;

  return (
    <SiteLegalPage locale={locale} title="关于本站">
      <BilingualSection
        en={
          <>
            <p>
              This site aims to consolidate{" "}
              <strong>Zimomo / Labubu / THE MONSTERS</strong> fan-oriented news
              and reference materials as a curated hub. Publishing is editorial
              and human-reviewed; outbound sources are credited where articles are
              public.
            </p>
            <p>
              The project is independently operated by fans / contributors; it{" "}
              <strong>
                does not represent POP MART, THE MONSTERS, or trademark
                owners
              </strong>
              .
            </p>
          </>
        }
        enTitle="English · Placeholder"
        zh={
          <>
            <p>
              本站为非官方的粉丝向资讯与可查档案<strong>占位说明</strong>
              ：整理 Zimomo、Labubu 及 THE MONSTERS 相关公开信息，
              已发布内容由编辑部维护并按「可追溯来源」原则引用外链。
            </p>
            <p>
              本站由粉丝/贡献者<strong>自主运营</strong>，不构成 POP MART、THE
              MONSTERS 或商标权利人的立场或代言。
            </p>
          </>
        }
        zhTitle="中文 · 占位草案"
      />
      <p className="text-sm text-neutral-600 dark:text-neutral-400" lang="zh-CN">
        关于本站如何展示广告与联盟链接的说明，请参阅{" "}
        <Link className="underline" href={localePath(locale, ADVERTISING_DISCLOSURE_PATH)}>
          广告与联盟披露
        </Link>
        。
      </p>
    </SiteLegalPage>
  );
}
