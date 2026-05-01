/** 进程内固定窗口计数（单实例；重启清空；多实例不共享）。 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();
const MAX_BUCKETS = 10_000;

function evictIfNeeded(now: number): void {
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) {
      buckets.delete(k);
    }
  }
  while (buckets.size >= MAX_BUCKETS) {
    let oldestKey: string | null = null;
    let oldestReset = Infinity;
    for (const [k, v] of buckets) {
      if (v.resetAt < oldestReset) {
        oldestReset = v.resetAt;
        oldestKey = k;
      }
    }
    if (oldestKey) {
      buckets.delete(oldestKey);
    } else {
      break;
    }
  }
}

export function checkRateLimit(params: {
  bucketKey: string;
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult {
  const now = params.now ?? Date.now();
  const cur = buckets.get(params.bucketKey);
  if (!cur || cur.resetAt <= now) {
    evictIfNeeded(now);
    buckets.set(params.bucketKey, {
      count: 1,
      resetAt: now + params.windowMs,
    });
    return { allowed: true, remaining: params.limit - 1, retryAfterMs: 0 };
  }
  if (cur.count >= params.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, cur.resetAt - now),
    };
  }
  cur.count += 1;
  return {
    allowed: true,
    remaining: params.limit - cur.count,
    retryAfterMs: 0,
  };
}
