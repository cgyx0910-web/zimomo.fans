import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  BilingualSection,
  SiteLegalPage,
} from "@/components/site/site-legal-page";
import { getLegalContactEmail } from "@/lib/legal/contact";
import type { AppLocale } from "@/lib/i18n/config";
import { isAppLocale } from "@/lib/i18n/config";

export const metadata: Metadata = {
  title: "版权与纠错联络",
  description:
    "Copyright notice stub, corrections channel, infringement contact placeholder.",
};

export default async function CopyrightPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await props.params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;

  const legalEmail = getLegalContactEmail();

  return (
    <SiteLegalPage locale={locale} title="版权声明 · 纠错与侵权联络（占位）">
      <BilingualSection
        en={
          <>
            <p>
              <strong>Draft outline.</strong> Third-party logos, artworks, and
              photos may belong to respective rights holders and are reproduced
              on this site solely for illustrative or news citation purposes
              where permitted. If reuse exceeds fair use/fair dealing in your
              jurisdiction or you identify an error, mail the address below so
              we can correct attribution or promptly remove infringing material.
            </p>
            <p>DMCA-friendly takedown channels can be summarized here pending counsel review.</p>
            <p className="font-medium">Contact placeholder</p>
            {legalEmail ? (
              <p>
                <a
                  className="break-all underline"
                  href={`mailto:${encodeURIComponent(legalEmail)}`}
                >
                  {legalEmail}
                </a>
              </p>
            ) : (
              <p className="text-neutral-500">
                Configure <code className="text-sm">LEGAL_CONTACT_EMAIL</code>{" "}
                in environment variables before going live—no mailbox is wired
                in this sandbox build.
              </p>
            )}
          </>
        }
        enTitle="English · Copyright & takedowns placeholder"
        zh={
          <>
            <p>
              <strong>仅为要点占位。</strong>
              第三方商标、艺术作品或照片等可能归权利人所有；本站仅在不侵犯合法权益的前提下，
              以说明性引用或可追溯报道形式使用。
              <strong>
                若您认为引用超出合理使用/公平竞争范围，或发现事实性错误，
              </strong>
              请将材料与指向 URL 发往下方邮箱，我们会在合理期限内核验、更正署名或下架。
            </p>
            <p>
              「仿冒官方」「高仿官网」等不符合本站定位的请求将优先处理；
              DMCA /
              域内下架流程条文待法律顾问定稿后可替换本段占位。
            </p>
            <p className="font-medium">联系占位</p>
            {legalEmail ? (
              <p>
                <a
                  className="break-all underline"
                  href={`mailto:${encodeURIComponent(legalEmail)}`}
                >
                  {legalEmail}
                </a>
              </p>
            ) : (
              <p className="text-neutral-500">
                请在环境变量中配置{" "}
                <code className="text-sm">LEGAL_CONTACT_EMAIL</code>；
                当前构建未挂载真实法务邮箱。
              </p>
            )}
          </>
        }
        zhTitle="中文 · 版权与纠错/侵权占位"
      />
    </SiteLegalPage>
  );
}
