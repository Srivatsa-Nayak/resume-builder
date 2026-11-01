"use client";

import { X } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

/** Chip-style input: type a value and press Enter or comma to add it. */
export function TagInput({ values, onChange, placeholder, id }: { values: string[]; onChange: (values: string[]) => void; placeholder?: string; id?: string }) {
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const incoming = raw
      .split(/[,;\n]/)
      .map((v) => v.trim())
      .filter(Boolean);
    const existing = new Set(values.map((v) => v.toLowerCase()));
    const fresh = incoming.filter((v) => !existing.has(v.toLowerCase()) && existing.add(v.toLowerCase()));
    if (fresh.length) onChange([...values, ...fresh].slice(0, 60));
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
      {values.map((v, i) => (
        <span key={`${v}-${i}`} className="inline-flex items-center gap-1 rounded bg-accent-soft py-0.5 pl-2 pr-1 text-[13px] text-accent-strong">
          {v}
          <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((_, j) => j !== i))} className="rounded p-0.5 hover:bg-accent/15">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        className="min-w-[8rem] flex-1 bg-transparent text-sm outline-none placeholder:text-muted/70"
        value={draft}
        placeholder={values.length ? "Add more…" : placeholder}
        onChange={(e) => {
          if (/[,;]/.test(e.target.value)) add(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => draft.trim() && add(draft)}
      />
    </div>
  );
}
