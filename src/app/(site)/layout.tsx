import type { ReactNode } from "react";
import { AppNav } from "@/components/app/AppNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteNav } from "@/components/site/SiteNav";
import { getCurrentUser } from "@/lib/auth/session";

// Pages anyone can open (templates, help). Signed-in people keep the app's navigation.
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col">
      {user ? <AppNav userName={user.name || user.email} /> : <SiteNav />}
      <main className="w-full flex-1 px-6 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
