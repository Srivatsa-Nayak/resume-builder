import type { ReactNode } from "react";
import { AppNav } from "@/components/app/AppNav";
import { SiteFooter } from "@/components/SiteFooter";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen flex-col">
      <AppNav userName={user.name || user.email} />
      {/* Pages set their own max width (the template gallery is wider than the rest). */}
      <main className="w-full flex-1 px-6 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
