"use client";

import { TriangleAlert } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Field, Input } from "./ui";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" gives the confirm button the destructive style and focuses Cancel. */
  tone?: "default" | "danger";
  /** Text the person must type before confirming, e.g. their email for account deletion. */
  requireText?: string;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm>(async () => false);

/** In-app replacement for window.confirm: `if (!(await confirm({ title }))) return;` */
export function useConfirm() {
  return useContext(ConfirmContext);
}

function ConfirmDialog({ options, onSettle }: { options: ConfirmOptions; onSettle: (result: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const [typed, setTyped] = useState("");
  const { title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", tone = "default", requireText } = options;
  const danger = tone === "danger";
  const matched = !requireText || typed.trim().toLowerCase() === requireText.toLowerCase();
  // Start on the input when typing is required, otherwise on the safer button.
  const focus = requireText ? "input" : danger ? "cancel" : "confirm";

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = dialog.current;
    // showModal puts the dialog in the top layer and makes the page behind it inert.
    if (el && !el.open) el.showModal();
    el?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => previous?.focus();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-labelledby="confirm-title"
      aria-describedby={description ? "confirm-description" : undefined}
      // Escape closes the dialog natively; this reports it as a cancel.
      onClose={() => onSettle(false)}
      // Only a press that starts and ends on the backdrop cancels, not a text selection dragged out of the input.
      onMouseDown={(e) => (pressedBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => pressedBackdrop.current && e.target === e.currentTarget && onSettle(false)}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/50 backdrop:backdrop-blur-sm"
    >
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (matched) onSettle(true);
        }}
      >
        <div className="flex gap-4">
          {danger ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <TriangleAlert className="size-5" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="break-words font-display text-xl text-ink">
              {title}
            </h2>
            {description ? (
              <div id="confirm-description" className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                {description}
              </div>
            ) : null}
          </div>
        </div>
        {requireText ? (
          <Field label={`Type ${requireText} to confirm`} htmlFor="confirm-text" className="mt-5">
            <Input
              id="confirm-text"
              data-autofocus
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </Field>
        ) : null}
        {/* Phones: full-width buttons with the confirm action on top. */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => onSettle(false)} data-autofocus={focus === "cancel" || undefined}>
            {cancelLabel}
          </Button>
          <Button type="submit" variant={danger ? "danger" : "primary"} disabled={!matched} data-autofocus={focus === "confirm" || undefined}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<{ id: number; options: ConfirmOptions } | null>(null);
  const pending = useRef<((result: boolean) => void) | null>(null);
  const nextId = useRef(0);

  const confirm = useCallback<Confirm>(
    (options) =>
      new Promise<boolean>((resolve) => {
        pending.current?.(false); // A newer request replaces an unanswered one.
        pending.current = resolve;
        setRequest({ id: ++nextId.current, options });
      }),
    [],
  );

  const settle = useCallback((result: boolean) => {
    if (!pending.current) return;
    pending.current(result);
    pending.current = null;
    setRequest(null);
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {/* Keyed so each request starts fresh (empty input, initial focus). */}
      {request ? <ConfirmDialog key={request.id} options={request.options} onSettle={settle} /> : null}
    </ConfirmContext.Provider>
  );
}
