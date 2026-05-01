"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";

import {
  createArticleAction,
  updateArticleAction,
  type ArticleActionState,
} from "@/actions/article-actions";
import type { ArticleWorkflowStatus } from "@/lib/articles/workflow";
import {
  EDITORIAL_FAQ_MAX_ITEMS,
  padEditorialFaqSlotsForForm,
} from "@/lib/faq/editorial-faq";

export type ArticleFormValues = {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: ArticleWorkflowStatus;
  canonicalUrl: string;
  primarySourceUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  tags: string;
  /** 长度固定 EDITORIAL_FAQ_MAX_ITEMS，对应 faq_q_i / faq_a_i */
  faqSlots: { question: string; answer: string }[];
};

export const emptyArticleDefaults: ArticleFormValues = {
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  status: "draft",
  canonicalUrl: "",
  primarySourceUrl: "",
  ogTitle: "",
  ogDescription: "",
  ogImageUrl: "",
  tags: "",
  faqSlots: padEditorialFaqSlotsForForm(null),
};

function Feedback({ state }: { state: ArticleActionState | null }) {
  if (!state) {
    return null;
  }

  const fieldEntries = Object.entries(state.fieldErrors ?? {});

  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      {state.error ? (
        <p className="font-medium">{state.error}</p>
      ) : null}

      {fieldEntries.length ? (
        <ul className="list-disc space-y-1 pl-5">
          {fieldEntries.map(([key, msg]) => (
            <li key={key}>
              <span className="font-medium">{key}</span>: {msg}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Fields({ defaults }: { defaults: ArticleFormValues }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">slug</span>
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="slug"
          required
          defaultValue={defaults.slug}
          placeholder="例如：labubu-2026-announcement"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="text-xs text-neutral-500">
          小写字母、数字与中划线。
        </span>
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">标题</span>
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="title"
          defaultValue={defaults.title}
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">摘要（可选）</span>
        <textarea
          className="min-h-24 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="excerpt"
          defaultValue={defaults.excerpt}
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">正文</span>
        <textarea
          className="min-h-72 rounded-md border border-neutral-300 px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm dark:border-neutral-700"
          name="body"
          defaultValue={defaults.body}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">状态</span>
        <select
          name="status"
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          defaultValue={defaults.status}
        >
          <option value="draft">draft（草稿）</option>
          <option value="in_review">in_review（待审）</option>
          <option value="blocked">blocked（暂停）</option>
          <option value="published">published（已发布）</option>
        </select>
        <span className="text-xs text-neutral-600 dark:text-neutral-400">
          in_review 表示待编辑部确认后再发；blocked 暂停流转。仅保存为「published」时使用严格字段校验并运行质量闸门（链接可达性、与主来源摘录相似度等）。开发环境可设
          QUALITY_GATE_DISABLED=true 跳过闸门。
        </span>
      </label>

      <details className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900/40 md:col-span-2">
        <summary className="cursor-pointer font-medium text-neutral-800 dark:text-neutral-200">
          高级：质量闸门 override
        </summary>
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          仅在服务器配置了 QUALITY_GATE_OVERRIDE_SECRET 时生效：勾选并填写相同 secret
          可跳过闸门（服务端会打结构化 warn 日志）。
        </p>
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" name="quality_gate_override" value="1" />
          <span>启用 override</span>
        </label>
        <label className="mt-2 flex flex-col gap-1">
          <span className="text-xs text-neutral-600 dark:text-neutral-400">override secret</span>
          <input
            type="password"
            name="quality_gate_override_secret"
            autoComplete="off"
            className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs dark:border-neutral-700"
            placeholder="与 QUALITY_GATE_OVERRIDE_SECRET 一致"
          />
        </label>
      </details>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">canonical_url（发布后必填，HTTPS）</span>
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="canonical_url"
          defaultValue={defaults.canonicalUrl}
          placeholder="https://zimomo.fans/articles/..."
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">
          primary_source_url（可追溯来源，发布后必填，HTTPS）
        </span>
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="primary_source_url"
          defaultValue={defaults.primarySourceUrl}
          placeholder="https://..."
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">og_title（可选）</span>
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="og_title"
          defaultValue={defaults.ogTitle}
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">og_description（可选）</span>
        <textarea
          className="min-h-20 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="og_description"
          defaultValue={defaults.ogDescription}
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">og_image_url（可选，HTTPS）</span>
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="og_image_url"
          defaultValue={defaults.ogImageUrl}
          placeholder="https://..."
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">
          tags（可选，逗号分隔 slug，如 blind-box,community）
        </span>
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          name="tags"
          defaultValue={defaults.tags}
          placeholder="labubu, zimomo"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <details className="rounded-md border border-sky-200 bg-sky-50/70 p-3 text-sm md:col-span-2 dark:border-sky-900/50 dark:bg-sky-950/25">
        <summary className="cursor-pointer font-medium text-neutral-800 dark:text-neutral-200">
          编辑部常见问题（访客页可选）
        </summary>
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          与后台「摘要/FAQ」LLM 草案（enrich_draft）互不自动同步；仅在审核后在此填写才会对访客展示。双空视为未配置。最多 {EDITORIAL_FAQ_MAX_ITEMS} 条。
        </p>
        <div className="mt-4 space-y-4">
          {defaults.faqSlots.map((slot, i) => (
            <div
              className="rounded-md border border-neutral-200 bg-white/90 p-3 dark:border-neutral-700 dark:bg-neutral-900/50"
              key={i}
            >
              <p className="mb-2 text-xs font-medium text-neutral-500">
                第 {i + 1} 组
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-neutral-600 dark:text-neutral-400">问题</span>
                <input
                  autoComplete="off"
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700"
                  defaultValue={slot.question}
                  name={`faq_q_${i}`}
                  spellCheck={false}
                  type="text"
                />
              </label>
              <label className="mt-2 flex flex-col gap-1">
                <span className="text-xs text-neutral-600 dark:text-neutral-400">回答</span>
                <textarea
                  className="min-h-16 rounded-md border border-neutral-300 px-2 py-1.5 text-sm dark:border-neutral-700"
                  defaultValue={slot.answer}
                  name={`faq_a_${i}`}
                />
              </label>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

export function CreateArticleForm() {
  const [state, action, pending] = useActionState(
    createArticleAction,
    null
  );

  return (
    <form action={action} className="space-y-6">
      <Feedback state={state} />
      <Fields defaults={emptyArticleDefaults} />

      <div className="flex flex-wrap gap-3">
        <button
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          type="submit"
        >
          {pending ? "保存中…" : "保存"}
        </button>

        <Link
          href="/admin"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        >
          取消
        </Link>
      </div>
    </form>
  );
}

export function EditArticleForm(props: {
  articleId: string;
  defaults: ArticleFormValues;
}) {
  const boundAction = useMemo(
    () => (prev: ArticleActionState | null, formData: FormData) =>
      updateArticleAction(props.articleId, prev, formData),
    [props.articleId]
  );

  const [state, action, pending] = useActionState(boundAction, null);

  return (
    <form action={action} className="space-y-6">
      <Feedback state={state} />
      <Fields defaults={props.defaults} />

      <div className="flex flex-wrap gap-3">
        <button
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          type="submit"
        >
          {pending ? "保存中…" : "保存修改"}
        </button>

        <Link
          href="/admin"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        >
          返回列表
        </Link>
      </div>
    </form>
  );
}
