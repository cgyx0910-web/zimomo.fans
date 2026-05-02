"use client";

import { useEffect } from "react";

export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] route error", error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-16 text-neutral-800 dark:text-neutral-100">
      <h1 className="text-lg font-semibold">后台页面加载失败</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        服务端渲染出错。常见原因：数据库连接失败（Postgres <code className="text-xs">28P01</code>
        口令不一致）、迁移未跑完。请在服务器查看{" "}
        <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">
          docker compose -f compose.vps.yaml logs web --tail=80
        </code>
        ，并参阅{" "}
        <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">
          docs/RUNBOOK.md
        </code>{" "}
        中「Admin / Postgres 28P01」一节；也可运行仓库{" "}
        <code className="rounded bg-neutral-100 px-1 font-mono text-xs dark:bg-neutral-800">
          scripts/verify-vps-admin-db.sh
        </code>
        。
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-neutral-500 dark:text-neutral-500">
          digest: {error.digest}
        </p>
      ) : null}
      <button
        type="button"
        className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
        onClick={() => reset()}
      >
        重试
      </button>
    </div>
  );
}
