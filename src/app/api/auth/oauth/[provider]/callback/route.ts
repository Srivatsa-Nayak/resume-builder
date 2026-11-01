import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { callbackUrl, exchangeCode, getProvider, isOAuthProvider } from "@/lib/auth/oauth";
import { createSession } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/validation";
import { prisma } from "@/lib/db";

function sameString(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: id } = await params;
  const url = new URL(request.url);
  const fail = (code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, request.url));

  const provider = isOAuthProvider(id) ? getProvider(id) : null;
  if (!provider) return fail("oauth_unavailable");

  const store = await cookies();
  const expectedState = store.get("oauth_state")?.value;
  const next = safeNextPath(store.get("oauth_next")?.value);
  store.delete("oauth_state");
  store.delete("oauth_next");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !expectedState || !sameString(state, expectedState)) return fail("oauth_state");

  try {
    const accessToken = await exchangeCode(provider, code, callbackUrl(request, provider.id));
    const profile = await provider.fetchProfile(accessToken);
    const email = profile.email.toLowerCase();

    const linked = await prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: provider.id, providerAccountId: profile.providerAccountId } },
      include: { user: true },
    });

    let user = linked?.user ?? null;
    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && !profile.emailVerified) return fail("oauth_unverified");
      user =
        existing ??
        (await prisma.user.create({ data: { email, name: profile.name, image: profile.image } }));
      await prisma.oAuthAccount.create({
        data: { provider: provider.id, providerAccountId: profile.providerAccountId, userId: user.id },
      });
    }

    await createSession(user);
    return NextResponse.redirect(new URL(next, request.url));
  } catch (err) {
    console.error(`[oauth:${provider.id}]`, err instanceof Error ? err.message : err);
    return fail("oauth_failed");
  }
}
