"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo, buttonClass, cn } from "@/components/ui";

const LINKS = [
  { href: "/templates", label: "Templates" },
  { href: "/help", label: "Help" },
];

/** Navigation for visitors: the landing page, template gallery and help. */
export function SiteNav({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Resume Builder home">
          <Logo compact />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                isActive(l.href) ? "bg-ink/5 text-ink" : "text-muted hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {signedIn ? (
            <Link href="/dashboard" className={buttonClass("primary", "sm", "sm:h-9 sm:px-3.5 sm:text-sm")}>
              Open dashboard
            </Link>
          ) : (
            <>
              {/* Compact buttons on phones; sm: classes restore the regular size. */}
              <Link href="/login" className={buttonClass("ghost", "sm", "sm:h-9 sm:px-3.5 sm:text-sm")}>
                Sign in
              </Link>
              <Link href="/signup" className={buttonClass("primary", "sm", "sm:h-9 sm:px-3.5 sm:text-sm")}>
                Create account
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="inline-flex size-8 items-center justify-center rounded-md text-ink-soft hover:bg-ink/5 sm:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <nav id="site-menu" aria-label="Main" className="border-t border-line px-4 py-2 sm:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn("block rounded-md px-3 py-2.5 font-medium", isActive(l.href) ? "bg-ink/5 text-ink" : "text-ink-soft hover:bg-ink/5")}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
