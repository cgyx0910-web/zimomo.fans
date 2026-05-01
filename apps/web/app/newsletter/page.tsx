import type { Metadata } from "next";

import { SubscribeForm } from "@/components/newsletter/subscribe-form";
import { getCurrentUser } from "@/lib/auth/user-session";

export const metadata: Metadata = {
  title: "邮件订阅",
  robots: { index: false, follow: false },
};

type SearchParamsInput =
  | {
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
    }
  | Promise<Record<string, string | string[] | undefined>>;

function firstString(
  v: string | string[] | undefined
): string | undefined {
  if (typeof v === "string") {
    return v;
  }
  if (Array.isArray(v) && typeof v[0] === "string") {
    return v[0];
  }
  return undefined;
}

export default async function NewsletterSubscribePage(props: {
  searchParams?: SearchParamsInput;
}) {
  const user = await getCurrentUser();
  const spUnknown = props.searchParams;
  const sp =
    spUnknown instanceof Promise ?
      await spUnknown
    : (spUnknown ?? {});

  const utmSource = firstString(sp.utm_source);
  const utmMedium = firstString(sp.utm_medium);
  const utmCampaign = firstString(sp.utm_campaign);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">邮件订阅</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          双 opt-in：提交后请在邮箱内点击确认链接；可随时通过退订链接取消。本站不使用
          AI 代发订阅。
        </p>
      </div>

      <SubscribeForm
        defaultEmail={user?.email ?? null}
        utmCampaign={utmCampaign}
        utmMedium={utmMedium}
        utmSource={utmSource}
      />

      <p className="text-xs text-neutral-500">
        详见{" "}
        <a className="underline" href="/privacy">
          隐私说明
        </a>{" "}
        中 Newsletter 数据处理章节；UTM 命名见仓库{" "}
        <code className="font-mono text-xs">docs/UTM_GUIDE.md</code>。
      </p>
    </div>
  );
}
