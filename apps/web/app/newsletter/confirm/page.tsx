import type { Metadata } from "next";
import Link from "next/link";

import { consumeNewsletterConfirm } from "@/lib/newsletter/flows";

export const metadata: Metadata = {
  title: "确认订阅",
  robots: { index: false, follow: false },
};

type SearchParamsInput =
  | { token?: string }
  | Promise<Record<string, string | string[] | undefined>>;

export default async function NewsletterConfirmPage(props: {
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

  const result = await consumeNewsletterConfirm(token);

  if (result.kind === "invalid") {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">链接无效</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          确认链接无效、已使用或已过期。你可返回订阅页重新发起。
        </p>
        <Link className="text-sm underline" href="/newsletter">
          返回订阅
        </Link>
      </div>
    );
  }

  if (result.kind === "expired") {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold tracking-tight">链接已过期</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          确认链接已超过 24 小时。请重新提交订阅以收到新邮件。
        </p>
        <Link className="text-sm underline" href="/newsletter">
          重新订阅
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">订阅已确认</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        感谢确认。你可随时使用下方退订链接取消订阅（可验证、可重复打开以查看状态）。
      </p>
      <p className="break-all rounded-md border border-neutral-200 bg-white p-3 font-mono text-xs dark:border-neutral-800 dark:bg-neutral-950">
        {result.unsubscribeUrl}
      </p>
      <p className="text-xs text-neutral-500">
        建议将退订链接加入书签或保存邮件；本站不为此链接设置 Cookie。
      </p>
      <Link className="text-sm underline" href="/">
        返回首页
      </Link>
    </div>
  );
}
