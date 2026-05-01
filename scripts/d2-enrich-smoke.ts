/**
 * D2 verify：纯逻辑（无外网），由 verify-phase-d2.mjs 在 build 后调用。
 */
import { extractJsonObjectString } from "../apps/web/lib/enrich/json-parse";
import { llmEnrichPayloadSchema, toStoredEnrichDraft } from "../apps/web/lib/enrich/types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function main(): void {
  const raw = '前缀 ```json\n{"summary":"短摘要","faq":[{"question":"Q?","answer":"A."}],"warnings":["须人工核对事实"]}\n``` 后缀';
  const extracted = extractJsonObjectString(raw);
  const parsed = JSON.parse(extracted) as unknown;
  const z = llmEnrichPayloadSchema.safeParse(parsed);
  assert(z.success, "zod 应解析 LLM 形状");
  const stored = toStoredEnrichDraft(z.data, {
    sourceUrls: ["https://example.com/source"],
    model: "test-model",
  });
  assert(stored.summary === "短摘要", "summary");
  assert(stored.faq.length === 1 && stored.faq[0].question === "Q?", "faq");
  assert(stored.source_urls[0] === "https://example.com/source", "source_urls");
  assert(stored.model === "test-model", "model");
  assert(typeof stored.generated_at === "string", "generated_at");

  const bare = '{"summary":null,"faq":[]}';
  const z2 = llmEnrichPayloadSchema.safeParse(JSON.parse(bare) as unknown);
  assert(z2.success, "nullable summary");
  const s2 = toStoredEnrichDraft(z2.data, { sourceUrls: [], model: null });
  assert(s2.summary === null, "null summary");
}

try {
  main();
  console.log("[d2-enrich-smoke] ok");
} catch (e: unknown) {
  console.error("[d2-enrich-smoke] failed:", e);
  process.exitCode = 1;
}
