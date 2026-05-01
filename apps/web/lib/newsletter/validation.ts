import { z } from "zod";

const emailField = z
  .string()
  .trim()
  .min(1, "请输入邮箱。")
  .email("邮箱格式不正确。")
  .transform((s) => s.toLowerCase());

const utmField = z
  .string()
  .trim()
  .max(64, "UTM 参数过长。")
  .optional()
  .transform((s) => (s === "" ? undefined : s));

export const newsletterSubscribeFormSchema = z
  .object({
    email: emailField,
    acceptPrivacy: z.literal("on").optional(),
    utmSource: utmField,
    utmMedium: utmField,
    utmCampaign: utmField,
  })
  .refine((data) => data.acceptPrivacy === "on", {
    message: "请勾选同意隐私说明后再订阅。",
    path: ["acceptPrivacy"],
  });

export type NewsletterSubscribeInput = z.infer<
  typeof newsletterSubscribeFormSchema
>;
