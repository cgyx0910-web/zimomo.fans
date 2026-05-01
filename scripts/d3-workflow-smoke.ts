/**
 * D3 verify：工作流状态解析（无 DB），由 verify-phase-d3.mjs 在 build 后调用。
 */
import {
  articleWorkflowStatusSchema,
  parseArticleWorkflowStatusFromForm,
} from "../apps/web/lib/articles/workflow";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function formWithStatus(status: string): FormData {
  const fd = new FormData();
  fd.set("status", status);
  return fd;
}

function main(): void {
  assert(
    articleWorkflowStatusSchema.safeParse("draft").success &&
      articleWorkflowStatusSchema.safeParse("in_review").success &&
      articleWorkflowStatusSchema.safeParse("blocked").success &&
      articleWorkflowStatusSchema.safeParse("published").success,
    "schema 应接受四态"
  );
  assert(!articleWorkflowStatusSchema.safeParse("nope").success, "非法状态应失败");

  assert(parseArticleWorkflowStatusFromForm(formWithStatus("in_review")) === "in_review", "parse in_review");
  assert(parseArticleWorkflowStatusFromForm(formWithStatus("")) === "draft", "空 status 默认 draft");
}

try {
  main();
  console.log("[d3-workflow-smoke] ok");
} catch (e: unknown) {
  console.error("[d3-workflow-smoke] failed:", e);
  process.exitCode = 1;
}
