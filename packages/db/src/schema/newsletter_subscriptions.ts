import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** F3：双 opt-in；不删行，退订后保留 `unsubscribed` 抑制语义 */
export const newsletterSubscriptionStatuses = [
  "pending_confirmation",
  "confirmed",
  "unsubscribed",
] as const;

export type NewsletterSubscriptionStatus =
  (typeof newsletterSubscriptionStatuses)[number];

export const newsletterSubscriptionStatusEnum = pgEnum(
  "newsletter_subscription_status",
  ["pending_confirmation", "confirmed", "unsubscribed"]
);

export const newsletterSubscriptions = pgTable(
  "newsletter_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    status: newsletterSubscriptionStatusEnum("status")
      .notNull()
      .default("pending_confirmation"),
    confirmTokenHash: text("confirm_token_hash"),
    confirmTokenExpiresAt: timestamp("confirm_token_expires_at", {
      withTimezone: true,
    }),
    unsubscribeTokenHash: text("unsubscribe_token_hash"),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("newsletter_subscriptions_email_uq").on(table.email),
    index("newsletter_subscriptions_status_created_idx").on(
      table.status,
      table.createdAt
    ),
  ]
);
