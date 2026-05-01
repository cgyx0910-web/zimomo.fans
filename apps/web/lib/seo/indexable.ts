function parseBool(value: string | undefined): boolean | undefined {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

/**
 * 公开索引总开关（统一语义）：
 * 1) `PUBLIC_INDEXING_OVERRIDE` 显式覆盖（true/false）
 * 2) `DEPLOYMENT_ENV=production` 默认允许索引，其它环境默认 noindex
 * 3) 兼容旧变量：`ROBOTS_ALLOW_ALL=false` 或 `DISABLE_PUBLIC_INDEXING=true` 会强制 noindex
 */
export function isPublicIndexingEnabled(): boolean {
  const override = parseBool(process.env.PUBLIC_INDEXING_OVERRIDE);
  if (typeof override === "boolean") {
    return override;
  }

  const deploymentEnv = (process.env.DEPLOYMENT_ENV ?? "").trim().toLowerCase();
  const isProduction = deploymentEnv === "production";

  if (
    process.env.ROBOTS_ALLOW_ALL === "false" ||
    process.env.DISABLE_PUBLIC_INDEXING === "true"
  ) {
    return false;
  }

  return isProduction;
}
