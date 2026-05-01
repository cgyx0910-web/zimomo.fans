import Link from "next/link";

import { moderateArticleCommentAction } from "@/actions/comment-moderation-actions";
import {
  listArticleCommentsForModeration,
  type ModerationCommentRow,
} from "@/lib/comments/queries";

export const dynamic = "force-dynamic";

function badgeClass(status: string): string {
  if (status === "spam_blocked") {
    return "bg-rose-100 text-rose-900 dark:bg-rose-950/70 dark:text-rose-100";
  }
  return "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-100";
}

export default async function AdminCommentsModerationPage() {
  let rows: ModerationCommentRow[] = [];
  try {
    rows = await listArticleCommentsForModeration();
  } catch {
    rows = [];
  }

  const pending = rows.filter((r) => r.status === "pending");
  const spamBlocked = rows.filter((r) => r.status === "spam_blocked");

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">评论审核</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          待审队列与<strong>可疑（规则命中）</strong>条目；批准后即时出现在资讯页。仅注册用户可发评，不使用
          AI 生成评论路径。
        </p>
      </div>

      <ModerationTable
        emptyHint="暂无待审核评论。"
        rows={pending}
        title="待审核"
      />
      <ModerationTable
        emptyHint="暂无被规则拦截的评论。"
        rows={spamBlocked}
        title="可疑 / 拦截"
      />
    </div>
  );
}

function ModerationTable(props: {
  title: string;
  rows: ModerationCommentRow[];
  emptyHint: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">{props.title}</h2>
      {props.rows.length === 0 ? (
        <p className="text-sm text-neutral-500">{props.emptyHint}</p>
      ) : (
        <ul className="flex flex-col gap-6">
          {props.rows.map((r) => (
            <li
              className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950"
              key={r.id}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${badgeClass(r.status)}`}
                >
                  {r.status === "spam_blocked" ? "规则拦截" : "待审核"}
                </span>
                <span>
                  文章：
                  <Link className="ml-1 font-mono underline" href={`/articles/${r.articleSlug}`} target="_blank">
                    /articles/{r.articleSlug}
                  </Link>
                </span>
                <span aria-hidden className="text-neutral-300">
                  ·
                </span>
                <span>
                  用户：
                  {r.userDisplayName?.trim() || r.userEmail}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-900 dark:text-neutral-100">
                {r.body}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <form action={moderateArticleCommentAction}>
                  <input name="id" type="hidden" value={r.id} />
                  <input name="decision" type="hidden" value="approve" />
                  <button
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
                    type="submit"
                  >
                    批准显示
                  </button>
                </form>
                <form action={moderateArticleCommentAction}>
                  <input name="id" type="hidden" value={r.id} />
                  <input name="decision" type="hidden" value="reject" />
                  <button
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
                    type="submit"
                  >
                    拒绝（不公开）
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
