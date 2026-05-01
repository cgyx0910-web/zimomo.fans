"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ArticleEnrichDraftJson } from "@guge/db/schema";

import { generateArticleEnrichDraftAction } from "@/actions/enrich-actions";
import type { ArticleWorkflowStatus } from "@/lib/articles/workflow";

type Props = {
  articleId: string;
  initialDraft: ArticleEnrichDraftJson | null;
  articleStatus: ArticleWorkflowStatus;
};

export function ArticleEnrichDraftPanel(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draft = props.initialDraft;

  const onGenerate = () => {
    if (props.articleStatus === "published") {
      const ok = window.confirm(
        "当前为已发布（published）：重新生成将覆盖数据库中的 enrich_draft，不影响线上正文，但可能丢失当前草案版本。确定继续？"
      );
      if (!ok) {
        return;
      }
    }
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await generateArticleEnrichDraftAction(props.articleId);
      if (res.ok) {
        setMessage(res.message);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <section className="space-y-4 rounded-lg border border-violet-200 bg-violet-50/80 p-4 text-sm dark:border-violet-900/50 dark:bg-violet-950/20">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-violet-950 dark:text-violet-100">
          LLM 草案（仅 enrich_draft）
        </h2>
        <p className="text-xs text-violet-900/80 dark:text-violet-200/80">
          以下为编辑部用途的摘要/FAQ 草稿，非访客可见内容，亦非用户评论。须人工核对事实后再自行粘贴到摘要或正文。
        </p>
        {props.articleStatus === "published" ?
          <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
            当前文章已发布：生成前将弹出确认，以免误覆盖已有 enrich_draft。
          </p>
        : null}
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={onGenerate}
        className="rounded-md bg-violet-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-violet-600"
      >
        {pending ? "生成中…" : "生成摘要 / FAQ 草案"}
      </button>

      {message ? (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-900 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
          {error}
        </p>
      ) : null}

      {draft ?
        <div className="space-y-3 text-neutral-800 dark:text-neutral-200">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            模型：<span className="font-mono">{draft.model ?? "—"}</span>
            {" · "}
            生成时间：
            <span className="font-mono">{draft.generated_at}</span>
          </p>
          {draft.warnings?.length ?
            <ul className="list-inside list-disc text-xs text-amber-900 dark:text-amber-100">
              {draft.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          : null}
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100">摘要草案</h3>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">
              {draft.summary ?? "（null）"}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100">FAQ 草案</h3>
            <ul className="mt-2 space-y-2">
              {draft.faq.length === 0 ?
                <li className="text-xs text-neutral-500">（空）</li>
              : draft.faq.map((item, i) => (
                  <li
                    key={`${i}-${item.question.slice(0, 24)}`}
                    className="rounded border border-neutral-200 bg-white/80 p-2 dark:border-neutral-700 dark:bg-neutral-900/40"
                  >
                    <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      Q：{item.question}
                    </p>
                    <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">
                      A：{item.answer}
                    </p>
                  </li>
                ))
              }
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-medium text-neutral-600 dark:text-neutral-400">来源 URL（复核）</h3>
            <ul className="mt-1 list-inside list-disc font-mono text-[11px] break-all">
              {draft.source_urls.length === 0 ?
                <li>（无）</li>
              : draft.source_urls.map((u) => (
                  <li key={u}>{u}</li>
                ))
              }
            </ul>
          </div>
        </div>
      : (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">尚无草案，点击上方按钮生成。</p>
      )}
    </section>
  );
}
