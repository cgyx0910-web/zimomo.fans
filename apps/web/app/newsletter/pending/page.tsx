import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "请查收邮件",
  robots: { index: false, follow: false },
};

export default function NewsletterPendingPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">请查收邮件</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        我们已向你的邮箱发送<strong>确认链接</strong>。请在 24 小时内点击邮件中的链接完成订阅。
      </p>
      <p className="text-xs text-neutral-500">
        若使用 <code className="font-mono text-xs">EMAIL_TRANSPORT=console</code>
        ，确认链接会打印在运行 <code className="font-mono text-xs">pnpm dev</code>{" "}
        的终端中。
      </p>
    </div>
  );
}
