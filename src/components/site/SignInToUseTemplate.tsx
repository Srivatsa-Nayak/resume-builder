"use client";

import Link from "next/link";
import { FilePen, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { UseTemplateButtons } from "@/components/dashboard/UseTemplateButtons";
import { Button, buttonClass } from "@/components/ui";
import type { TemplateDef } from "@/lib/resume/templates";

// The template a signed-out visitor chose, so the gallery can create the
// resume straight after sign-in. Kept in sessionStorage rather than the URL so
// a crafted link can't create resumes in someone's account.
const PENDING_KEY = "pending-template";
const PENDING_TTL_MS = 30 * 60_000;

interface PendingTemplate {
  id: string;
  accent: string;
  at: number;
}

/** Returns (and forgets) the template chosen before sign-in, if it matches `id` and is recent. */
export function takePendingTemplate(id: string): PendingTemplate | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    const pending = raw ? (JSON.parse(raw) as PendingTemplate) : null;
    return pending?.id === id && Date.now() - pending.at < PENDING_TTL_MS ? pending : null;
  } catch {
    return null;
  }
}

/** Where sign-in returns to: the gallery, with this template and color selected. */
function returnPath(templateId: string, accent: string) {
  return `/templates?${new URLSearchParams({ template: templateId, color: accent.replace("#", "") })}`;
}

function SignInPrompt({ template, accent, onClose }: { template: TemplateDef; accent: string; onClose: () => void }) {
  const primary = useRef<HTMLAnchorElement>(null);
  const next = encodeURIComponent(returnPath(template.id, accent));

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    primary.current?.focus();
    // Window capture runs before the template preview's own key handler, so
    // Escape closes only this prompt and the arrows don't change template behind it.
    const onKey = (e: KeyboardEvent) => {
      if (!["Escape", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.stopPropagation();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previous?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-in-prompt-title"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl sm:p-8">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg p-2 text-muted hover:bg-ink/5 hover:text-ink">
          <X className="size-5" />
        </button>
        <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <FilePen className="size-5" />
        </span>
        <h2 id="sign-in-prompt-title" className="mt-4 font-display text-2xl text-ink">
          Sign in to use {template.name}
        </h2>
        <p className="mt-2 leading-relaxed text-ink-soft">
          Your resumes are saved to your account. Create one, or sign in, and we&apos;ll open {template.name} in the color you picked, filled with
          example content to edit.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link ref={primary} href={`/signup?next=${next}`} className={buttonClass("primary", "lg")}>
            Create an account
          </Link>
          <Link href={`/login?next=${next}`} className={buttonClass("secondary", "lg")}>
            I have an account: sign in
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** "Use this template" for signed-out visitors: remembers the choice and asks them to sign in or create an account. */
export function SignInToUseTemplate({
  template,
  accentColor,
  className,
  size,
}: {
  template: TemplateDef;
  accentColor: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  function choose() {
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ id: template.id, accent: accentColor, at: Date.now() } satisfies PendingTemplate));
    } catch {
      // Without storage, sign-in still returns to this template's preview.
    }
    setOpen(true);
  }

  return (
    <>
      <Button onClick={choose} className={className} size={size}>
        Use this template
      </Button>
      {open ? <SignInPrompt template={template} accent={accentColor} onClose={close} /> : null}
    </>
  );
}

/** The template preview's main button: creates the resume when signed in, otherwise asks the visitor to sign in first. */
export function templateAction(signedIn: boolean) {
  return function TemplateAction(template: TemplateDef, accent: string): ReactNode {
    return signedIn ? (
      <UseTemplateButtons templateId={template.id} accentColor={accent} size="lg" className="w-full" />
    ) : (
      <SignInToUseTemplate template={template} accentColor={accent} size="lg" className="w-full" />
    );
  };
}
