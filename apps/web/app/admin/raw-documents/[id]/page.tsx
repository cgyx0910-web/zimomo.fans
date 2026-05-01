import Link from "next/link";
import { notFound } from "next/navigation";

import { getRawDocumentDetailById } from "@/lib/ingest/queries";
import { readLocalBlobXml, truncateForDisplay } from "@/lib/normalize/blob-reader";

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

export default async function AdminRawDocumentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const detail = await getRawDocumentDetailById(id);
  if (!detail) {
    notFound();
  }

  let rawXml = "无法读取 raw XML（仅支持本地 blob）。";
  if (detail.storageKind === "local") {
    try {
      rawXml = truncateForDisplay(await readLocalBlobXml(detail.storageKey));
    } catch (error) {
      rawXml = `读取失败：${error instanceof Error ? error.message : "unknown error"}`;
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Raw Document 详情</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            审查原始 XML 与提取文本，仍处于内部流程，不提供公开入口。
          </p>
        </div>
        <Link className="text-sm underline" href="/admin/raw-documents">
          返回列表
        </Link>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="mb-3 text-sm font-semibold">元数据</h2>
        <dl className="grid gap-2 text-sm md:grid-cols-2">
          <div>
            <dt className="text-neutral-500">来源</dt>
            <dd>{detail.sourceName}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">状态</dt>
            <dd>{detail.status}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">标题</dt>
            <dd>{detail.title ?? "(无标题)"}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">source_url</dt>
            <dd className="break-all font-[family-name:var(--font-geist-mono)] text-xs">
              {detail.sourceUrl ?? "-"}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">抓取时间</dt>
            <dd>{formatDt(detail.fetchedAt)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">发布时间</dt>
            <dd>{formatDt(detail.publishedAt)}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Blob</dt>
            <dd className="break-all font-[family-name:var(--font-geist-mono)] text-xs">
              {detail.storageKind}:{detail.storageKey} ({detail.blobSize}B)
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">提取状态</dt>
            <dd>
              {detail.contentItemId ?
                `${detail.normalizedStatus ?? "ingested"}（更新 ${formatDt(detail.contentItemUpdatedAt)}）`
              : "未生成 content_item"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="mb-3 text-sm font-semibold">parseMeta</h2>
        <pre className="max-h-64 overflow-auto rounded-md bg-neutral-100 p-3 text-xs dark:bg-neutral-900">
          {JSON.stringify(detail.parseMeta, null, 2)}
        </pre>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="mb-3 text-sm font-semibold">Normalized Text</h2>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-neutral-100 p-3 text-xs dark:bg-neutral-900">
          {detail.normalizedText ?? "暂无提取文本。"}
        </pre>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
        <h2 className="mb-3 text-sm font-semibold">Raw XML</h2>
        <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md bg-neutral-100 p-3 text-xs dark:bg-neutral-900">
          {rawXml}
        </pre>
      </section>
    </div>
  );
}
