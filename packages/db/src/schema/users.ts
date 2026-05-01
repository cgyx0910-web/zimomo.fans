import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/** 前台访客账号（F1）；与 admin 口令登录无关；邮箱在应用层 lower+trim 后入库 */
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("users_email_unique_idx").on(table.email)]
);
