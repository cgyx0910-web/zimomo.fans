import { and, asc, eq, inArray } from "drizzle-orm";

import {
  articleComments,
  articles,
  users,
  type ArticleCommentStatus,
} from "@guge/db/schema";
import { getDb } from "@guge/db";

export type ApprovedCommentPublic = {
  id: string;
  body: string;
  createdAt: Date;
  authorLabel: string;
};

function authorLabel(row: {
  displayName: string | null;
  email: string;
}): string {
  const name = row.displayName?.trim();
  if (name) {
    return name;
  }
  const email = row.email.trim();
  const local = email.split("@")[0];
  return local?.length ? local : "访客";
}

export async function listApprovedCommentsForArticle(
  articleId: string
): Promise<ApprovedCommentPublic[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: articleComments.id,
      body: articleComments.body,
      createdAt: articleComments.createdAt,
      displayName: users.displayName,
      email: users.email,
    })
    .from(articleComments)
    .innerJoin(users, eq(users.id, articleComments.userId))
    .where(
      and(
        eq(articleComments.articleId, articleId),
        eq(articleComments.status, "approved")
      )
    )
    .orderBy(asc(articleComments.createdAt));

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
    authorLabel: authorLabel({
      displayName: r.displayName,
      email: r.email,
    }),
  }));
}

export type ModerationCommentRow = {
  id: string;
  status: ArticleCommentStatus;
  body: string;
  createdAt: Date;
  articleId: string;
  articleSlug: string;
  articleTitle: string | null;
  userEmail: string;
  userDisplayName: string | null;
};

export async function listArticleCommentsForModeration(
  limit = 300
): Promise<ModerationCommentRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: articleComments.id,
      status: articleComments.status,
      body: articleComments.body,
      createdAt: articleComments.createdAt,
      articleId: articleComments.articleId,
      articleSlug: articles.slug,
      articleTitle: articles.title,
      userEmail: users.email,
      userDisplayName: users.displayName,
    })
    .from(articleComments)
    .innerJoin(articles, eq(articles.id, articleComments.articleId))
    .innerJoin(users, eq(users.id, articleComments.userId))
    .where(inArray(articleComments.status, ["pending", "spam_blocked"]))
    .orderBy(asc(articleComments.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    body: r.body,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt),
    articleId: r.articleId,
    articleSlug: r.articleSlug,
    articleTitle: r.articleTitle,
    userEmail: r.userEmail,
    userDisplayName: r.userDisplayName,
  }));
}

export async function updateArticleCommentStatus(params: {
  id: string;
  status: "approved" | "rejected";
}): Promise<{ articleSlug: string } | null> {
  const db = getDb();
  const rows = await db
    .select({ articleId: articleComments.articleId })
    .from(articleComments)
    .where(eq(articleComments.id, params.id))
    .limit(1);

  const found = rows[0];
  if (!found) {
    return null;
  }

  await db
    .update(articleComments)
    .set({ status: params.status, updatedAt: new Date() })
    .where(eq(articleComments.id, params.id));

  const art = await db
    .select({ slug: articles.slug })
    .from(articles)
    .where(eq(articles.id, found.articleId))
    .limit(1);

  return art[0] ? { articleSlug: art[0].slug } : null;
}
