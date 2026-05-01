import { NextResponse } from "next/server";

import { runEnrichArticleDraft } from "@/lib/enrich/worker";

function readSecret(): string | null {
  const value = process.env.ENRICH_WEBHOOK_SECRET?.trim();
  return value ? value : null;
}

function unauthorized(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export async function POST(request: Request) {
  const secret = readSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "ENRICH_WEBHOOK_SECRET is not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token =
    authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token || token !== secret) {
    return unauthorized("invalid token");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const articleId =
    typeof body === "object" &&
    body !== null &&
    "article_id" in body &&
    typeof (body as { article_id: unknown }).article_id === "string" ?
      (body as { article_id: string }).article_id.trim()
    : "";

  if (!articleId) {
    return NextResponse.json({ error: "article_id required" }, { status: 400 });
  }

  const result = await runEnrichArticleDraft(articleId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true, draft: result.draft });
}
