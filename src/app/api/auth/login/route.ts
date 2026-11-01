import { NextResponse } from "next/server";
import { jsonError, readJson, zodMessage } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { LoginSchema } from "@/lib/auth/validation";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Compared against when the account doesn't exist, so response timing doesn't reveal which emails are registered.
let dummyHash: Promise<string> | null = null;

export async function POST(request: Request) {
  const parsed = LoginSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 400);
  const { email, password } = parsed.data;

  const limit = rateLimit(`login:${clientIp(request)}:${email}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return jsonError(`Too many attempts. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`, 429);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    await verifyPassword(password, await (dummyHash ??= hashPassword("not-a-real-password")));
    return jsonError("Invalid email or password.", 401);
  }
  if (!(await verifyPassword(password, user.passwordHash))) return jsonError("Invalid email or password.", 401);

  await createSession(user);
  return NextResponse.json({ ok: true });
}
