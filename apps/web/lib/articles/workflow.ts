import { z } from "zod";

import { articleWorkflowStatuses } from "@guge/db/schema";
import type { ArticleWorkflowStatus } from "@guge/db/schema";

export type { ArticleWorkflowStatus };

const workflowEnumTuple = articleWorkflowStatuses as unknown as [
  ArticleWorkflowStatus,
  ...ArticleWorkflowStatus[],
];

/** 与 DB `article_status` 枚举一致（字面量来自 `articleWorkflowStatuses`） */
export const articleWorkflowStatusSchema = z.enum(workflowEnumTuple);

export function parseArticleWorkflowStatusFromForm(formData: FormData): ArticleWorkflowStatus {
  const entry = formData.get("status");
  const raw = typeof entry === "string" ? entry.trim() : "";
  const normalized = raw.length ? raw : "draft";
  return articleWorkflowStatusSchema.parse(normalized);
}
