"use client";

import { useCallback, useState } from "react";
import type { z } from "zod";
import { useToast } from "@/components/Toaster";
import type { AiResult, AiTaskSchema } from "@/lib/ai/tasks";

type AiTaskInput = z.input<typeof AiTaskSchema>;
type ResultFor<T extends AiTaskInput["type"]> = Extract<AiResult, { type: T }>;

interface EngineInfo {
  kind: "user" | "platform" | "local";
  label: string;
  notice?: string;
}

/**
 * Calls the AI endpoint. `pending` holds the key of the in-flight request so
 * the matching button can show a spinner.
 */
export function useAi() {
  const toast = useToast();
  const [pending, setPending] = useState<string | null>(null);

  const run = useCallback(
    async <T extends AiTaskInput["type"]>(key: string, task: AiTaskInput & { type: T }): Promise<ResultFor<T> | null> => {
      setPending(key);
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
        });
        const body = (await res.json().catch(() => ({}))) as { result?: AiResult; engine?: EngineInfo; error?: string };
        if (!res.ok || !body.result) {
          toast({ tone: "error", title: "AI request failed", description: body.error ?? "Please try again." });
          return null;
        }
        if (body.engine) {
          toast({ tone: body.engine.notice ? "info" : "success", title: body.engine.label, description: body.engine.notice });
        }
        return body.result as ResultFor<T>;
      } catch {
        toast({ tone: "error", title: "AI request failed", description: "Couldn't reach the server." });
        return null;
      } finally {
        setPending(null);
      }
    },
    [toast],
  );

  return { run, pending };
}
