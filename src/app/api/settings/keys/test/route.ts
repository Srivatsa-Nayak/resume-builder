import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readJson, zodMessage } from "@/lib/api";
import { AiProviderError, PROVIDERS } from "@/lib/ai/providers";
import { apiKeyAad, testProviderKey } from "@/lib/ai/router";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const TestSchema = z.object({ provider: z.enum(PROVIDERS) });

/** Verifies a stored key by making a minimal request to the provider. */
export async function POST(request: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!rateLimit(`key-test:${user.id}`, 10, 60 * 1000).ok) return jsonError("Too many tests. Wait a minute and try again.", 429);

  const parsed = TestSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 400);
  const { provider } = parsed.data;

  const key = await prisma.apiKey.findUnique({ where: { userId_provider: { userId: user.id, provider } } });
  if (!key) return jsonError("No key saved for this provider.", 404);

  let apiKey: string;
  try {
    apiKey = decryptSecret(key.encryptedKey, apiKeyAad(user.id, provider));
  } catch {
    return jsonError("This key can no longer be decrypted (the server's encryption key changed). Please re-enter it.", 409);
  }

  try {
    await testProviderKey(provider, apiKey, key.model);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof AiProviderError ? err.message : "The provider could not be reached.";
    return NextResponse.json({ ok: false, error: message });
  }
}
