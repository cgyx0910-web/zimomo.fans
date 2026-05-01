import type { QualityGateOverrideEventJson } from "@guge/db/schema";

function formatDt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ArticleGateOverrideAudit(props: { events: QualityGateOverrideEventJson[] }) {
  if (props.events.length === 0) {
    return null;
  }

  const sorted = [...props.events].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <section className="rounded-md border border-amber-200 bg-amber-50/90 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/25">
      <h3 className="font-medium text-amber-950 dark:text-amber-100">质量闸门 override 审计</h3>
      <p className="mt-1 text-amber-900/85 dark:text-amber-200/80">
        以下记录为曾使用「高级 override」跳过质检并成功保存为 published 的历史（最多保留 {sorted.length} 条）。
      </p>
      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-[11px] text-amber-950 dark:text-amber-100">
        {sorted.map((e) => (
          <li key={`${e.at}-${e.slug}`}>
            {formatDt(e.at)} · slug: {e.slug}
          </li>
        ))}
      </ul>
    </section>
  );
}
