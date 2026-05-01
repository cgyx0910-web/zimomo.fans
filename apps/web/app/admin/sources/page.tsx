import { listSourcesAdmin } from "@/lib/sources/queries";
import { SourcesPanel } from "@/components/admin/sources-panel";

export default async function AdminSourcesPage() {
  const rows = await listSourcesAdmin();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">RSS 白名单来源</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          阶段 B1：仅配置来源与调度，不自动产出公开资讯。
        </p>
      </div>

      <SourcesPanel rows={rows} />
    </div>
  );
}
