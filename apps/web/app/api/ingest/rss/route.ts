import { NextResponse } from "next/server";

import { runRssIngest } from "@/lib/ingest/rss";

function readSecret(): string | null {
  const value = process.env.INGEST_WEBHOOK_SECRET?.trim();
  return value ? value : null;
}

function unauthorized(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/** 供外部探测存活；RSS 拉取仅允许 POST + Bearer（cron 应使用 POST） */
export function GET() {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: "POST, OPTIONS" },
  });
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: "POST, OPTIONS" },
  });
}

export async function POST(request: Request) {
  const secret = readSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "INGEST_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token =
    authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token || token !== secret) {
    return unauthorized("invalid token");
  }

  const summary = await runRssIngest();
  return NextResponse.json(summary);
}
