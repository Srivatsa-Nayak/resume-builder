import Link from "next/link";
import type { ReactNode } from "react";
import { TemplateImage } from "@/components/resume/TemplateImage";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Link href="/" className="self-start">
          <Logo />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">{children}</div>
      </div>
      <div className="hidden flex-col items-center justify-center gap-6 border-l border-line bg-accent-soft px-12 py-10 lg:flex">
        {/* Width is capped so the whole page fits on screen; no rotation, which would blur the text. */}
        <div className="w-full max-w-[min(500px,calc((100vh-12rem)*0.707))] overflow-hidden rounded-md shadow-[var(--shadow-sheet)] ring-1 ring-ink/5">
          <TemplateImage templateId="aurora" sizes="500px" eager />
        </div>
        <p className="max-w-sm text-center text-[15px] text-accent-strong">
          Every template exports real, selectable text that applicant tracking systems can read.
        </p>
      </div>
    </div>
  );
}
