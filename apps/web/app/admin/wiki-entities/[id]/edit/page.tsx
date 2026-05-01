import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  DeleteWikiEntityButton,
  EditWikiEntityForm,
  wikiRowToFormDefaults,
} from "@/components/admin/wiki-entity-form";
import { getWikiEntityById } from "@/lib/wiki/queries";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  return {
    title: `编辑百科 ${params.id} · 后台`,
  };
}

export default async function EditWikiEntityPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const row = await getWikiEntityById(params.id);
  if (!row) {
    notFound();
  }

  const defaults = wikiRowToFormDefaults(row);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">编辑百科条目</h1>
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          id: <span className="font-mono">{row.id}</span>
        </p>
      </div>

      <EditWikiEntityForm defaults={defaults} entityId={row.id} />

      <div className="flex flex-wrap items-center gap-6 border-t border-neutral-200 pt-6 dark:border-neutral-800">
        <DeleteWikiEntityButton entityId={row.id} slug={row.slug} />
        <Link
          className="text-sm text-neutral-600 underline dark:text-neutral-400"
          href="/wiki"
          rel="noopener noreferrer"
          target="_blank"
        >
          访客列表
        </Link>
        <Link
          className="text-sm text-neutral-600 underline dark:text-neutral-400"
          href={`/wiki/${row.slug}`}
          rel="noopener noreferrer"
          target="_blank"
        >
          访客详情（若为已发布）
        </Link>
      </div>
    </div>
  );
}
