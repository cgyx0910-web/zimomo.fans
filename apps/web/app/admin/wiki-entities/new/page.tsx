import type { Metadata } from "next";

import { CreateWikiEntityForm } from "@/components/admin/wiki-entity-form";

export const metadata: Metadata = {
  title: "新建百科 · 后台",
};

export default function NewWikiEntityPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">新建百科条目</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          导语与正文在发布时需满足最短长度校验；请以可追溯来源补强事实。
        </p>
      </div>

      <CreateWikiEntityForm />
    </div>
  );
}
