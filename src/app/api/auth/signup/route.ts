import { NextResponse } from "next/server";
import { jsonError, readJson, zodMessage } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { SignupSchema } from "@/lib/auth/validation";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const limit = rateLimit(`signup:${clientIp(request)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return jsonError("Too many sign-up attempts. Please try again later.", 429);

  const parsed = SignupSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 400);
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("An account with this email already exists. Try signing in.", 409);

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });
  await createSession(user);
  return NextResponse.json({ ok: true });
}
