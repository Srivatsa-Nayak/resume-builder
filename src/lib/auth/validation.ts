import { z } from "zod";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailField = z.string().trim().toLowerCase().max(200).regex(EMAIL_RE, "Enter a valid email address");
export const passwordField = z.string().min(8, "Password must be at least 8 characters").max(200);

export const SignupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: emailField,
  password: passwordField,
});

export const LoginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password").max(200),
});

/** Only allow same-site relative redirects (prevents open redirects). */
export function safeNextPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
