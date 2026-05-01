import { z } from "zod";

import type { ArticleEnrichDraftJson } from "@guge/db/schema";

/** LLM 原始 JSON（不含服务端补全字段） */
export const llmEnrichPayloadSchema = z.object({
  summary: z.union([z.string(), z.null()]).optional(),
  faq: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string(),
      })
    )
    .optional(),
  warnings: z.array(z.string()).optional(),
});

export type LlmEnrichPayload = z.infer<typeof llmEnrichPayloadSchema>;

export function toStoredEnrichDraft(
  parsed: LlmEnrichPayload,
  ctx: {
    sourceUrls: string[];
    model: string | null;
  }
): ArticleEnrichDraftJson {
  const rawSummary = parsed.summary === undefined ? null : parsed.summary;
  const summary =
    rawSummary === null ? null : String(rawSummary).trim() ?
      String(rawSummary).trim()
    : null;

  const faqRaw = parsed.faq ?? [];
  const faq = faqRaw.map((x) => ({
    question: String(x.question).trim(),
    answer: String(x.answer).trim(),
  }));

  const out: ArticleEnrichDraftJson = {
    summary,
    faq,
    source_urls: ctx.sourceUrls,
    model: ctx.model,
    generated_at: new Date().toISOString(),
  };
  if (parsed.warnings?.length) {
    out.warnings = parsed.warnings;
  }
  return out;
}
