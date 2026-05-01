"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  addClusterItemAction,
  removeClusterItemAction,
  setClusterPrimaryAction,
  updateClusterMetaAction,
  searchOrphanContentItemsAction,
  searchArticlesForClusterAdminAction,
  type ClusterActionState,
} from "@/actions/cluster-actions";
import type { ClusterAdminDetail, ClusterMemberAdminRow } from "@/lib/clusters/queries";

function MetaFeedback({ state }: { state: ClusterActionState | null }) {
  if (!state?.error && !state?.fieldErrors) {
    return null;
  }
  const fieldEntries = Object.entries(state?.fieldErrors ?? {});
  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      {state?.error ? <p className="font-medium">{state.error}</p> : null}
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

function formatDt(value: Date | string | null | undefined): string {
  if (!value) {
    return "-";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ClusterEditor(props: { cluster: ClusterAdminDetail; members: ClusterMemberAdminRow[] }) {
  const router = useRouter();
  const [metaState, metaAction, metaPending] = useActionState(updateClusterMetaAction, null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [searchQ, setSearchQ] = useState("");
  const [orphans, setOrphans] = useState<
    Awaited<ReturnType<typeof searchOrphanContentItemsAction>>
  >([]);
  const [articleSearchQ, setArticleSearchQ] = useState("");
  const [articleCandidates, setArticleCandidates] = useState<
    Awaited<ReturnType<typeof searchArticlesForClusterAdminAction>>
  >([]);
  const [publishedArticleDraft, setPublishedArticleDraft] = useState(
    () => props.cluster.publishedArticleId ?? ""
  );
  const wasMetaPending = useRef(false);

  useEffect(() => {
    setPublishedArticleDraft(props.cluster.publishedArticleId ?? "");
  }, [props.cluster.publishedArticleId]);

  useEffect(() => {
    if (wasMetaPending.current && !metaPending) {
      if (metaState && !metaState.error && !metaState.fieldErrors) {
        router.refresh();
      }
    }
    wasMetaPending.current = metaPending;
  }, [metaPending, metaState, router]);

  function fdFrom(entries: Record<string, string>): FormData {
    const fd = new FormData();
    for (const [k, v] of Object.entries(entries)) {
      fd.set(k, v);
    }
    return fd;
  }

  async function runMember(
    fn: (fd: FormData) => Promise<ClusterActionState>,
    entries: Record<string, string>
  ) {
    setFlash(null);
    startTransition(async () => {
      const r = await fn(fdFrom(entries));
      if (r?.error) {
        setFlash(r.error);
        return;
      }
      router.refresh();
    });
  }

  async function handleSearch() {
    setFlash(null);
    startTransition(async () => {
      try {
        const rows = await searchOrphanContentItemsAction(searchQ);
        setOrphans(rows);
      } catch {
        setFlash("搜索失败。");
      }
    });
  }

  async function handleArticleSearch() {
    setFlash(null);
    startTransition(async () => {
      try {
        const rows = await searchArticlesForClusterAdminAction(articleSearchQ);
        setArticleCandidates(rows);
      } catch {
        setFlash("主文搜索失败。");
      }
    });
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">编辑 Cluster</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            id: <span className="font-mono text-xs">{props.cluster.id}</span>
          </p>
        </div>
        <Link className="text-sm underline" href="/admin/clusters">
          返回列表
        </Link>
      </div>

      {flash ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
          {flash}
        </div>
      ) : null}

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-base font-semibold">元信息</h2>
        {props.cluster.publishedArticle ? (
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            当前关联主文：<span className="font-mono">{props.cluster.publishedArticle.slug}</span>（
            {props.cluster.publishedArticle.status}）{" "}
            <Link
              className="underline"
              href={`/admin/articles/${props.cluster.publishedArticle.id}/edit`}
            >
              后台编辑主文
            </Link>
          </p>
        ) : null}
        <MetaFeedback state={metaState} />
        <form action={metaAction} className="grid gap-4 md:grid-cols-2">
          <input name="cluster_id" type="hidden" value={props.cluster.id} />
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm font-medium">slug（公开 URL 段）</span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm dark:border-neutral-700"
              name="slug"
              required
              defaultValue={props.cluster.slug}
              spellCheck={false}
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm font-medium">标题（Hub 标题）</span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              name="title"
              defaultValue={props.cluster.title ?? ""}
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm font-medium">摘要（编辑部手填，非 UGC）</span>
            <textarea
              className="min-h-24 rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              name="summary"
              defaultValue={props.cluster.summary ?? ""}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">状态</span>
            <select
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              name="status"
              defaultValue={props.cluster.status}
            >
              <option value="draft">draft（仅后台）</option>
              <option value="merged">merged（公开 Hub + sitemap）</option>
              <option value="archived">archived（隐藏）</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm font-medium">主 content_item（UUID）</span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs dark:border-neutral-700"
              name="primary_content_item_id"
              defaultValue={props.cluster.primaryContentItemId ?? ""}
              placeholder="merged 时必填"
              spellCheck={false}
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm font-medium">关联主文 article（UUID，可选）</span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs dark:border-neutral-700"
              name="published_article_id"
              onChange={(e) => setPublishedArticleDraft(e.target.value)}
              placeholder="留空表示不关联；主文已 published 时 Hub canonical 指向主文且不进 sitemap"
              spellCheck={false}
              value={publishedArticleDraft}
            />
            <span className="text-xs text-neutral-500">
              C4：与站内「全文」主文绑定；主文发布后搜索引擎以主文 URL 为权威收录，Hub 仍可对访客开放多源时间线。
            </span>
          </label>
          <div className="md:col-span-2">
            <button
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
              disabled={metaPending}
              type="submit"
            >
              {metaPending ? "保存中…" : "保存元信息"}
            </button>
          </div>
        </form>
        <div className="space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-900">
          <h3 className="text-sm font-medium">搜索主文 candidate</h3>
          <div className="flex flex-wrap gap-2">
            <input
              className="min-w-[12rem] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
              onChange={(e) => setArticleSearchQ(e.target.value)}
              placeholder="标题或 slug 关键词（可留空取最近）"
              value={articleSearchQ}
            />
            <button
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-neutral-700"
              disabled={pending}
              onClick={() => void handleArticleSearch()}
              type="button"
            >
              搜索主文
            </button>
          </div>
          {articleCandidates.length === 0 ? (
            <p className="text-xs text-neutral-500">点击「搜索主文」加载候选；点选一行可将 UUID 复制到上方字段后保存元信息。</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {articleCandidates.map((a) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2 dark:border-neutral-900"
                  key={a.id}
                >
                  <div>
                    <div className="font-medium">{a.title ?? "(无标题)"}</div>
                    <div className="font-mono text-xs text-neutral-600">
                      {a.slug} · {a.status}
                    </div>
                    <div className="font-mono text-xs text-neutral-500">{a.id}</div>
                  </div>
                  <button
                    className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
                    type="button"
                    onClick={() => {
                      setPublishedArticleDraft(a.id);
                      setFlash("已填入主文 UUID，请点击「保存元信息」。");
                    }}
                  >
                    填入此主文
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-base font-semibold">成员</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300">
              <tr>
                <th className="px-3 py-2">来源</th>
                <th className="px-3 py-2">标题</th>
                <th className="px-3 py-2">role</th>
                <th className="px-3 py-2">发布</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {props.members.map((m) => (
                <tr className="border-t border-neutral-100 dark:border-neutral-900" key={m.contentItemId}>
                  <td className="px-3 py-2">{m.sourceName}</td>
                  <td className="max-w-[14rem] truncate px-3 py-2">{m.title ?? "(无标题)"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{m.role}</td>
                  <td className="px-3 py-2">{formatDt(m.publishedAt)}</td>
                  <td className="space-x-2 space-y-1 px-3 py-2">
                    {m.role !== "excluded" ? (
                      <button
                        className="text-xs underline disabled:opacity-50"
                        disabled={pending || m.role === "primary"}
                        onClick={() =>
                          void runMember(setClusterPrimaryAction, {
                            cluster_id: props.cluster.id,
                            content_item_id: m.contentItemId,
                          })
                        }
                        type="button"
                      >
                        设为主项
                      </button>
                    ) : null}
                    <button
                      className="text-xs underline disabled:opacity-50"
                      disabled={pending}
                      onClick={() =>
                        void runMember(removeClusterItemAction, {
                          cluster_id: props.cluster.id,
                          content_item_id: m.contentItemId,
                          mode: "exclude",
                        })
                      }
                      type="button"
                    >
                      排除
                    </button>
                    <button
                      className="text-xs underline disabled:opacity-50"
                      disabled={pending}
                      onClick={() =>
                        void runMember(removeClusterItemAction, {
                          cluster_id: props.cluster.id,
                          content_item_id: m.contentItemId,
                          mode: "detach",
                        })
                      }
                      type="button"
                    >
                      移出
                    </button>
                    <button
                      className="text-xs underline disabled:opacity-50"
                      disabled={pending}
                      onClick={() =>
                        void runMember(removeClusterItemAction, {
                          cluster_id: props.cluster.id,
                          content_item_id: m.contentItemId,
                          mode: "spinoff",
                        })
                      }
                      type="button"
                    >
                      拆分为新 cluster
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="text-base font-semibold">加入成员（未入桶 content_items）</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[12rem] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="标题或 URL 关键词（可留空）"
            value={searchQ}
          />
          <button
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-neutral-700"
            disabled={pending}
            onClick={() => void handleSearch()}
            type="button"
          >
            搜索
          </button>
        </div>
        {orphans.length === 0 ? (
          <p className="text-sm text-neutral-500">点击「搜索」加载未入桶条目（关键词可留空）。</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {orphans.map((o) => (
              <li
                className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2 dark:border-neutral-900"
                key={o.id}
              >
                <div>
                  <div className="font-medium">{o.title ?? "(无标题)"}</div>
                  <div className="text-xs text-neutral-500">{o.sourceName}</div>
                  <div className="break-all font-mono text-xs text-neutral-600">{o.sourceUrl ?? "-"}</div>
                </div>
                <button
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs dark:border-neutral-700"
                  disabled={pending}
                  onClick={() =>
                    void runMember(addClusterItemAction, {
                      cluster_id: props.cluster.id,
                      content_item_id: o.id,
                    })
                  }
                  type="button"
                >
                  加入
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {props.cluster.status === "merged" ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          公开页：{" "}
          <Link className="underline" href={`/clusters/${props.cluster.slug}`} rel="noopener noreferrer" target="_blank">
            /clusters/{props.cluster.slug}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
