import type { EditorialFaqItem } from "@/lib/faq/editorial-faq";

type EditorialFaqProps = {
  items: EditorialFaqItem[];
};

const headingId = "editorial-faq-heading";

/** 常见问题（编辑部整理），明示非 UGC / 非评论区 */
export function EditorialFaq(props: EditorialFaqProps) {
  if (!props.items.length) {
    return null;
  }

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border border-sky-200 bg-sky-50/90 p-5 dark:border-sky-900/50 dark:bg-sky-950/30"
    >
      <div className="space-y-1 border-b border-sky-200/80 pb-3 dark:border-sky-900/40">
        <h2 className="text-lg font-semibold text-sky-950 dark:text-sky-50" id={headingId}>
          常见问题（编辑部整理）
        </h2>
        <p className="text-xs text-sky-900/85 dark:text-sky-200/80">
          以下为编辑部编撰的说明性问答，不代表用户评论区或社群讨论快照；事实类内容请仍以正文与可追溯来源为准。
        </p>
      </div>
      <dl className="mt-4 space-y-5">
        {props.items.map((item, i) => (
          <div key={`${i}-${item.question.slice(0, 48)}`}>
            <dt className="font-medium text-neutral-900 dark:text-neutral-50">
              {item.question}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {item.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
