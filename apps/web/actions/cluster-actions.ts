"use server";

import { revalidatePath } from "next/cache";
import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@guge/db";
import {
  articles,
  clusterItems,
  contentItems,
  storyClusters,
} from "@guge/db/schema";

import { assertAdminSession } from "@/lib/auth/session";
import {
  revalidateArticlePublicPaths,
  revalidateClusterPublicPath,
} from "@/lib/i18n/revalidate-public";
import { runClusterBucketBatch } from "@/lib/clusters/bucket-worker";
import { searchOrphanContentItemsAdmin } from "@/lib/clusters/queries";
import { searchArticlesForClusterAdmin } from "@/lib/articles/queries";
import { formatZodError, optionalText } from "@/lib/articles/validation";

/** 与 `getDb().transaction(tx => …)` 中的 `tx` 兼容（PgTransaction 与 Database 在查询 API 上一致） */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbTx = any;

export async function runClusterNowAction(): Promise<
  { error: string } | { summary: Awaited<ReturnType<typeof runClusterBucketBatch>> }
> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  try {
    const summary = await runClusterBucketBatch();
    revalidatePath("/admin/clusters");
    revalidatePath("/admin/content-items");
    return { summary };
  } catch (error) {
    console.error(error);
    return { error: "执行 cluster 桶化失败，请稍后重试。" };
  }
}

const clusterSlugSchema = z
  .string()
  .trim()
  .min(1, { message: "slug 不能为空" })
  .max(64, { message: "slug 过长（最多 64）" })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "slug 仅小写字母数字与中划线",
  });

const statusSchema = z.enum(["draft", "merged", "archived"]);

const uuidSchema = z.string().uuid();

function isPgUniqueViolation(error: unknown): boolean {
  const walk = (e: unknown): boolean => {
    if (!e || typeof e !== "object") {
      return false;
    }
    const any = e as { code?: unknown; cause?: unknown };
    if (any.code === "23505") {
      return true;
    }
    if (typeof any.cause !== "undefined") {
      return walk(any.cause);
    }
    return false;
  };
  return walk(error);
}

/** merged 状态下同一主文仅能绑定一个 Hub（部分唯一索引 story_clusters_pub_article_merged_uq） */
function isClusterPubArticleMergedConflict(error: unknown): boolean {
  const marker = "story_clusters_pub_article_merged_uq";
  const walk = (e: unknown): boolean => {
    if (!e || typeof e !== "object") {
      return false;
    }
    const any = e as {
      code?: unknown;
      constraint?: unknown;
      detail?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    if (any.code === "23505") {
      const ident = `${String(any.constraint ?? "")} ${String(any.detail ?? "")} ${String(any.message ?? "")}`;
      if (ident.includes(marker)) {
        return true;
      }
    }
    if (typeof any.cause !== "undefined") {
      return walk(any.cause);
    }
    return false;
  };
  return walk(error);
}

function randomSlugSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

export type ClusterActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function searchOrphanContentItemsAction(query: string) {
  await assertAdminSession();
  return searchOrphanContentItemsAdmin(query, 20);
}

export async function searchArticlesForClusterAdminAction(query: string) {
  await assertAdminSession();
  return searchArticlesForClusterAdmin(query, 20);
}

async function revalidateArticlePathsForIds(
  db: ReturnType<typeof getDb>,
  ids: Array<string | null | undefined>
): Promise<void> {
  const uniq = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  for (const aid of uniq) {
    const rows = await db
      .select({ slug: articles.slug })
      .from(articles)
      .where(eq(articles.id, aid))
      .limit(1);
    const slug = rows[0]?.slug;
    if (slug) {
      revalidateArticlePublicPaths(slug);
    }
  }
}

async function countActiveMembers(tx: DbTx, clusterId: string): Promise<number> {
  const rows = await tx
    .select({ n: count() })
    .from(clusterItems)
    .where(and(eq(clusterItems.clusterId, clusterId), ne(clusterItems.role, "excluded")));
  return Number(rows[0]?.n ?? 0);
}

async function pickNextPrimaryAndSyncRoles(tx: DbTx, clusterId: string): Promise<string | null> {
  const next = await tx
    .select({ id: contentItems.id })
    .from(clusterItems)
    .innerJoin(contentItems, eq(contentItems.id, clusterItems.contentItemId))
    .where(and(eq(clusterItems.clusterId, clusterId), ne(clusterItems.role, "excluded")))
    .orderBy(sql`${contentItems.publishedAt} desc nulls last`, desc(contentItems.updatedAt))
    .limit(1);

  const primaryId = next[0]?.id ?? null;

  await tx
    .update(clusterItems)
    .set({ role: "member" })
    .where(and(eq(clusterItems.clusterId, clusterId), ne(clusterItems.role, "excluded")));

  if (primaryId) {
    await tx
      .update(clusterItems)
      .set({ role: "primary" })
      .where(and(eq(clusterItems.clusterId, clusterId), eq(clusterItems.contentItemId, primaryId)));
  }

  await tx
    .update(storyClusters)
    .set({
      primaryContentItemId: primaryId,
      updatedAt: new Date(),
    })
    .where(eq(storyClusters.id, clusterId));

  return primaryId;
}

async function syncRolesToPrimary(tx: DbTx, clusterId: string, primaryId: string | null): Promise<void> {
  if (!primaryId) {
    await tx
      .update(clusterItems)
      .set({ role: "member" })
      .where(and(eq(clusterItems.clusterId, clusterId), ne(clusterItems.role, "excluded")));
    return;
  }

  await tx
    .update(clusterItems)
    .set({ role: "member" })
    .where(and(eq(clusterItems.clusterId, clusterId), ne(clusterItems.role, "excluded")));

  await tx
    .update(clusterItems)
    .set({ role: "primary" })
    .where(and(eq(clusterItems.clusterId, clusterId), eq(clusterItems.contentItemId, primaryId)));
}

export async function updateClusterMetaAction(
  _prev: ClusterActionState | null,
  formData: FormData
): Promise<ClusterActionState> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  const clusterIdRaw = String(formData.get("cluster_id") ?? "").trim();
  if (!clusterIdRaw) {
    return { error: "缺少 cluster_id。" };
  }
  let clusterId: string;
  try {
    clusterId = uuidSchema.parse(clusterIdRaw);
  } catch {
    return { error: "无效的 cluster_id。" };
  }

  let slug: string;
  let status: z.infer<typeof statusSchema>;
  let title: string | null;
  let summary: string | null;
  let primaryRaw: string | null;
  let publishedArticleId: string | null;

  try {
    slug = clusterSlugSchema.parse(String(formData.get("slug") ?? ""));
    status = statusSchema.parse(String(formData.get("status") ?? ""));
    title = optionalText.parse(formData.get("title"));
    summary = optionalText.parse(formData.get("summary"));
    const p = String(formData.get("primary_content_item_id") ?? "").trim();
    primaryRaw = p.length ? uuidSchema.parse(p) : null;
    const pa = String(formData.get("published_article_id") ?? "").trim();
    publishedArticleId = pa.length ? uuidSchema.parse(pa) : null;
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return { error: "请修正表单。", fieldErrors: formatZodError(e) };
    }
    return { error: "表单校验失败。" };
  }

  const db = getDb();

  const existing = await db
    .select()
    .from(storyClusters)
    .where(eq(storyClusters.id, clusterId))
    .limit(1);
  const prevRow = existing[0];
  if (!prevRow) {
    return { error: "Cluster 不存在。" };
  }

  const prevPublishedArticleId = prevRow.publishedArticleId ?? null;

  try {
    await db.transaction(async (tx) => {
      const active = await countActiveMembers(tx, clusterId);

      if (publishedArticleId) {
        const exists = await tx
          .select({ id: articles.id })
          .from(articles)
          .where(eq(articles.id, publishedArticleId))
          .limit(1);
        if (!exists[0]) {
          throw new Error("关联的主文 article 不存在。");
        }
      }

      if (status === "merged") {
        if (active < 1) {
          throw new Error("merged 状态至少需要 1 条非 excluded 成员。");
        }
        if (!primaryRaw) {
          throw new Error("merged 状态必须指定主 content_item。");
        }
        const member = await tx
          .select({ role: clusterItems.role })
          .from(clusterItems)
          .where(
            and(
              eq(clusterItems.clusterId, clusterId),
              eq(clusterItems.contentItemId, primaryRaw)
            )
          )
          .limit(1);
        if (!member[0] || member[0].role === "excluded") {
          throw new Error("主项必须在成员列表中且不能为 excluded。");
        }
      }

      await tx
        .update(storyClusters)
        .set({
          slug,
          title,
          summary,
          status,
          primaryContentItemId: primaryRaw,
          publishedArticleId,
          updatedAt: new Date(),
        })
        .where(eq(storyClusters.id, clusterId));

      if (status === "merged" && primaryRaw) {
        await syncRolesToPrimary(tx, clusterId, primaryRaw);
      } else if (primaryRaw) {
        await syncRolesToPrimary(tx, clusterId, primaryRaw);
      } else {
        await tx
          .update(clusterItems)
          .set({ role: "member" })
          .where(and(eq(clusterItems.clusterId, clusterId), ne(clusterItems.role, "excluded")));
      }

      const activeAfter = await countActiveMembers(tx, clusterId);
      if (status === "merged" && activeAfter < 1) {
        throw new Error("merged 要求至少 1 条非 excluded 成员。");
      }
    });
  } catch (e: unknown) {
    if (isClusterPubArticleMergedConflict(e)) {
      return { error: "该主文已被其他 merged Hub 占用，请先解绑或选择其它主文。" };
    }
    if (isPgUniqueViolation(e)) {
      return { error: "slug 已被占用，请换一个。" };
    }
    const msg = e instanceof Error ? e.message : "保存失败。";
    return { error: msg };
  }

  revalidatePath("/admin/clusters");
  revalidatePath(`/admin/clusters/${clusterId}`);
  revalidateClusterPublicPath(prevRow.slug);
  if (prevRow.slug !== slug) {
    revalidateClusterPublicPath(slug);
  }
  revalidatePath("/sitemap.xml");
  await revalidateArticlePathsForIds(db, [prevPublishedArticleId, publishedArticleId]);

  return {};
}

export async function setClusterPublishedArticleAction(
  _prev: ClusterActionState | null,
  formData: FormData
): Promise<ClusterActionState> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  const clusterIdRaw = String(formData.get("cluster_id") ?? "").trim();
  if (!clusterIdRaw) {
    return { error: "缺少 cluster_id。" };
  }
  let clusterId: string;
  try {
    clusterId = uuidSchema.parse(clusterIdRaw);
  } catch {
    return { error: "无效的 cluster_id。" };
  }

  let publishedArticleId: string | null;
  try {
    const pa = String(formData.get("published_article_id") ?? "").trim();
    publishedArticleId = pa.length ? uuidSchema.parse(pa) : null;
  } catch {
    return { error: "published_article_id 格式无效。" };
  }

  const db = getDb();
  const existing = await db
    .select()
    .from(storyClusters)
    .where(eq(storyClusters.id, clusterId))
    .limit(1);
  const prevRow = existing[0];
  if (!prevRow) {
    return { error: "Cluster 不存在。" };
  }
  const prevPublishedArticleId = prevRow.publishedArticleId ?? null;

  try {
    await db.transaction(async (tx) => {
      if (publishedArticleId) {
        const exists = await tx
          .select({ id: articles.id })
          .from(articles)
          .where(eq(articles.id, publishedArticleId))
          .limit(1);
        if (!exists[0]) {
          throw new Error("关联的主文 article 不存在。");
        }
      }
      await tx
        .update(storyClusters)
        .set({ publishedArticleId, updatedAt: new Date() })
        .where(eq(storyClusters.id, clusterId));
    });
  } catch (e: unknown) {
    if (isClusterPubArticleMergedConflict(e)) {
      return { error: "该主文已被其他 merged Hub 占用，请先解绑或选择其它主文。" };
    }
    if (isPgUniqueViolation(e)) {
      return { error: "slug 已被占用，请换一个。" };
    }
    const msg = e instanceof Error ? e.message : "保存失败。";
    return { error: msg };
  }

  revalidatePath("/admin/clusters");
  revalidatePath(`/admin/clusters/${clusterId}`);
  revalidateClusterPublicPath(prevRow.slug);
  revalidatePath("/sitemap.xml");
  await revalidateArticlePathsForIds(db, [prevPublishedArticleId, publishedArticleId]);

  return {};
}

export async function addClusterItemAction(formData: FormData): Promise<ClusterActionState> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  const clusterId = String(formData.get("cluster_id") ?? "").trim();
  const contentItemId = String(formData.get("content_item_id") ?? "").trim();
  if (!clusterId || !contentItemId) {
    return { error: "缺少参数。" };
  }
  try {
    uuidSchema.parse(clusterId);
    uuidSchema.parse(contentItemId);
  } catch {
    return { error: "无效的 UUID。" };
  }

  const db = getDb();

  const cluster = await db.select().from(storyClusters).where(eq(storyClusters.id, clusterId)).limit(1);
  if (!cluster[0]) {
    return { error: "Cluster 不存在。" };
  }

  const elsewhere = await db
    .select({ clusterId: clusterItems.clusterId })
    .from(clusterItems)
    .where(eq(clusterItems.contentItemId, contentItemId))
    .limit(1);
  if (elsewhere[0] && elsewhere[0].clusterId !== clusterId) {
    return { error: "该 content_item 已属于其他 cluster。" };
  }
  if (elsewhere[0]?.clusterId === clusterId) {
    return { error: "已在当前 cluster 中。" };
  }

  try {
    await db.transaction(async (tx) => {
      const active = await countActiveMembers(tx, clusterId);
      const role = active === 0 ? ("primary" as const) : ("member" as const);

      await tx.insert(clusterItems).values({
        clusterId,
        contentItemId,
        role,
      });

      if (role === "primary") {
        await tx
          .update(storyClusters)
          .set({
            primaryContentItemId: contentItemId,
            updatedAt: new Date(),
          })
          .where(eq(storyClusters.id, clusterId));
        await syncRolesToPrimary(tx, clusterId, contentItemId);
      }
    });
  } catch (e) {
    console.error(e);
    return { error: "加入成员失败。" };
  }

  revalidatePath("/admin/clusters");
  revalidatePath(`/admin/clusters/${clusterId}`);
  revalidatePath("/sitemap.xml");

  return {};
}

export async function removeClusterItemAction(formData: FormData): Promise<ClusterActionState> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  const clusterId = String(formData.get("cluster_id") ?? "").trim();
  const contentItemId = String(formData.get("content_item_id") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim() as "detach" | "exclude" | "spinoff";
  if (!clusterId || !contentItemId || !["detach", "exclude", "spinoff"].includes(mode)) {
    return { error: "缺少或无效的参数。" };
  }

  const db = getDb();
  const prevCluster = await db.select().from(storyClusters).where(eq(storyClusters.id, clusterId)).limit(1);
  if (!prevCluster[0]) {
    return { error: "Cluster 不存在。" };
  }

  try {
    await db.transaction(async (tx) => {
      const row = await tx
        .select({ role: clusterItems.role })
        .from(clusterItems)
        .where(
          and(eq(clusterItems.clusterId, clusterId), eq(clusterItems.contentItemId, contentItemId))
        )
        .limit(1);
      if (!row[0]) {
        throw new Error("成员不存在。");
      }
      const wasPrimary = row[0].role === "primary";

      if (mode === "exclude") {
        await tx
          .update(clusterItems)
          .set({ role: "excluded" })
          .where(
            and(eq(clusterItems.clusterId, clusterId), eq(clusterItems.contentItemId, contentItemId))
          );
        if (wasPrimary || prevCluster[0].primaryContentItemId === contentItemId) {
          await pickNextPrimaryAndSyncRoles(tx, clusterId);
        }
      } else if (mode === "detach") {
        await tx
          .delete(clusterItems)
          .where(
            and(eq(clusterItems.clusterId, clusterId), eq(clusterItems.contentItemId, contentItemId))
          );
        if (wasPrimary || prevCluster[0].primaryContentItemId === contentItemId) {
          await pickNextPrimaryAndSyncRoles(tx, clusterId);
        }
      } else if (mode === "spinoff") {
        const item = await tx
          .select({ title: contentItems.title })
          .from(contentItems)
          .where(eq(contentItems.id, contentItemId))
          .limit(1);
        const itemTitle = item[0]?.title ?? null;

        await tx
          .delete(clusterItems)
          .where(
            and(eq(clusterItems.clusterId, clusterId), eq(clusterItems.contentItemId, contentItemId))
          );
        if (wasPrimary || prevCluster[0].primaryContentItemId === contentItemId) {
          await pickNextPrimaryAndSyncRoles(tx, clusterId);
        }

        const newSlug = `c-spin-${randomSlugSuffix()}`;
        const inserted = await tx
          .insert(storyClusters)
          .values({
            slug: newSlug,
            title: itemTitle,
            status: "draft",
            primaryContentItemId: contentItemId,
          })
          .returning({ id: storyClusters.id });

        const newId = inserted[0]?.id;
        if (!newId) {
          throw new Error("拆分创建 cluster 失败");
        }
        await tx.insert(clusterItems).values({
          clusterId: newId,
          contentItemId,
          role: "primary",
        });
      }

      const active = await countActiveMembers(tx, clusterId);
      const st = await tx
        .select({ status: storyClusters.status })
        .from(storyClusters)
        .where(eq(storyClusters.id, clusterId))
        .limit(1);
      if (st[0]?.status === "merged" && active < 1) {
        await tx
          .update(storyClusters)
          .set({ status: "draft", updatedAt: new Date() })
          .where(eq(storyClusters.id, clusterId));
      }
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "操作失败。";
    return { error: msg };
  }

  revalidatePath("/admin/clusters");
  revalidatePath(`/admin/clusters/${clusterId}`);
  revalidateClusterPublicPath(prevCluster[0].slug);
  revalidatePath("/sitemap.xml");

  return {};
}

export async function setClusterPrimaryAction(formData: FormData): Promise<ClusterActionState> {
  try {
    await assertAdminSession();
  } catch {
    return { error: "登录状态已失效，请重新登录。" };
  }

  const clusterId = String(formData.get("cluster_id") ?? "").trim();
  const contentItemId = String(formData.get("content_item_id") ?? "").trim();
  if (!clusterId || !contentItemId) {
    return { error: "缺少参数。" };
  }

  const db = getDb();
  const prevCluster = await db.select().from(storyClusters).where(eq(storyClusters.id, clusterId)).limit(1);
  if (!prevCluster[0]) {
    return { error: "Cluster 不存在。" };
  }

  const member = await db
    .select({ role: clusterItems.role })
    .from(clusterItems)
    .where(and(eq(clusterItems.clusterId, clusterId), eq(clusterItems.contentItemId, contentItemId)))
    .limit(1);
  if (!member[0] || member[0].role === "excluded") {
    return { error: "不能将 excluded 成员设为主项。" };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(storyClusters)
        .set({
          primaryContentItemId: contentItemId,
          updatedAt: new Date(),
        })
        .where(eq(storyClusters.id, clusterId));
      await syncRolesToPrimary(tx, clusterId, contentItemId);
    });
  } catch (e) {
    console.error(e);
    return { error: "设置主项失败。" };
  }

  revalidatePath("/admin/clusters");
  revalidatePath(`/admin/clusters/${clusterId}`);
  revalidateClusterPublicPath(prevCluster[0].slug);
  revalidatePath("/sitemap.xml");

  return {};
}
