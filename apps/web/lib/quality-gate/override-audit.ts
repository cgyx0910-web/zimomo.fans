import { eq } from "drizzle-orm";

import { articles } from "@guge/db/schema";
import type { QualityGateOverrideEventJson } from "@guge/db/schema";
import { getDb } from "@guge/db";

const MAX_EVENTS = 20;

/**
 * 在已通过 override 跳过闸门并成功写入文章后，追加一条持久化审计记录。
 */
export async function appendQualityGateOverrideEvent(
  articleId: string,
  slug: string
): Promise<void> {
  const db = getDb();
  const rows = await db
    .select({ ev: articles.qualityGateOverrideEvents })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  const prev = rows[0]?.ev ?? [];
  const entry: QualityGateOverrideEventJson = {
    at: new Date().toISOString(),
    slug,
    article_id: articleId,
  };
  const next = [...prev, entry].slice(-MAX_EVENTS);
  await db
    .update(articles)
    .set({ qualityGateOverrideEvents: next, updatedAt: new Date() })
    .where(eq(articles.id, articleId));
}
