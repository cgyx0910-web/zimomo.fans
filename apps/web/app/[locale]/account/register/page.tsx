import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { RegisterForm } from "@/components/account/register-form";
import { getCurrentUser } from "@/lib/auth/user-session";
import type { AppLocale } from "@/lib/i18n/config";
import { isAppLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/paths";

export const metadata: Metadata = {
  title: "注册",
};

function sanitizeNextPath(raw: string | undefined, locale: AppLocale): string {
  if (!raw) {
    return localePath(locale, "/account");
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return localePath(locale, "/account");
  }
  return raw;
}

type SearchParamsInput =
  | { next?: string }
  | Promise<Record<string, string | string[] | undefined>>;

export default async function AccountRegisterPage(props: {
  params: Promise<{ locale: string }>;
  searchParams?: SearchParamsInput;
}) {
  const { locale: raw } = await props.params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;

  const user = await getCurrentUser();
  if (user) {
    redirect(localePath(locale, "/account"));
  }

  const spUnknown = props.searchParams;
  const resolved =
    spUnknown instanceof Promise ?
      await spUnknown
    : (spUnknown ?? {});

  const nextRaw = resolved.next;
  const nextCandidate =
    Array.isArray(nextRaw) ?
      typeof nextRaw[0] === "string" ?
        nextRaw[0]
      : undefined
    : typeof nextRaw === "string" ?
      nextRaw
    : undefined;

  const nextPath = sanitizeNextPath(nextCandidate, locale);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">注册</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          创建账户以便后续参与评论等功能（F2 起）。当前不要求邮箱验证。
        </p>
      </div>

      <RegisterForm nextPath={nextPath} />

      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        已有账户？{" "}
        <Link className="underline" href={localePath(locale, "/account/login")}>
          登录
        </Link>
      </p>
    </div>
  );
}
