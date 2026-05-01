"use server";

import { revalidatePath } from "next/cache";

import { runEnrichArticleDraft } from "@/lib/enrich/worker";
import { assertAdminSession } from "@/lib/auth/session";

export type GenerateEnrichDraftState =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function generateArticleEnrichDraftAction(
  articleId: string
): Promise<GenerateEnrichDraftState> {
  try {
    await assertAdminSession();
  } catch {
    return { ok: false, error: "登录状态已失效，请重新登录。" };
  }

  const id = articleId.trim();
  if (!id) {
    return { ok: false, error: "缺少文章 id。" };
  }

  const result = await runEnrichArticleDraft(id);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/articles/${id}/edit`);

  return { ok: true, message: "摘要与 FAQ 草案已写入 enrich_draft，请人工复核后再决定是否写入正文或摘要字段。" };
}
