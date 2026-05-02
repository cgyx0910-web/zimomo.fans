import { z } from "zod";

export const articleCommentBodySchema = z
  .string()
  .trim()
  .min(5, "评论至少 5 个字。")
  .max(2000, "评论过长（最多 2000 字）。");

export const articleCommentSlugSchema = z
  .string()
  .trim()
  .min(1, "缺少文章标识。");

export const articleCommentLocaleSchema = z.enum(["zh-CN", "en"]);
