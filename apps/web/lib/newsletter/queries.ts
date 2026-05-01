import { and, desc, eq } from "drizzle-orm";

import { newsletterSubscriptions } from "@guge/db/schema";
import { getDb } from "@guge/db";

export type NewsletterSubscriptionRow =
  typeof newsletterSubscriptions.$inferSelect;

export async function findNewsletterByEmail(
  email: string
): Promise<NewsletterSubscriptionRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.email, email))
    .limit(1);
  return rows[0] ?? null;
}

export async function findPendingByConfirmTokenHash(
  tokenHash: string
): Promise<NewsletterSubscriptionRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(newsletterSubscriptions)
    .where(
      and(
        eq(newsletterSubscriptions.status, "pending_confirmation"),
        eq(newsletterSubscriptions.confirmTokenHash, tokenHash)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function findByUnsubscribeTokenHash(
  tokenHash: string
): Promise<NewsletterSubscriptionRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.unsubscribeTokenHash, tokenHash))
    .limit(1);
  return rows[0] ?? null;
}

export async function insertPendingNewsletterSubscription(params: {
  email: string;
  confirmTokenHash: string;
  confirmTokenExpiresAt: Date;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}): Promise<NewsletterSubscriptionRow> {
  const db = getDb();
  const inserted = await db
    .insert(newsletterSubscriptions)
    .values({
      email: params.email,
      status: "pending_confirmation",
      confirmTokenHash: params.confirmTokenHash,
      confirmTokenExpiresAt: params.confirmTokenExpiresAt,
      utmSource: params.utmSource ?? null,
      utmMedium: params.utmMedium ?? null,
      utmCampaign: params.utmCampaign ?? null,
    })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to insert newsletter subscription");
  }
  return row;
}

export async function updatePendingNewsletterTokens(params: {
  email: string;
  confirmTokenHash: string;
  confirmTokenExpiresAt: Date;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}): Promise<void> {
  const db = getDb();
  await db
    .update(newsletterSubscriptions)
    .set({
      status: "pending_confirmation",
      confirmTokenHash: params.confirmTokenHash,
      confirmTokenExpiresAt: params.confirmTokenExpiresAt,
      utmSource: params.utmSource ?? null,
      utmMedium: params.utmMedium ?? null,
      utmCampaign: params.utmCampaign ?? null,
      updatedAt: new Date(),
    })
    .where(eq(newsletterSubscriptions.email, params.email));
}

export async function updateResubscribeFromUnsubscribed(params: {
  email: string;
  confirmTokenHash: string;
  confirmTokenExpiresAt: Date;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}): Promise<void> {
  const db = getDb();
  await db
    .update(newsletterSubscriptions)
    .set({
      status: "pending_confirmation",
      confirmTokenHash: params.confirmTokenHash,
      confirmTokenExpiresAt: params.confirmTokenExpiresAt,
      unsubscribeTokenHash: null,
      confirmedAt: null,
      unsubscribedAt: null,
      utmSource: params.utmSource ?? null,
      utmMedium: params.utmMedium ?? null,
      utmCampaign: params.utmCampaign ?? null,
      updatedAt: new Date(),
    })
    .where(eq(newsletterSubscriptions.email, params.email));
}

export async function markNewsletterConfirmed(params: {
  id: string;
  unsubscribeTokenHash: string;
}): Promise<void> {
  const db = getDb();
  await db
    .update(newsletterSubscriptions)
    .set({
      status: "confirmed",
      confirmTokenHash: null,
      confirmTokenExpiresAt: null,
      unsubscribeTokenHash: params.unsubscribeTokenHash,
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(newsletterSubscriptions.id, params.id));
}

export async function markNewsletterUnsubscribed(id: string): Promise<void> {
  const db = getDb();
  await db
    .update(newsletterSubscriptions)
    .set({
      status: "unsubscribed",
      unsubscribedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(newsletterSubscriptions.id, id));
}

export async function listNewsletterSubscriptionsForAdmin(): Promise<
  NewsletterSubscriptionRow[]
> {
  const db = getDb();
  return db
    .select()
    .from(newsletterSubscriptions)
    .orderBy(desc(newsletterSubscriptions.updatedAt));
}

export async function getNewsletterById(
  id: string
): Promise<NewsletterSubscriptionRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.id, id))
    .limit(1);
  return rows[0] ?? null;
}
