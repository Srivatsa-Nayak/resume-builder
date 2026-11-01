import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authorizationUrl, callbackUrl, getProvider, isOAuthProvider } from "@/lib/auth/oauth";
import { safeNextPath } from "@/lib/auth/validation";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: id } = await params;
  const provider = isOAuthProvider(id) ? getProvider(id) : null;
  if (!provider) return NextResponse.redirect(new URL("/login?error=oauth_unavailable", request.url));

  const state = randomBytes(24).toString("base64url");
  const next = safeNextPath(new URL(request.url).searchParams.get("next"));
  const store = await cookies();
  const cookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 600 };
  store.set("oauth_state", state, cookie);
  store.set("oauth_next", next, cookie);

  return NextResponse.redirect(authorizationUrl(provider, callbackUrl(request, provider.id), state));
}
