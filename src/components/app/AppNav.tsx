"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo, cn } from "@/components/ui";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/templates", label: "Templates" },
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help" },
];

export function AppNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/dashboard">
          <Logo />
        </Link>
        {/* Below md the links move into the menu so nothing is cut off on phones. */}
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname.startsWith(l.href) ? "bg-ink/5 text-ink" : "text-muted hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-sm text-muted lg:inline">{userName}</span>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-ink/5 hover:text-ink md:inline-flex"
          >
            <LogOut className="size-4" /> Sign out
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="app-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="inline-flex size-8 items-center justify-center rounded-md text-ink-soft hover:bg-ink/5 md:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <div id="app-menu" className="border-t border-line px-4 py-2 md:hidden">
          <nav>
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2.5 font-medium",
                  pathname.startsWith(l.href) ? "bg-ink/5 text-ink" : "text-ink-soft hover:bg-ink/5",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-line px-3 pb-1 pt-3">
            <span className="min-w-0 truncate text-sm text-muted">{userName}</span>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
