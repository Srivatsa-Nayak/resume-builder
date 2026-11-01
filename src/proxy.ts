import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

// Optimistic route protection: pages still verify the session against the
// database, this only avoids rendering protected pages for signed-out users.

// The template gallery and help pages are public.
const PROTECTED = ["/dashboard", "/resumes", "/settings"];
const AUTH_PAGES = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // CSRF defence in depth (cookies are SameSite=Lax): reject cross-origin mutations.
  if (pathname.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (origin) {
      let originHost: string | null = null;
      try {
        originHost = new URL(origin).host;
      } catch {
        // "null" or malformed origin
      }
      const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
      if (originHost !== host) return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
    }
    return NextResponse.next();
  }

  const signedIn = !!(await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value));

  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !signedIn) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  if (AUTH_PAGES.includes(pathname) && signedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
