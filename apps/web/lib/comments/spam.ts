/**
 * F2 基础反垃圾（规则，无 LLM）：命中则写入 `spam_blocked` 供后台复核。
 * 与 enrich/摘要等 AI 路径完全隔离。
 */
export function isCommentLikelySpam(trimmedBody: string): boolean {
  if (trimmedBody.length < 5) {
    return true;
  }

  const lower = trimmedBody.toLowerCase();
  const urlLike =
    (lower.match(/https?:\/\//g)?.length ?? 0) +
    (lower.match(/\bwww\.\S+/g)?.length ?? 0);
  if (urlLike > 4) {
    return true;
  }

  if (/\[url\s*=/.test(lower) || /\[\/url\]/.test(lower)) {
    return true;
  }

  // 连续重复字符（灌水/测试）
  if (/(.)\1{25,}/u.test(trimmedBody)) {
    return true;
  }

  return false;
}

export function honeypotFilled(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  return value.trim().length > 0;
}
