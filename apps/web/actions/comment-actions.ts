"use server";

import { articleComments } from "@guge/db/schema";
import { getDb } from "@guge/db";

import { COMMENT_HONEYPOT_FIELD } from "@/lib/comments/constants";
import {
  honeypotFilled,
  isCommentLikelySpam,
} from "@/lib/comments/spam";
import {
  articleCommentBodySchema,
  articleCommentSlugSchema,
} from "@/lib/comments/validation";
import { getPublishedArticleBySlug } from "@/lib/articles/public-queries";
import { getCurrentUser } from "@/lib/auth/user-session";
import {
  buildRateKey,
  enforceRateLimit,
  rateLimitMessage,
} from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/rate-limit/request-ip";

// F3/F2.x：可与 Newsletter 共用按 IP rate limit

export type SubmitArticleCommentState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

export async function submitArticleCommentAction(
  _prev: SubmitArticleCommentState | null,
  formData: FormData
): Promise<SubmitArticleCommentState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "请先登录后再发表评论。" };
  }

  const slugParsed = articleCommentSlugSchema.safeParse(
    formData.get("articleSlug")
  );
  if (!slugParsed.success) {
    return {
      error: slugParsed.error.flatten().formErrors[0] ?? "参数无效。",
    };
  }

  const bodyParsed = articleCommentBodySchema.safeParse(formData.get("body"));
  if (!bodyParsed.success) {
    return {
      error: bodyParsed.error.flatten().formErrors[0] ?? "内容无效。",
    };
  }

  const hp = formData.get(COMMENT_HONEYPOT_FIELD);
  if (honeypotFilled(hp)) {
    return { error: "提交被拒绝。" };
  }

  const ip = await getRequestIp();
  const rl = await enforceRateLimit({
    bucket: "comment.submit",
    key: buildRateKey(ip, user.id),
    limit: 5,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return { error: rateLimitMessage(rl) };
  }

  let article;
  try {
    article = await getPublishedArticleBySlug(slugParsed.data);
  } catch {
    return { error: "暂无法发表评论。" };
  }
  if (!article) {
    return { error: "文章不存在或未发布。" };
  }

  const body = bodyParsed.data;

  let status: "pending" | "spam_blocked" = "pending";
  if (isCommentLikelySpam(body)) {
    status = "spam_blocked";
  }

  try {
    const db = getDb();
    await db.insert(articleComments).values({
      articleId: article.id,
      userId: user.id,
      body,
      status,
    });
  } catch {
    return { error: "保存失败，请稍后重试。" };
  }

  if (status === "spam_blocked") {
    return {
      ok: true,
      message:
        "评论未通过基础安全检查（如外链过多等），暂未进入公开队列。编辑可后台复核误伤。",
    };
  }

  return {
    ok: true,
    message: "评论已提交，审核通过后将在此显示。（本站不使用 AI 生成评论。）",
  };
}
