import { forceUnsubscribeNewsletterAction } from "@/actions/newsletter-admin-actions";
import {
  listNewsletterSubscriptionsForAdmin,
  type NewsletterSubscriptionRow,
} from "@/lib/newsletter/queries";

export const dynamic = "force-dynamic";

function badge(status: NewsletterSubscriptionRow["status"]): string {
  switch (status) {
    case "pending_confirmation":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-100";
    case "confirmed":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-100";
    case "unsubscribed":
      return "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200";
    default:
      return "bg-neutral-100 text-neutral-800";
  }
}

function statusLabel(status: NewsletterSubscriptionRow["status"]): string {
  switch (status) {
    case "pending_confirmation":
      return "待确认";
    case "confirmed":
      return "已确认";
    case "unsubscribed":
      return "已退订";
    default:
      return status;
  }
}

export default async function AdminNewsletterPage() {
  let rows: NewsletterSubscriptionRow[] = [];
  try {
    rows = await listNewsletterSubscriptionsForAdmin();
  } catch {
    rows = [];
  }

  const pending = rows.filter((r) => r.status === "pending_confirmation");
  const confirmed = rows.filter((r) => r.status === "confirmed");
  const unsubscribed = rows.filter((r) => r.status === "unsubscribed");

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Newsletter</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          双 opt-in 订阅列表；可对「已确认」强制退订（合规请求）。退订链接由用户邮件/确认页持有。
        </p>
      </div>

      <Bucket title="待确认" rows={pending} showForce={false} />
      <Bucket title="已确认" rows={confirmed} showForce />
      <Bucket title="已退订" rows={unsubscribed} showForce={false} />
    </div>
  );
}

function Bucket(props: {
  title: string;
  rows: NewsletterSubscriptionRow[];
  showForce: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">
        {props.title}{" "}
        <span className="text-sm font-normal text-neutral-500">
          （{props.rows.length}）
        </span>
      </h2>
      {props.rows.length === 0 ?
        <p className="text-sm text-neutral-500">暂无记录。</p>
      : (
        <ul className="flex flex-col gap-3">
          {props.rows.map((r) => (
            <li
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-950"
              key={r.id}
            >
              <div className="min-w-0 space-y-1">
                <p className="font-mono text-sm">{r.email}</p>
                <p className="text-xs text-neutral-500">
                  UTM:{" "}
                  {[r.utmSource, r.utmMedium, r.utmCampaign]
                    .filter(Boolean)
                    .join(" / ") || "—"}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge(r.status)}`}
                >
                  {statusLabel(r.status)}
                </span>
                {props.showForce && r.status === "confirmed" ?
                  <form action={forceUnsubscribeNewsletterAction}>
                    <input name="id" type="hidden" value={r.id} />
                    <button
                      className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-800 dark:border-red-900 dark:text-red-200"
                      type="submit"
                    >
                      强制退订
                    </button>
                  </form>
                : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
