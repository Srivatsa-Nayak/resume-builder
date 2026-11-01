import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readJson, zodMessage } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { passwordField } from "@/lib/auth/validation";
import { prisma } from "@/lib/db";

const UpdateSchema = z.object({
  name: z.string().trim().min(1, "Name can't be empty").max(100).optional(),
  currentPassword: z.string().max(200).optional(),
  newPassword: passwordField.optional(),
});

export async function PATCH(request: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const parsed = UpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 400);
  const { name, currentPassword, newPassword } = parsed.data;

  if (name) await prisma.user.update({ where: { id: user.id }, data: { name } });

  if (newPassword) {
    const record = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (record.passwordHash && !(currentPassword && (await verifyPassword(currentPassword, record.passwordHash)))) {
      return jsonError("Your current password is incorrect.", 400);
    }
    // Bumping tokenVersion signs out every other session.
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword), tokenVersion: { increment: 1 } },
    });
    await createSession(updated);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const body = (await readJson(request)) as { confirmEmail?: string } | null;
  if (body?.confirmEmail?.trim().toLowerCase() !== user.email) {
    return jsonError("Type your email address to confirm.", 400);
  }
  await prisma.user.delete({ where: { id: user.id } });
  await destroySession();
  return NextResponse.json({ ok: true });
}
