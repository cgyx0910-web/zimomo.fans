import { NextResponse } from "next/server";

import { runRssIngest } from "@/lib/ingest/rss";

function readSecret(): string | null {
  const value = process.env.INGEST_WEBHOOK_SECRET?.trim();
  return value ? value : null;
}

function unauthorized(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
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
