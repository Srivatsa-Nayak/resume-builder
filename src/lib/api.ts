import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { getCurrentUser, type SessionUser } from "@/lib/auth/session";

export function jsonError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function zodMessage(error: ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid request";
  const path = issue.path.join(".");
  return path ? `${path}: ${issue.message}` : issue.message;
}

/** Resolves the signed-in user for an API route, or a 401 response. */
export async function apiUser(): Promise<{ user: SessionUser; error?: never } | { user?: never; error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { error: jsonError("You need to sign in first.", 401) };
  return { user };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
