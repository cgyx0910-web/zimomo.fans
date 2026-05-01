import type { Metadata } from "next";
import Link from "next/link";

import {
  BilingualSection,
  SiteLegalPage,
} from "@/components/site/site-legal-page";

export const metadata: Metadata = {
  title: "广告与联盟披露",
  description:
    "本站点展示广告与联盟链接的透明度说明（粉丝站、非官方）。占位草案，须人审与法务复核。",
};

export default function AdvertisingDisclosurePage() {
  return (
    <SiteLegalPage title="广告与联盟披露">
      <p className="text-sm text-neutral-600 dark:text-neutral-400" lang="zh-CN">
        若您仅在寻找资讯，可忽略本页；本页面向需要了解<strong>本站如何承担服务器与编辑成本</strong>的访客。
      </p>
      <BilingualSection
        en={
          <>
            <p>
              This fan-operated hub may display <strong>third-party advertisements</strong>{" "}
              and <strong>affiliate / referral links</strong>. If you purchase or sign up through
              such links, we may receive a small commission at <strong>no extra cost</strong> to
              you, subject to each network&apos;s terms.
            </p>
            <p>
              Editorial content is reviewed separately from monetization placements: we do not
              sell fake comments or inflate engagement. Where a post contains affiliate links,
              we aim to disclose it briefly in-page and link here for detail.
            </p>
            <p>
              <strong>Placeholder</strong>: final disclosure must be reviewed for your target
              regions (EU/UK/US advertising and consumer rules).
            </p>
          </>
        }
        enTitle="English · Draft"
        zh={
          <>
            <p>
              本站为非官方粉丝项目，可能通过<strong>第三方展示广告</strong>或与电商/服务商合作的
              <strong>联盟推广链接</strong>分担服务器与维护成本。若您通过联盟链接完成符合该计划规则的有效购买或注册，我们可能获得由广告主或平台支付的分成或费用；通常<strong>不会提高您支付的价格</strong>，具体以各平台规则为准。
            </p>
            <p>
              编辑部资讯与百科的事实性内容仍按站内流程人审；变现组件与正文分离展示。若单篇内容含联盟链接，我们会在正文区域附近提供<strong>简短披露</strong>并链向本页。
            </p>
            <p>
              <strong>占位说明</strong>：正式对外前请按目标市场（含欧/美消费者与广告标识要求）由法律顾问复核本页与页内短披露文案。
            </p>
          </>
        }
        zhTitle="中文 · 草案"
      />
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        <Link className="underline" href="/about">
          返回关于本站
        </Link>
      </p>
    </SiteLegalPage>
  );
}
