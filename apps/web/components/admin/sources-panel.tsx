"use client";

import { useActionState, useState, useTransition } from "react";

import type { InferSelectModel } from "drizzle-orm";

import { sources } from "@guge/db/schema";

import {
  createSourceAction,
  type SourceActionState,
  runIngestNowAction,
  toggleSourceActiveAction,
} from "@/actions/source-actions";
import { runClusterNowAction } from "@/actions/cluster-actions";
import { runNormalizeNowAction } from "@/actions/normalize-actions";

type SourceRow = InferSelectModel<typeof sources>;

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

function ErrorBox({ state }: { state: SourceActionState | null }) {
  const fieldEntries = Object.entries(state?.fieldErrors ?? {});
  if (!state?.error && fieldEntries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      {state?.error ? <p className="font-medium">{state.error}</p> : null}
      {fieldEntries.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5">
          {fieldEntries.map(([key, message]) => (
            <li key={key}>
              <span className="font-medium">{key}</span>: {message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function SourcesPanel({ rows }: { rows: SourceRow[] }) {
  const [state, action, pending] = useActionState(createSourceAction, null);
  const [ingestResult, setIngestResult] = useState<string | null>(null);
  const [normalizeResult, setNormalizeResult] = useState<string | null>(null);
  const [clusterResult, setClusterResult] = useState<string | null>(null);
  const [running, startTransition] = useTransition();

  function runNow() {
    startTransition(async () => {
      const result = await runIngestNowAction();
      if ("error" in result) {
        setIngestResult(result.error);
        return;
      }
      setIngestResult(
        `完成：成功 ${result.summary.successCount}，失败 ${result.summary.failedCount}，落库 ${result.summary.totalStoredCount} 条，总耗时 ${result.summary.durationMs}ms。`
      );
    });
  }

  function runNormalize() {
    startTransition(async () => {
      const result = await runNormalizeNowAction();
      if ("error" in result) {
        setNormalizeResult(result.error);
        return;
      }
      setNormalizeResult(
        `Normalize 完成：扫描 ${result.summary.scannedCount}，成功 ${result.summary.successCount}，失败 ${result.summary.failedCount}，耗时 ${result.summary.durationMs}ms。`
      );
    });
  }

  function runCluster() {
    startTransition(async () => {
      const result = await runClusterNowAction();
      if ("error" in result) {
        setClusterResult(result.error);
        return;
      }
      setClusterResult(
        `Cluster 完成：扫描 ${result.summary.scannedCount}，URL 命中 ${result.summary.joinedByUrlCount}，相似归桶 ${result.summary.joinedBySimhashCount}，新建 ${result.summary.createdCount}，耗时 ${result.summary.durationMs}ms。`
      );
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">新增 RSS 来源</h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              仅白名单来源会被 ingest worker 拉取。B1 不发布公网内容。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-neutral-700"
              disabled={running}
              onClick={runNow}
              type="button"
            >
              {running ? "执行中…" : "立即执行 ingest"}
            </button>
            <button
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-neutral-700"
              disabled={running}
              onClick={runNormalize}
              type="button"
            >
              {running ? "执行中…" : "立即执行 normalize"}
            </button>
            <button
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-neutral-700"
              disabled={running}
              onClick={runCluster}
              type="button"
            >
              {running ? "执行中…" : "立即执行 cluster"}
            </button>
          </div>
        </div>

        {ingestResult ? (
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{ingestResult}</p>
        ) : null}
        {normalizeResult ? (
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            {normalizeResult}
          </p>
        ) : null}
        {clusterResult ? (
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{clusterResult}</p>
        ) : null}

        <form action={action} className="grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-1 md:col-span-1">
            <span className="text-sm font-medium">来源名称</span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              name="name"
              placeholder="例如：官方新闻"
              required
            />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm font-medium">Feed URL（http/https）</span>
            <input
              className="rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700"
              name="feed_url"
              placeholder="https://example.com/rss.xml"
              required
            />
          </label>
          <div className="md:col-span-3">
            <button
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
              disabled={pending}
              type="submit"
            >
              {pending ? "保存中…" : "加入白名单"}
            </button>
          </div>
        </form>
        <ErrorBox state={state} />
      </section>

      <section className="overflow-x-auto rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-300">
            <tr>
              <th className="px-3 py-3">名称</th>
              <th className="px-3 py-3">Feed URL</th>
              <th className="px-3 py-3">状态</th>
              <th className="px-3 py-3">上次抓取</th>
              <th className="px-3 py-3">结果</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-neutral-600" colSpan={6}>
                  暂无来源，请先添加白名单 feed。
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr className="border-t border-neutral-100 dark:border-neutral-900" key={row.id}>
                  <td className="px-3 py-3">{row.name}</td>
                  <td className="px-3 py-3 font-[family-name:var(--font-geist-mono)] text-xs">
                    {row.feedUrl}
                  </td>
                  <td className="px-3 py-3">{row.isActive ? "active" : "paused"}</td>
                  <td className="px-3 py-3">{formatDt(row.lastFetchedAt)}</td>
                  <td className="px-3 py-3">
                    {row.lastStatus ? (
                      <div>
                        <div>{row.lastStatus}</div>
                        {row.lastError ? (
                          <div className="max-w-[30ch] truncate text-xs text-red-600 dark:text-red-400">
                            {row.lastError}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <form action={toggleSourceActiveAction}>
                      <input name="source_id" type="hidden" value={row.id} />
                      <input name="next_active" type="hidden" value={String(!row.isActive)} />
                      <button className="text-sm underline" type="submit">
                        {row.isActive ? "暂停" : "启用"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
