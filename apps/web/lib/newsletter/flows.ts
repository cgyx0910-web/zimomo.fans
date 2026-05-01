import { getSiteOrigin } from "@/lib/articles/site";
import { getEmailTransport } from "@/lib/email/transport";
import { buildNewsletterConfirmEmail } from "@/lib/newsletter/messages";
import {
  findByUnsubscribeTokenHash,
  findNewsletterByEmail,
  findPendingByConfirmTokenHash,
  insertPendingNewsletterSubscription,
  markNewsletterConfirmed,
  markNewsletterUnsubscribed,
  updatePendingNewsletterTokens,
  updateResubscribeFromUnsubscribed,
} from "@/lib/newsletter/queries";
import { NEWSLETTER_CONFIRM_TTL_MS } from "@/lib/newsletter/constants";
import { generateToken, hashToken } from "@/lib/newsletter/tokens";

const SITE_LABEL = "Zimomo/Labubu 资讯（非官方）";

function readEnv(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

export async function sendNewsletterConfirmEmail(params: {
  to: string;
  confirmPlainToken: string;
}): Promise<void> {
  const origin = getSiteOrigin();
  const confirmUrl = `${origin}/newsletter/confirm?token=${encodeURIComponent(params.confirmPlainToken)}`;
  const { subject, text, html } = buildNewsletterConfirmEmail({
    confirmUrl,
    siteLabel: SITE_LABEL,
  });
  const from = readEnv("NEWSLETTER_FROM") ?? "newsletter@localhost";
  const transport = getEmailTransport();
  await transport.send({
    to: params.to,
    from,
    subject,
    text,
    html,
  });
}

export type NewsletterConfirmPageResult =
  | { kind: "ok"; unsubscribeUrl: string }
  | { kind: "invalid" }
  | { kind: "expired" };

export async function consumeNewsletterConfirm(
  plainToken: string | undefined
): Promise<NewsletterConfirmPageResult> {
  const raw = typeof plainToken === "string" ? plainToken.trim() : "";
  if (!raw) {
    return { kind: "invalid" };
  }

  const tokenHash = hashToken(raw);
  const row = await findPendingByConfirmTokenHash(tokenHash);
  if (!row || !row.confirmTokenExpiresAt) {
    return { kind: "invalid" };
  }

  const expires =
    row.confirmTokenExpiresAt instanceof Date ?
      row.confirmTokenExpiresAt
    : new Date(row.confirmTokenExpiresAt);
  if (Number.isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
    return { kind: "expired" };
  }

  const unsubPlain = generateToken();
  const unsubHash = hashToken(unsubPlain);
  await markNewsletterConfirmed({
    id: row.id,
    unsubscribeTokenHash: unsubHash,
  });

  const origin = getSiteOrigin();
  const unsubscribeUrl = `${origin}/newsletter/unsubscribe?token=${encodeURIComponent(unsubPlain)}`;
  return { kind: "ok", unsubscribeUrl };
}

export type NewsletterUnsubscribePageResult =
  | { kind: "ok"; already: boolean }
  | { kind: "invalid" };

export async function consumeNewsletterUnsubscribe(
  plainToken: string | undefined
): Promise<NewsletterUnsubscribePageResult> {
  const raw = typeof plainToken === "string" ? plainToken.trim() : "";
  if (!raw) {
    return { kind: "invalid" };
  }

  const tokenHash = hashToken(raw);
  const row = await findByUnsubscribeTokenHash(tokenHash);
  if (!row) {
    return { kind: "invalid" };
  }

  if (row.status === "unsubscribed") {
    return { kind: "ok", already: true };
  }

  if (row.status !== "confirmed") {
    return { kind: "invalid" };
  }

  await markNewsletterUnsubscribed(row.id);
  return { kind: "ok", already: false };
}

export async function prepareAndSendDoubleOptIn(params: {
  email: string;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}): Promise<void> {
  const confirmPlain = generateToken();
  const confirmHash = hashToken(confirmPlain);
  const expires = new Date(Date.now() + NEWSLETTER_CONFIRM_TTL_MS);

  const existing = await findNewsletterByEmail(params.email);
  if (!existing) {
    await insertPendingNewsletterSubscription({
      email: params.email,
      confirmTokenHash: confirmHash,
      confirmTokenExpiresAt: expires,
      utmSource: params.utmSource,
      utmMedium: params.utmMedium,
      utmCampaign: params.utmCampaign,
    });
  } else if (existing.status === "pending_confirmation") {
    await updatePendingNewsletterTokens({
      email: params.email,
      confirmTokenHash: confirmHash,
      confirmTokenExpiresAt: expires,
      utmSource: params.utmSource,
      utmMedium: params.utmMedium,
      utmCampaign: params.utmCampaign,
    });
  } else if (existing.status === "unsubscribed") {
    await updateResubscribeFromUnsubscribed({
      email: params.email,
      confirmTokenHash: confirmHash,
      confirmTokenExpiresAt: expires,
      utmSource: params.utmSource,
      utmMedium: params.utmMedium,
      utmCampaign: params.utmCampaign,
    });
  } else {
    return;
  }

  await sendNewsletterConfirmEmail({
    to: params.email,
    confirmPlainToken: confirmPlain,
  });
}
