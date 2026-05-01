import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "登录 · 后台",
};

function sanitizeNextPath(raw?: string): string {
  if (!raw) {
    return "/admin";
  }
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/admin";
  }
  return raw;
}

type SearchParamsInput =
  | { next?: string }
  | Promise<Record<string, string | string[] | undefined>>;

export default async function AdminLoginPage(props: {
  searchParams?: SearchParamsInput;
}) {
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

  const nextPath = sanitizeNextPath(nextCandidate);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">后台登录</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          本站为粉丝自建资讯项目；登录限于配置的管理员。
        </p>
      </div>

      <LoginForm nextPath={nextPath} />
    </div>
  );
}
