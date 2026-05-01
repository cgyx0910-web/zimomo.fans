import type { Metadata } from "next";
import Link from "next/link";

import { consumeNewsletterUnsubscribe } from "@/lib/newsletter/flows";

export const metadata: Metadata = {
  title: "退订",
  robots: { index: false, follow: false },
};

type SearchParamsInput =
  | { token?: string }
  | Promise<Record<string, string | string[] | undefined>>;

export default async function NewsletterUnsubscribePage(props: {
  searchParams?: SearchParamsInput;
}) {
  const spUnknown = props.searchParams;
  const sp =
    spUnknown instanceof Promise ?
      await spUnknown
    : (spUnknown ?? {});

  const raw = sp.token;
  const token =
    Array.isArray(raw) ?
      typeof raw[0] === "string" ?
        raw[0]
      : undefined
    : typeof raw === "string" ?
      raw
    : undefined;

  const result = await consumeNewsletterUnsubscribe(token);

  if (result.kind === "invalid") {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">退订链接无效</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          无法识别该退订链接。若你仍收到邮件，请联系站点管理员处理。
        </p>
        <Link className="text-sm underline" href="/copyright">
          联络与版权
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold tracking-tight">
        {result.already ? "你已退订" : "退订成功"}
      </h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {result.already ?
          "该邮箱此前已退订，我们不会向你发送订阅类邮件。"
        : "该邮箱已从订阅列表中移除。若想再次订阅，请重新完成双 opt-in。"}
      </p>
      <Link className="text-sm underline" href="/">
        返回首页
      </Link>
    </div>
  );
}
