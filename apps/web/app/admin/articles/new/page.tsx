import type { Metadata } from "next";

import { CreateArticleForm } from "@/components/admin/article-form";

export const metadata: Metadata = {
  title: "新建资讯 · 后台",
};

export default function NewArticlePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">新建资讯</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          草稿可仅存 slug；发布后系统会校验标题、正文、HTTPS canonical 与来源 URL。
        </p>
      </div>

      <CreateArticleForm />
    </div>
  );
}
