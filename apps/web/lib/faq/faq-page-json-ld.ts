import type { EditorialFaqItem } from "@/lib/faq/editorial-faq";

/** schema.org FAQPage · 须与页面可见 FAQ 一致（Google 需在 HTML 中看到相同问答） */
export function buildFaqPageJsonLd(
  pageUrl: string,
  items: EditorialFaqItem[]
): Record<string, unknown> | null {
  if (!items.length) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
    url: pageUrl,
  };
}
