import { revalidatePath } from "next/cache";

import { locales } from "@/lib/i18n/config";

function forEachLocale(fn: (locale: string) => void): void {
  for (const loc of locales) {
    fn(loc);
  }
}

export function revalidateArticlePublicPaths(slug: string): void {
  forEachLocale((loc) => {
    revalidatePath(`/${loc}/articles`);
    revalidatePath(`/${loc}/articles/${slug}`);
  });
}

export function revalidateWikiPublicPaths(slug: string): void {
  forEachLocale((loc) => {
    revalidatePath(`/${loc}/wiki`);
    revalidatePath(`/${loc}/wiki/${slug}`);
  });
}

export function revalidateCalendarPublicPaths(slug?: string): void {
  forEachLocale((loc) => {
    revalidatePath(`/${loc}/calendar`);
    if (slug) {
      revalidatePath(`/${loc}/calendar/${slug}`);
    }
  });
}

export function revalidateClusterPublicPath(slug: string): void {
  forEachLocale((loc) => {
    revalidatePath(`/${loc}/clusters/${slug}`);
  });
}

export function revalidateCalendarFeedPath(): void {
  revalidatePath("/calendar/feed");
}
