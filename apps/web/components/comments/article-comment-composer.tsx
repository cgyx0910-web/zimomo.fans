"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import {
  submitArticleCommentAction,
  type SubmitArticleCommentState,
} from "@/actions/comment-actions";
import { COMMENT_HONEYPOT_FIELD } from "@/lib/comments/constants";

export function ArticleCommentComposer(props: {
  articleSlug: string;
  isLoggedIn: boolean;
  loginNextPath: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  if (!props.isLoggedIn) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <p>仅<strong>登录用户</strong>可发表评论（实名账户，不使用 AI 代发）。</p>
        <p className="mt-2">
          <Link className="font-medium underline" href={`/account/login?next=${encodeURIComponent(props.loginNextPath)}`}>
            前往登录
          </Link>
          <span aria-hidden className="px-2">
            ·
          </span>
          <Link className="underline" href="/account/register">
            注册账户
          </Link>
        </p>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setError(undefined);
      setMessage(undefined);
      try {
        const formData = new FormData(event.currentTarget);
        const result: SubmitArticleCommentState = await submitArticleCommentAction(
          null,
          formData
        );
        if (result.error) {
          setError(result.error);
        }
        if (result.message) {
          setMessage(result.message);
        }
        if (result.ok) {
          event.currentTarget.reset();
          router.refresh();
        }
      } catch {
        setError("提交失败，请重试。");
      }
    });
  }

  return (
    <form className="relative space-y-4" onSubmit={(e) => void onSubmit(e)}>
      <input name="articleSlug" type="hidden" value={props.articleSlug} />
      {/* 蜜罐：勿删；填入则服务端拒绝 */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 -z-10 h-px w-px opacity-0"
      >
        <label htmlFor={COMMENT_HONEYPOT_FIELD}>
          Company
          <input
            autoComplete="off"
            defaultValue=""
            id={COMMENT_HONEYPOT_FIELD}
            name={COMMENT_HONEYPOT_FIELD}
            tabIndex={-1}
            type="text"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">发表评论</span>
        <textarea
          className="min-h-[100px] rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          maxLength={2000}
          name="body"
          placeholder="5–2000 字，审核通过后公开。"
          required
        />
      </label>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      {message ? (
        <p className="text-sm text-neutral-700 dark:text-neutral-300">{message}</p>
      ) : null}

      <button
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
        disabled={pending}
        type="submit"
      >
        {pending ? "提交中…" : "提交评论"}
      </button>
      <p className="text-xs text-neutral-500">
        评论将经人工审核；含过多外链等可能被自动标记为可疑。
      </p>
    </form>
  );
}
