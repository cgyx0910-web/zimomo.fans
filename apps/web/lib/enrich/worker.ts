import { eq } from "drizzle-orm";

import { articles, type ArticleEnrichDraftJson } from "@guge/db/schema";
import { getDb } from "@guge/db";

import { extractJsonObjectString } from "@/lib/enrich/json-parse";
import { getConfiguredLlmModelLabel, postChatCompletions } from "@/lib/enrich/llm-client";
import { buildEnrichUserMessage, ENRICH_SYSTEM_PROMPT } from "@/lib/enrich/prompt";
import { llmEnrichPayloadSchema, toStoredEnrichDraft } from "@/lib/enrich/types";

export type EnrichWorkerResult =
  | { ok: true; draft: ArticleEnrichDraftJson }
  | { ok: false; error: string };

function readBodyMaxChars(): number {
  const raw = process.env.ENRICH_BODY_MAX_CHARS?.trim();
  if (!raw) {
    return 12_000;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 500 || n > 100_000) {
    return 12_000;
  }
  return n;
}

function truncateForPrompt(body: string | null): string {
  if (!body?.trim()) {
    return "";
  }
  const max = readBodyMaxChars();
  if (body.length <= max) {
    return body;
  }
  return `${body.slice(0, max)}\n\n[正文已在服务端截断，总长 ${body.length} 字]`;
}

/**
 * 拉取文章、调用 LLM、校验 JSON，并写入 `articles.enrich_draft`（仅此列）。
 */
export async function runEnrichArticleDraft(articleId: string): Promise<EnrichWorkerResult> {
  const db = getDb();
  const rows = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  const row = rows[0];
  if (!row) {
    return { ok: false, error: "文章不存在。" };
  }

  const title = row.title?.trim() || "";
  const body = row.body ?? "";
  const primary = row.primarySourceUrl?.trim() || null;

  const sourceUrls: string[] = [];
  if (primary) {
    sourceUrls.push(primary);
  }

  let rawContent: string;
  try {
    rawContent = await postChatCompletions([
      { role: "system", content: ENRICH_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildEnrichUserMessage({
          title,
          bodyExcerpt: truncateForPrompt(body),
          primarySourceUrl: primary,
        }),
      },
    ]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "LLM 调用失败";
    return { ok: false, error: msg };
  }

  let jsonStr: string;
  try {
    jsonStr = extractJsonObjectString(rawContent);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "JSON 提取失败";
    return { ok: false, error: msg };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr) as unknown;
  } catch {
    return { ok: false, error: "模型返回的 JSON 无法解析。" };
  }

  const parsedLlm = llmEnrichPayloadSchema.safeParse(parsed);
  if (!parsedLlm.success) {
    return { ok: false, error: "模型 JSON 结构不符合预期。" };
  }

  const draft = toStoredEnrichDraft(parsedLlm.data, {
    sourceUrls,
    model: getConfiguredLlmModelLabel(),
  });

  try {
    await db
      .update(articles)
      .set({ enrichDraft: draft, updatedAt: new Date() })
      .where(eq(articles.id, articleId));
  } catch (e: unknown) {
    console.error(e);
    return { ok: false, error: "写入 enrich_draft 失败。" };
  }

  return { ok: true, draft };
}
