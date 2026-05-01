import type { MetadataRoute } from "next";

import { getSiteOrigin } from "@/lib/articles/site";
import { isPublicIndexingEnabled } from "@/lib/seo/indexable";

export default function robots(): MetadataRoute.Robots {
  const origin = getSiteOrigin();
  const indexable = isPublicIndexingEnabled();

  if (!indexable) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
