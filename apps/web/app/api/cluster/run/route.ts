import { NextResponse } from "next/server";

import { runClusterBucketBatch } from "@/lib/clusters/bucket-worker";

function readSecret(): string | null {
  const value = process.env.CLUSTER_WEBHOOK_SECRET?.trim();
  return value ? value : null;
}

function unauthorized(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function POST(request: Request) {
  const secret = readSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "CLUSTER_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token =
    authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token || token !== secret) {
    return unauthorized("invalid token");
  }

  const summary = await runClusterBucketBatch();
  return NextResponse.json(summary);
}
