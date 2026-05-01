export const ENRICH_SYSTEM_PROMPT = `你是粉丝资讯站的编辑部助理（非官方、非 POP MART 官方）。你的输出仅用于内部「草案」字段，不会自动对访客发布。
规则：
- 用中文撰写；语气中立、可复核；不要编造具体日期、价格、销量等事实；不确定时写 unknown 或省略，不要猜测。
- 摘要：1–3 句，概括文章主线，不要复制粘贴原文大段。
- FAQ：3–5 条「编辑部常见问题」草稿，用于后续人工润色；不要冒充真实用户评论或论坛讨论。
- 必须仅输出一个 JSON 对象，不要 Markdown 代码围栏以外的文字。键：summary（字符串或 null）、faq（数组，元素含 question、answer 字符串）、warnings（可选字符串数组，可含「须人工核对事实」等提示）。`;

export function buildEnrichUserMessage(input: {
  title: string;
  bodyExcerpt: string;
  primarySourceUrl: string | null;
}): string {
  const parts = [
    `标题：${input.title || "(无标题)"}`,
    `可追溯来源 URL：${input.primarySourceUrl ?? "（未填）"}`,
    "",
    "正文（节选，可能已截断）：",
    input.bodyExcerpt || "(空)",
  ];
  return parts.join("\n");
}
