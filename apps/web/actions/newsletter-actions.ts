"use server";

import { redirect } from "next/navigation";

import { honeypotFilled } from "@/lib/comments/spam";
import { NEWSLETTER_HONEYPOT_FIELD } from "@/lib/newsletter/constants";
import { prepareAndSendDoubleOptIn } from "@/lib/newsletter/flows";
import { findNewsletterByEmail } from "@/lib/newsletter/queries";
import { newsletterSubscribeFormSchema } from "@/lib/newsletter/validation";
import {
  buildRateKey,
  enforceRateLimit,
  rateLimitMessage,
} from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/rate-limit/request-ip";

export type SubscribeNewsletterState = {
  error?: string;
  message?: string;
};

export async function subscribeNewsletterAction(
  _prev: SubscribeNewsletterState | null,
  formData: FormData
): Promise<SubscribeNewsletterState> {
  if (honeypotFilled(formData.get(NEWSLETTER_HONEYPOT_FIELD))) {
    return { error: "提交被拒绝。" };
  }

  const parsed = newsletterSubscribeFormSchema.safeParse({
    email: formData.get("email"),
    acceptPrivacy: formData.get("acceptPrivacy"),
    utmSource: formData.get("utm_source") ?? undefined,
    utmMedium: formData.get("utm_medium") ?? undefined,
    utmCampaign: formData.get("utm_campaign") ?? undefined,
  });

  if (!parsed.success) {
    const fe = parsed.error.flatten();
    const err =
      fe.fieldErrors.email?.[0] ??
      fe.fieldErrors.acceptPrivacy?.[0] ??
      fe.fieldErrors.utmSource?.[0] ??
      fe.fieldErrors.utmMedium?.[0] ??
      fe.fieldErrors.utmCampaign?.[0] ??
      "请检查输入。";
    return { error: err };
  }

  const { email, utmSource, utmMedium, utmCampaign } = parsed.data;

  const ip = await getRequestIp();
  const subRl = await enforceRateLimit({
    bucket: "newsletter.subscribe",
    key: buildRateKey(ip, email.toLowerCase()),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!subRl.allowed) {
    return { error: rateLimitMessage(subRl) };
  }

  const existing = await findNewsletterByEmail(email);
  if (existing?.status === "confirmed") {
    return {
      message: "该邮箱已是订阅状态，无需重复确认。",
    };
  }

  try {
    await prepareAndSendDoubleOptIn({
      email,
      utmSource,
      utmMedium,
      utmCampaign,
    });
  } catch {
    return { error: "处理失败，请稍后重试。" };
  }

  redirect("/newsletter/pending");
}
