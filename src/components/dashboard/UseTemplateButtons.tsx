"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useToast } from "@/components/Toaster";
import { Button } from "@/components/ui";

export const EXAMPLE_NOTICE_KEY = (id: string) => `example-notice:${id}`;

/** Creates a resume from a template, pre-filled with example content, and opens it. Resolves false on failure. */
export function useCreateResume() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const create = useCallback(
    async (templateId: string, accentColor?: string) => {
      setBusy(true);
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: templateId, sample: true, accentColor }),
      }).catch(() => null);
      const body = await res?.json().catch(() => ({}));
      if (!res?.ok) {
        setBusy(false);
        toast({ tone: "error", title: "Couldn't create resume", description: res ? body.error : "Couldn't reach the server." });
        return false;
      }
      try {
        sessionStorage.setItem(EXAMPLE_NOTICE_KEY(body.id), "1");
      } catch {
        // Storage may be unavailable (private mode); the notice is optional.
      }
      router.push(`/resumes/${body.id}`);
      return true;
    },
    [router, toast],
  );

  return { create, busy };
}

/** Creates a resume from a template, pre-filled with example content to edit. */
export function UseTemplateButtons({
  templateId,
  accentColor,
  className,
  size,
}: {
  templateId: string;
  /** Color chosen in the preview; the template's default when omitted. */
  accentColor?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { create, busy } = useCreateResume();
  return (
    <Button onClick={() => create(templateId, accentColor)} loading={busy} className={className} size={size}>
      Use this template
    </Button>
  );
}
