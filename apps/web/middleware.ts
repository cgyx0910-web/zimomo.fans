import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_SESSION_COOKIE } from "@/lib/auth/constants";
import { verifyAdminJwt } from "@/lib/auth/token";
import { defaultLocale, isAppLocale } from "@/lib/i18n/config";
import { isPublicIndexingEnabled } from "@/lib/seo/indexable";

function withNoIndexingHeader(res: NextResponse): NextResponse {
  if (!isPublicIndexingEnabled()) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

function withLocaleRequest(request: NextRequest, locale: string): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-guge-locale", locale);
  return withNoIndexingHeader(
    NextResponse.next({ request: { headers: requestHeaders } })
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login") {
      return withNoIndexingHeader(NextResponse.next());
    }

    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      return withNoIndexingHeader(
        new NextResponse("ADMIN_JWT_SECRET is not configured", {
          status: 500,
        })
      );
    }

    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", pathname);
      return withNoIndexingHeader(NextResponse.redirect(login));
    }

    try {
      await verifyAdminJwt({ token, secret });
      return withNoIndexingHeader(NextResponse.next());
    } catch {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("next", pathname);
      return withNoIndexingHeader(NextResponse.redirect(login));
    }
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/calendar/feed")
  ) {
    return withNoIndexingHeader(NextResponse.next());
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (first && isAppLocale(first)) {
    return withLocaleRequest(request, first);
  }

  const url = request.nextUrl.clone();
  const rest = pathname === "/" ? "" : pathname;
  url.pathname = `/${defaultLocale}${rest}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
