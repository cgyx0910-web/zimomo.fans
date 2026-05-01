import { z } from "zod";

const trimmedString = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : ""),
  z.string()
);

/** 空表单 → null */
export const optionalText = trimmedString.transform((s) =>
  s.length ? s : null
);

/** 不能为空 */
export const requiredText = trimmedString.refine((s) => s.length > 0, {
  message: "不能为空",
});

export const slugSchema = trimmedString.pipe(
  z
    .string()
    .min(1, { message: "slug 不能为空" })
    .max(160, { message: "slug 过长" })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "slug 仅小写字母数字与中划线",
    })
);

/** 不能为空且须为 https URL */
export const httpsRequired = trimmedString.pipe(
  z
    .string()
    .min(1, { message: "不能为空" })
    .url({ message: "必须是有效 URL" })
    .refine((u) => u.startsWith("https://"), { message: "必须使用 HTTPS" })
);

/** OG 等非必填：空则 null；若有值则需 https URL */
export const optionalHttpsUrl = trimmedString.superRefine((value, ctx) => {
  if (!value.length) {
    return;
  }
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "必须使用 HTTPS",
      });
    }
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "必须是有效 URL",
    });
  }
}).transform((s) => (s.length ? s : null));

export function formatZodError(error: unknown): Record<string, string> {
  if (!(error instanceof z.ZodError)) {
    throw error;
  }
  const entries: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.filter(Boolean).join(".") || "form";
    if (!entries[path]) {
      entries[path] = issue.message;
    }
  }
  return entries;
}
