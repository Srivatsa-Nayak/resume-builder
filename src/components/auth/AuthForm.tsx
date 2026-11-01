"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";

const OAUTH_ERRORS: Record<string, string> = {
  oauth_unavailable: "That sign-in provider isn't configured.",
  oauth_state: "Your sign-in session expired. Please try again.",
  oauth_unverified: "That account's email isn't verified with the provider.",
  oauth_failed: "We couldn't complete sign-in with that provider. Please try again.",
};

function ProviderIcon({ id }: { id: string }) {
  if (id === "github") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
        <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8.1Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

export function AuthForm({
  mode,
  providers,
  next,
  initialError,
}: {
  mode: "login" | "signup";
  providers: { id: string; name: string }[];
  next: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(initialError ? (OAUTH_ERRORS[initialError] ?? "Sign-in failed.") : "");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection.");
      setLoading(false);
    }
  }

  const isSignup = mode === "signup";
  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-3xl text-ink">{isSignup ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-2 text-sm text-muted">
        {isSignup ? "Start building a resume that gets interviews." : "Sign in to keep working on your resumes."}
      </p>

      {providers.length ? (
        <div className="mt-6 flex flex-col gap-2">
          {providers.map((p) => (
            <a
              key={p.id}
              href={`/api/auth/oauth/${p.id}?next=${encodeURIComponent(next)}`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line-strong bg-surface text-sm font-medium text-ink hover:bg-paper"
            >
              <ProviderIcon id={p.id} /> Continue with {p.name}
            </a>
          ))}
          <div className="my-2 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        {isSignup ? (
          <Field label="Full name" htmlFor="name">
            <Input id="name" name="name" autoComplete="name" required maxLength={100} />
          </Field>
        ) : null}
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={200} />
        </Field>
        <Field label="Password" htmlFor="password" hint={isSignup ? "At least 8 characters." : undefined}>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={isSignup ? 8 : undefined}
            maxLength={200}
          />
        </Field>
        {error ? (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" loading={loading}>
          {isSignup ? "Create account" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {isSignup ? "Already have an account? " : "New here? "}
        <Link
          href={`${isSignup ? "/login" : "/signup"}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-medium text-accent hover:underline"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
