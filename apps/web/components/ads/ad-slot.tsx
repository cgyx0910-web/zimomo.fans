"use client";

import { useEffect, useRef, useState } from "react";

/**
 * E4：广告槽占位——进入视口后再挂载占位内容，减少对首屏 CLS/网络的占用。
 * 正式接入 SSP/自建广告时再替换 inner。
 */
export function AdSlot(props: {
  /** 站内识别用，不改变行为 */
  slotName: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const ob = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) {
          setVisible(true);
          ob.disconnect();
        }
      },
      { rootMargin: "200px", threshold: 0.02 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  return (
    <aside
      ref={containerRef}
      aria-hidden={!visible}
      aria-label={`广告区 ${props.slotName}`}
      className={`w-full overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-100/80 dark:border-neutral-600 dark:bg-neutral-900/40 ${props.className ?? ""}`}
      data-ad-slot={props.slotName}
    >
      {!visible ?
        <div aria-hidden className="min-h-[120px]" />
      : <div className="flex min-h-[120px] flex-col items-center justify-center gap-1 px-4 py-6 text-center">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Advertisement placeholder
          </span>
          <span className="text-xs text-neutral-600 dark:text-neutral-400" lang="zh-CN">
            广告位占位（{props.slotName}） · 暂未接入投放
          </span>
        </div>
      }
    </aside>
  );
}
