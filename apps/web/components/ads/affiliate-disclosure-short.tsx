import Link from "next/link";

import { ADVERTISING_DISCLOSURE_PATH } from "@/lib/ads/constants";

/** 正文附近短披露：指向完整《广告与联盟披露》页 */
export function AffiliateDisclosureShort() {
  return (
    <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400" lang="zh-CN">
      本站可能出现展示广告或联盟推广链接；若您通过此类链接完成购买或注册，我们可能获得少量佣金或费用，不改变您应付价格。
      <Link
        className="ml-1 whitespace-nowrap underline hover:text-neutral-800 dark:hover:text-neutral-200"
        href={ADVERTISING_DISCLOSURE_PATH}
      >
        广告与联盟披露
      </Link>
    </p>
  );
}
