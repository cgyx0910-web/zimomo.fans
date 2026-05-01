import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "订阅",
  robots: { index: false, follow: false },
};

export default function NewsletterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md flex-1 px-4 py-12">{children}</div>
  );
}
