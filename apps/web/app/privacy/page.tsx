import type { Metadata } from "next";

import {
  BilingualSection,
  SiteLegalPage,
} from "@/components/site/site-legal-page";

export const metadata: Metadata = {
  title: "隐私政策（占位）",
  description:
    "Draft privacy overview for EU/US-oriented visitors. Placeholder only.",
};

export default function PrivacyPage() {
  return (
    <SiteLegalPage title="隐私政策 · 占位草案">
      <BilingualSection
        en={
          <>
            <p>
              <strong>Draft outline (not final).</strong> This placeholder
              describes the intended GDPR/CCPA-aligned documentation area: what
              data we process (site logs, voluntary emails/forms if added later),
              legal bases where applicable (legitimate interests, consent),
              retention, international transfers safeguards, rights (access /
              deletion / portability), and contact procedures.
            </p>
            <p>
              Before launch in EU/US markets, substitute with counsel-approved
              text and populate data subprocessors precisely.
            </p>
          </>
        }
        enTitle="English · Privacy placeholder"
        zh={
          <>
            <p>
              <strong>仅为结构占位。</strong>
              计划覆盖面向欧盟/英国的 GDPR 与美部分州的隐私知情权框架草稿区：我们可能处理的技术日志、
              未来若上线的邮箱/表单等自愿提供的联系信息处理目的、法律依据（正当利益/
              同意等）、留存、跨境传输安全措施、访客权利入口（查阅/删除/
              可携带等）及联络方式。
            </p>
            <p>
              面向欧/美用户正式上线前，请替换为顾问审阅后的终稿，并列出实际分处理者（子处理方）。
            </p>
          </>
        }
        zhTitle="中文 · 隐私说明占位"
      />

      <BilingualSection
        en={
          <>
            <p>
              <strong>Newsletter (email list).</strong> If you subscribe, we
              process your email address to send a confirmation message (double
              opt-in). We store a hashed confirmation token with an expiry, and
              after confirmation a hashed unsubscribe token. You can withdraw
              consent at any time using the unsubscribe link (no account
              required). Transport defaults to console logging in development;
              production should use a configured mail provider.
            </p>
            <p>
              Retention: subscription rows are kept to honor suppression; you
              may request deletion via the contact channel on the copyright
              page.
            </p>
          </>
        }
        enTitle="English · Newsletter data processing (draft)"
        zh={
          <>
            <p>
              <strong>邮件订阅（Newsletter）。</strong>
              若你提交订阅，我们会处理你的邮箱地址以发送<strong>确认邮件</strong>（双
              opt-in）。我们会存储确认令牌的哈希与过期时间；确认后生成退订令牌的哈希。你可随时通过<strong>退订链接</strong>
              撤回同意（无需登录账户）。开发环境默认通过控制台输出邮件内容；生产环境应配置实际发信服务。
            </p>
            <p>
              留存：为尊重退订/抑制名单，订阅记录通常保留；你也可通过「版权与联络」页请求删除。
            </p>
          </>
        }
        zhTitle="中文 · Newsletter 数据处理（草案）"
      />
    </SiteLegalPage>
  );
}
