/** 与抓取页/HTML 粗处理一致：去标签、折叠空白 */
export function stripHtmlLikeTags(input: string): string {
  return input.replace(/<[^>]+>/g, " ");
}

export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function normalizeForSimhash(input: string | null | undefined): string {
  if (!input?.trim()) {
    return "";
  }
  const stripped = stripHtmlLikeTags(input);
  return collapseWhitespace(stripped);
}
