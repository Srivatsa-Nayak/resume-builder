import Link from "next/link";
import { buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";

export default async function NotFound() {
  // Signed-out visitors go home; sending them to the dashboard would bounce them to sign-in.
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-6xl text-accent">404</p>
      <h1 className="mt-4 font-display text-2xl text-ink">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-muted">It may have been deleted, or the link is wrong.</p>
      <Link href={user ? "/dashboard" : "/"} className={buttonClass("primary", "md", "mt-6")}>
        {user ? "Back to dashboard" : "Go to the home page"}
      </Link>
    </div>
  );
}
