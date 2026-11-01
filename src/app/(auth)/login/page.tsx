import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { configuredProviders } from "@/lib/auth/oauth";
import { safeNextPath } from "@/lib/auth/validation";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return <AuthForm mode="login" providers={configuredProviders()} next={safeNextPath(next)} initialError={error} />;
}
