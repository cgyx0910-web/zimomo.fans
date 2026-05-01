import type { ApprovedCommentPublic } from "@/lib/comments/queries";

function formatCommentTime(value: Date): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function ArticleCommentList(props: {
  comments: ApprovedCommentPublic[];
}) {
  if (props.comments.length === 0) {
    return (
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        暂无已发布的评论。
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4 border-t border-neutral-200 pt-4 dark:border-neutral-800">
      {props.comments.map((c) => (
        <li className="text-sm text-neutral-800 dark:text-neutral-200" key={c.id}>
          <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>
          <p className="mt-2 text-xs text-neutral-500">
            <span className="font-medium text-neutral-600 dark:text-neutral-400">
              {c.authorLabel}
            </span>
            <span aria-hidden className="px-1.5">
              ·
            </span>
            <time dateTime={c.createdAt.toISOString()}>
              {formatCommentTime(c.createdAt)}
            </time>
          </p>
        </li>
      ))}
    </ul>
  );
}
