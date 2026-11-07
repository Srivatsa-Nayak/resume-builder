import { NextResponse } from "next/server";
import { apiUser, jsonError, readJson, zodMessage } from "@/lib/api";
import { AiTaskError, runAiTask } from "@/lib/ai/router";
import { AiTaskSchema } from "@/lib/ai/tasks";
import { rateLimit } from "@/lib/rate-limit";

// Allow time for slow work on serverless hosts (Vercel's default limit can be shorter): AI model responses.
export const maxDuration = 60;

export async function POST(request: Request) {
  const { user, error } = await apiUser();
  if (error) return error;

  // Burst protection applies to every engine, including the user's own key.
  const limit = rateLimit(`ai:${user.id}`, 20, 60 * 1000);
  if (!limit.ok) return jsonError(`Slow down a little: try again in ${limit.retryAfterSeconds}s.`, 429);

  const parsed = AiTaskSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 400);

  try {
    const { result, engine } = await runAiTask(user.id, parsed.data, user.preferredProvider);
    return NextResponse.json({ result, engine });
  } catch (err) {
    if (err instanceof AiTaskError) return jsonError(err.message, err.status);
    console.error("[ai]", err);
    return jsonError("Something went wrong while generating content.", 500);
  }
}
