"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "@/actions/admin-auth-actions";

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      {!isLogin ? (
        <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
            <div className="flex items-center gap-4 text-sm">
              <Link className="font-semibold" href="/admin">
                后台
              </Link>
              <Link className="text-neutral-600 hover:underline dark:text-neutral-400" href="/admin/articles/new">
                新建资讯
              </Link>
              <Link
                className="text-neutral-600 hover:underline dark:text-neutral-400"
                href="/admin/sources"
              >
                RSS 来源
              </Link>
              <Link
                className="text-neutral-600 hover:underline dark:text-neutral-400"
                href="/admin/raw-documents"
              >
                Raw 文档
              </Link>
              <Link
                className="text-neutral-600 hover:underline dark:text-neutral-400"
                href="/admin/content-items"
              >
                Content Items
              </Link>
              <Link
                className="text-neutral-600 hover:underline dark:text-neutral-400"
                href="/admin/clusters"
              >
                Clusters
              </Link>
              <Link
                className="text-neutral-600 hover:underline dark:text-neutral-400"
                href="/admin/calendar-events"
              >
                日历
              </Link>
              <Link
                className="text-neutral-600 hover:underline dark:text-neutral-400"
                href="/admin/wiki-entities"
              >
                百科
              </Link>
              <Link
                className="text-neutral-600 hover:underline dark:text-neutral-400"
                href="/admin/comments"
              >
                评论审核
              </Link>
              <Link
                className="text-neutral-600 hover:underline dark:text-neutral-400"
                href="/admin/newsletter"
              >
                Newsletter
              </Link>
              <Link
                className="text-neutral-600 hover:underline dark:text-neutral-400"
                href="/"
              >
                返回前台
              </Link>
            </div>

            <form action={logoutAction}>
              <button
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
                type="submit"
              >
                退出
              </button>
            </form>
          </div>
        </header>
      ) : null}

      <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  );
}
