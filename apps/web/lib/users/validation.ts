import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .min(1, "请输入邮箱。")
  .email("邮箱格式不正确。")
  .transform((s) => s.toLowerCase());

const passwordField = z
  .string()
  .min(8, "密码至少 8 位。")
  .max(200, "密码过长。");

/** 表单缺省或空串 → undefined；有值则 trim 且 ≤100 */
const displayNameField = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() : ""),
  z
    .string()
    .max(100, "昵称过长。")
    .transform((s) => (s === "" ? undefined : s))
);

export const registerInputSchema = z.object({
  email: emailField,
  password: passwordField,
  displayName: displayNameField,
});

export const loginInputSchema = z.object({
  email: emailField,
  password: z.string().min(1, "请输入密码。"),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
