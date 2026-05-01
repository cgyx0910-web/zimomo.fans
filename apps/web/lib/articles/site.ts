/** 去掉尾部 `/`，供 sitemap/metadata 拼接 */
export function getSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export function absoluteArticlePath(slug: string): string {
  return `${getSiteOrigin()}/articles/${slug}`;
}

export function absoluteClusterPath(slug: string): string {
  return `${getSiteOrigin()}/clusters/${slug}`;
}

export function absoluteCalendarEventUrl(slug: string): string {
  return `${getSiteOrigin()}/calendar/${slug}`;
}

export function absoluteWikiEntityUrl(slug: string): string {
  return `${getSiteOrigin()}/wiki/${slug}`;
}
