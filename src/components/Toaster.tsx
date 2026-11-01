"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "./ui";

type Tone = "success" | "error" | "info";

interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: Tone;
}

type ToastInput = Omit<Toast, "id" | "tone"> & { tone?: Tone };

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (input: ToastInput) => {
      const toast: Toast = { tone: "info", ...input, id: nextId++ };
      setToasts((list) => [...list.slice(-3), toast]);
      setTimeout(() => dismiss(toast.id), toast.tone === "error" ? 8000 : 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);
  const icons = { success: CircleCheck, error: CircleAlert, info: Info };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => {
          const Icon = icons[t.tone];
          return (
            <div
              key={t.id}
              className="animate-toast-in pointer-events-auto flex items-start gap-3 rounded-lg border border-line bg-surface p-3 text-sm shadow-lg"
            >
              <Icon className={cn("mt-0.5 size-4 shrink-0", t.tone === "error" ? "text-danger" : t.tone === "success" ? "text-accent" : "text-muted")} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{t.title}</p>
                {t.description ? <p className="mt-0.5 text-muted">{t.description}</p> : null}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="text-muted hover:text-ink" aria-label="Dismiss">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
