import { z } from "zod";

import type { EditorialFaqJson } from "@guge/db/schema";

/** 与 Admin 表单槽位数一致：faq_q_0 … faq_q_11 */
export const EDITORIAL_FAQ_MAX_ITEMS = 12;

export const EDITORIAL_FAQ_MAX_QUESTION_CHARS = 500;
export const EDITORIAL_FAQ_MAX_ANSWER_CHARS = 4000;

const itemSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, { message: "问题不能为空" })
    .max(EDITORIAL_FAQ_MAX_QUESTION_CHARS, { message: "问题过长" }),
  answer: z
    .string()
    .trim()
    .min(1, { message: "回答不能为空" })
    .max(EDITORIAL_FAQ_MAX_ANSWER_CHARS, { message: "回答过长" }),
});

export const editorialFaqArraySchema = z
  .array(itemSchema)
  .max(EDITORIAL_FAQ_MAX_ITEMS, { message: `最多 ${EDITORIAL_FAQ_MAX_ITEMS} 条` });

export type EditorialFaqItem = z.infer<typeof itemSchema>;

/**
 * 从 FormData 读取 `faq_q_${i}` / `faq_a_${i}`（i ∈ [0, max)），丢弃双空槽；返回待校验的中间结构。
 */
export function readEditorialFaqSlotsFromFormData(
  formData: FormData,
  maxSlots = EDITORIAL_FAQ_MAX_ITEMS
): { question: string; answer: string }[] {
  const raw: { question: string; answer: string }[] = [];
  for (let i = 0; i < maxSlots; i++) {
    const q = formData.get(`faq_q_${i}`);
    const a = formData.get(`faq_a_${i}`);
    const question = typeof q === "string" ? q.trim() : "";
    const answer = typeof a === "string" ? a.trim() : "";
    if (!question && !answer) {
      continue;
    }
    raw.push({ question, answer });
  }
  return raw;
}

/** 校验后用于写库：`[]` 或解析失败前应转向 `null` */
export function parseEditorialFaqFromFormData(
  formData: FormData
): EditorialFaqJson | null {
  const raw = readEditorialFaqSlotsFromFormData(formData);
  if (raw.length === 0) {
    return null;
  }
  const parsed = editorialFaqArraySchema.safeParse(raw);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}

/** 已由 DB/`parseEditorialFaqFromFormData` 清洗后的条目，用于组件与 JSON-LD */
export function toEditorialFaqItems(
  value: EditorialFaqJson | null | undefined
): EditorialFaqItem[] {
  if (!value?.length) {
    return [];
  }
  const parsed = editorialFaqArraySchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

/** Admin 表单固定槽位数，双空槽不提交 */
export function padEditorialFaqSlotsForForm(
  value: EditorialFaqJson | null | undefined
): { question: string; answer: string }[] {
  const fromDb = Array.isArray(value) ? value : [];
  const slots = fromDb.map((x) => ({
    question: String(x.question ?? "").slice(
      0,
      EDITORIAL_FAQ_MAX_QUESTION_CHARS
    ),
    answer: String(x.answer ?? "").slice(0, EDITORIAL_FAQ_MAX_ANSWER_CHARS),
  }));
  while (slots.length < EDITORIAL_FAQ_MAX_ITEMS) {
    slots.push({ question: "", answer: "" });
  }
  return slots.slice(0, EDITORIAL_FAQ_MAX_ITEMS);
}
