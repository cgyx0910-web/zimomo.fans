import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { logoutUserAction } from "@/actions/user-auth-actions";
import { getCurrentUser } from "@/lib/auth/user-session";
import type { AppLocale } from "@/lib/i18n/config";
import { isAppLocale } from "@/lib/i18n/config";
import { localePath } from "@/lib/i18n/paths";

export default async function AccountPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await props.params;
  if (!isAppLocale(raw)) {
    notFound();
  }
  const locale = raw as AppLocale;

  const user = await getCurrentUser();
  if (!user) {
    const next = encodeURIComponent(localePath(locale, "/account"));
    redirect(`${localePath(locale, "/account/login")}?next=${next}`);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">我的账户</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          粉丝自建站账户；与后台管理员登录无关。
        </p>
      </div>

      <dl className="space-y-4 text-sm">
        <div>
          <dt className="font-medium text-neutral-800 dark:text-neutral-200">
            邮箱
          </dt>
          <dd className="mt-1 text-neutral-600 dark:text-neutral-400">
            {user.email}
          </dd>
        </div>
        {user.displayName ?
          <div>
            <dt className="font-medium text-neutral-800 dark:text-neutral-200">
              昵称
            </dt>
            <dd className="mt-1 text-neutral-600 dark:text-neutral-400">
              {user.displayName}
            </dd>
          </div>
        : null}
        <div>
          <dt className="font-medium text-neutral-800 dark:text-neutral-200">
            邮箱验证
          </dt>
          <dd className="mt-1 text-neutral-600 dark:text-neutral-400">
            {user.emailVerifiedAt ?
              "已验证"
            : "未验证（当前版本不要求验证）"}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <Link
          className="text-sm text-neutral-600 underline dark:text-neutral-400"
          href={localePath(locale, "/")}
        >
          返回首页
        </Link>
        <form action={logoutUserAction}>
          <button
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
            type="submit"
          >
            退出登录
          </button>
        </form>
      </div>
    </div>
  );
}
