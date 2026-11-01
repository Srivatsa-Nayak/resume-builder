import Link from "next/link";
import { Logo } from "./ui";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-6">
        <Link href="/" aria-label="Resume Builder home">
          <Logo className="text-base" />
        </Link>
        <nav aria-label="Footer" className="flex gap-5 text-sm text-muted">
          <Link href="/templates" className="hover:text-ink">
            Templates
          </Link>
          <Link href="/help" className="hover:text-ink">
            Help
          </Link>
        </nav>
        <p className="text-sm text-muted">Built by Srivatsa Nayak</p>
      </div>
    </footer>
  );
}
