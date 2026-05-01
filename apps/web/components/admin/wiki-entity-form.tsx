"use client";

import Link from "next/link";
import { useActionState, useMemo } from "react";

import { wikiEntities } from "@guge/db/schema";

import {
  createWikiEntityAction,
  deleteWikiEntityAction,
  updateWikiEntityAction,
  type WikiEntityActionState,
} from "@/actions/wiki-entity-actions";
import {
  EDITORIAL_FAQ_MAX_ITEMS,
  padEditorialFaqSlotsForForm,
} from "@/lib/faq/editorial-faq";
import {
  WIKI_BODY_MIN_PUBLISHED_LENGTH,
  WIKI_LEAD_MIN_PUBLISHED_LENGTH,
} from "@/lib/wiki/constants";

export type WikiEntityRow = typeof wikiEntities.$inferSelect;

export type WikiEntityFormValues = {
  slug: string;
  title: string;
  subtitle: string;
  lead: string;
  body: string;
  sourceUrl: string;
  status: "draft" | "published";
  faqSlots: { question: string; answer: string }[];
};

export const emptyWikiEntityDefaults: WikiEntityFormValues = {
  slug: "",
  title: "",
  subtitle: "",
  lead: "",
  body: "",
  sourceUrl: "",
  status: "draft",
  faqSlots: padEditorialFaqSlotsForForm(null),
};

export function wikiRowToFormDefaults(row: WikiEntityRow): WikiEntityFormValues {
  return {
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? "",
    lead: row.lead,
    body: row.body ?? "",
    sourceUrl: row.sourceUrl ?? "",
    status: row.status === "published" ? "published" : "draft",
    faqSlots: padEditorialFaqSlotsForForm(row.editorialFaq),
  };
}

function Feedback({ state }: { state: WikiEntityActionState | null }) {
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

function Fields({ defaults }: { defaults: WikiEntityFormValues }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">slug</span>
        <input
          autoComplete="off"
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          defaultValue={defaults.slug}
          name="slug"
          placeholder="the-monsters-labubu"
          required
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
          defaultValue={defaults.title}
          name="title"
          required
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">副标题（可选）</span>
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          defaultValue={defaults.subtitle}
          name="subtitle"
          placeholder="粉丝向档案 · 可随时修订"
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">导语（SEO，发布至少 {WIKI_LEAD_MIN_PUBLISHED_LENGTH} 字）</span>
        <textarea
          className="min-h-24 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          defaultValue={defaults.lead}
          name="lead"
          placeholder="用 1–2 段独立概括本条目的独特信息，勿留空。"
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">
          正文（发布至少 {WIKI_BODY_MIN_PUBLISHED_LENGTH} 字）
        </span>
        <textarea
          className="min-h-72 rounded-md border border-neutral-300 px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm dark:border-neutral-700"
          defaultValue={defaults.body}
          name="body"
          placeholder="概述、有据可查的结构化段落；可先手写 Markdown 语法的纯文本。"
        />
      </label>

      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-sm font-medium">主要来源 URL（可选，HTTPS）</span>
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          defaultValue={defaults.sourceUrl}
          name="source_url"
          placeholder="https://..."
        />
      </label>

      <details className="rounded-md border border-sky-200 bg-sky-50/70 p-3 text-sm md:col-span-2 dark:border-sky-900/50 dark:bg-sky-950/25">
        <summary className="cursor-pointer font-medium text-neutral-800 dark:text-neutral-200">
          编辑部常见问题（访客页可选）
        </summary>
        <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          与 LLM enrich 摘要草案无关；仅在此填写后对访客展示。最多 {EDITORIAL_FAQ_MAX_ITEMS} 条。
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

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">状态</span>
        <select
          className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
          defaultValue={defaults.status}
          name="status"
        >
          <option value="draft">草稿</option>
          <option value="published">已发布（访客 / sitemap）</option>
        </select>
      </label>
    </div>
  );
}

export function CreateWikiEntityForm() {
  const defaults = emptyWikiEntityDefaults;
  const [state, action, pending] = useActionState(
    createWikiEntityAction,
    null
  );

  return (
    <form action={action} className="space-y-6">
      <Feedback state={state} />
      <Fields defaults={defaults} />

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          disabled={pending}
          type="submit"
        >
          {pending ? "保存中…" : "保存"}
        </button>

        <Link
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
          href="/admin/wiki-entities"
        >
          取消
        </Link>
      </div>
    </form>
  );
}

export function EditWikiEntityForm(props: {
  entityId: string;
  defaults: WikiEntityFormValues;
}) {
  const boundAction = useMemo(
    () => (prev: WikiEntityActionState | null, formData: FormData) =>
      updateWikiEntityAction(props.entityId, prev, formData),
    [props.entityId]
  );

  const [state, action, pending] = useActionState(boundAction, null);

  return (
    <form action={action} className="space-y-6">
      <Feedback state={state} />
      <Fields defaults={props.defaults} />

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          disabled={pending}
          type="submit"
        >
          {pending ? "保存中…" : "保存修改"}
        </button>

        <Link
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
          href="/admin/wiki-entities"
        >
          返回列表
        </Link>
      </div>
    </form>
  );
}

export function DeleteWikiEntityButton(props: {
  entityId: string;
  slug: string;
}) {
  return (
    <form
      action={deleteWikiEntityAction.bind(null, props.entityId, props.slug)}
      className="inline"
    >
      <button
        className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-800 hover:bg-red-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950/40"
        type="submit"
      >
        删除此条目
      </button>
    </form>
  );
}
