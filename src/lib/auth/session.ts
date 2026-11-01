import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSessionToken, verifySessionToken } from "./token";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  hasPassword: boolean;
  preferredProvider: string | null;
}

export async function createSession(user: { id: string; tokenVersion: number }): Promise<void> {
  const token = await signSessionToken({ userId: user.id, version: user.tokenVersion });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Returns the signed-in user, or null. Cached for the duration of a request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const session = await verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.tokenVersion !== session.version) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    hasPassword: !!user.passwordHash,
    preferredProvider: user.preferredProvider,
  };
});

/** For server components: redirects to the login page when signed out. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}
