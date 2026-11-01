import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readJson, zodMessage } from "@/lib/api";
import { PROVIDERS } from "@/lib/ai/providers";
import { prisma } from "@/lib/db";

const PreferencesSchema = z.object({ preferredProvider: z.enum(PROVIDERS).nullable() });

export async function PATCH(request: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const parsed = PreferencesSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 400);
  await prisma.user.update({ where: { id: user.id }, data: { preferredProvider: parsed.data.preferredProvider } });
  return NextResponse.json({ ok: true });
}
