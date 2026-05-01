import { NextResponse } from "next/server";

import { runNormalizeBatch } from "@/lib/normalize/worker";

function readSecret(): string | null {
  const value = process.env.NORMALIZE_WEBHOOK_SECRET?.trim();
  return value ? value : null;
}

function unauthorized(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function POST(request: Request) {
  const secret = readSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "NORMALIZE_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token =
    authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token || token !== secret) {
    return unauthorized("invalid token");
  }

  const summary = await runNormalizeBatch();
  return NextResponse.json(summary);
}
