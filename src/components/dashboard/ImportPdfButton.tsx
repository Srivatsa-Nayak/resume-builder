"use client";

import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { useToast } from "@/components/Toaster";
import { Button, Spinner } from "@/components/ui";

export const IMPORT_NOTICE_KEY = (id: string) => `import-notice:${id}`;

export function ImportPdfButton({ variant = "secondary" }: { variant?: "secondary" | "subtle" }) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > 5 * 1024 * 1024) return toast({ tone: "error", title: "File too large", description: "PDFs must be 5 MB or smaller." });
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/resumes/import", { method: "POST", body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ tone: "error", title: "Import failed", description: body.error });
        setBusy(false);
        return;
      }
      try {
        sessionStorage.setItem(IMPORT_NOTICE_KEY(body.id), JSON.stringify({ method: body.method, engine: body.engine, warnings: body.warnings }));
      } catch {
        // Storage may be unavailable (private mode); the notice is optional.
      }
      router.push(`/resumes/${body.id}`);
    } catch {
      toast({ tone: "error", title: "Import failed", description: "Couldn't reach the server." });
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <Button variant={variant} onClick={() => input.current?.click()} disabled={busy}>
        <FileUp className="size-4" /> Import PDF
      </Button>
      {busy ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 backdrop-blur-sm" role="dialog" aria-live="polite">
          <div className="flex items-center gap-3 rounded-xl bg-surface px-6 py-5 shadow-xl">
            <Spinner className="size-5 text-accent" />
            <div>
              <p className="font-medium text-ink">Reading your resume…</p>
              <p className="text-sm text-muted">Extracting text and mapping it to sections.</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
