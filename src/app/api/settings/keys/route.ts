import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readJson, zodMessage } from "@/lib/api";
import { PROVIDERS, defaultModel, isProviderId } from "@/lib/ai/providers";
import { apiKeyAad, platformDailyLimit, platformProvider, platformUsageToday } from "@/lib/ai/router";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";

const SaveSchema = z.object({
  provider: z.enum(PROVIDERS),
  apiKey: z
    .string()
    .trim()
    .min(10, "That doesn't look like a valid API key")
    .max(400)
    .regex(/^\S+$/, "API keys can't contain spaces")
    .optional(),
  model: z
    .string()
    .trim()
    .max(100)
    .regex(/^[A-Za-z0-9._:/-]*$/, "Invalid model name")
    .optional(),
});

/** Lists the user's keys (masked; plaintext never leaves the server) and platform AI status. */
export async function GET() {
  const { user, error } = await apiUser();
  if (error) return error;
  const keys = await prisma.apiKey.findMany({
    where: { userId: user.id },
    select: { provider: true, last4: true, model: true, updatedAt: true },
  });
  const platform = platformProvider();
  return NextResponse.json({
    keys,
    preferredProvider: user.preferredProvider,
    defaults: Object.fromEntries(PROVIDERS.map((p) => [p, defaultModel(p)])),
    platform: {
      available: !!platform,
      provider: platform?.provider ?? null,
      used: await platformUsageToday(user.id),
      limit: platformDailyLimit(),
    },
  });
}

export async function PUT(request: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const parsed = SaveSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 400);
  const { provider, apiKey, model } = parsed.data;

  const existing = await prisma.apiKey.findUnique({ where: { userId_provider: { userId: user.id, provider } } });
  if (!apiKey && !existing) return jsonError("Enter an API key.", 400);

  const modelValue = model === undefined ? undefined : model || null;
  const keyFields = apiKey ? { encryptedKey: encryptSecret(apiKey, apiKeyAad(user.id, provider)), last4: apiKey.slice(-4) } : {};

  const saved = existing
    ? await prisma.apiKey.update({ where: { id: existing.id }, data: { ...keyFields, model: modelValue } })
    : await prisma.apiKey.create({
        data: { userId: user.id, provider, model: modelValue ?? null, encryptedKey: keyFields.encryptedKey!, last4: keyFields.last4! },
      });
  return NextResponse.json({ key: { provider: saved.provider, last4: saved.last4, model: saved.model, updatedAt: saved.updatedAt } });
}

export async function DELETE(request: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const provider = new URL(request.url).searchParams.get("provider");
  if (!isProviderId(provider)) return jsonError("Unknown provider", 400);
  await prisma.apiKey.deleteMany({ where: { userId: user.id, provider } });
  if (user.preferredProvider === provider) {
    await prisma.user.update({ where: { id: user.id }, data: { preferredProvider: null } });
  }
  return NextResponse.json({ ok: true });
}
