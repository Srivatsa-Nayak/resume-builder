"use client";

import { ArrowDown, ArrowUp, Check, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { useState } from "react";
import { Button, IconButton, Spinner, Textarea } from "@/components/ui";
import { findWeakPhrase, startsWithActionVerb } from "@/lib/ats/scorer";
import { useAi } from "./useAi";

function bulletHint(text: string): string | null {
  const t = text.trim();
  if (t.length < 12) return null;
  const weak = findWeakPhrase(t);
  if (weak) return `“${weak}” sounds passive. Try leading with what you achieved.`;
  if (!startsWithActionVerb(t)) return "Start with a strong action verb (Led, Built, Reduced…).";
  if (!/\d|%|\$|₹/.test(t)) return "Add a number to show impact (%, ₹, time saved, people).";
  return null;
}

export function BulletEditor({
  bullets,
  onChange,
  role,
  company = "",
  current = false,
  context = "",
  aiKey,
  kind = "job",
  generateLabel = "Generate bullets",
}: {
  bullets: string[];
  onChange: (bullets: string[]) => void;
  role: string;
  company?: string;
  current?: boolean;
  context?: string;
  /** Unique key for tracking pending AI requests for this list. */
  aiKey: string;
  kind?: "job" | "project";
  generateLabel?: string;
}) {
  const { run, pending } = useAi();
  const [suggestions, setSuggestions] = useState<Record<number, string>>({});

  const set = (index: number, value: string) => onChange(bullets.map((b, i) => (i === index ? value : b)));
  const remove = (index: number) => {
    setSuggestions({});
    onChange(bullets.filter((_, i) => i !== index));
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= bullets.length) return;
    const next = [...bullets];
    [next[index], next[target]] = [next[target], next[index]];
    setSuggestions({});
    onChange(next);
  };

  async function improve(index: number) {
    const result = await run(`${aiKey}:improve:${index}`, { type: "improve", bullet: bullets[index], role });
    if (result) setSuggestions((s) => ({ ...s, [index]: result.bullet }));
  }

  async function generate() {
    const result = await run(`${aiKey}:generate`, {
      type: "bullets",
      kind,
      role: role || context,
      company,
      context,
      current,
      existing: bullets.filter((b) => b.trim()),
    });
    if (result?.bullets.length) onChange([...bullets.filter((b) => b.trim()), ...result.bullets]);
  }

  const dismiss = (index: number) =>
    setSuggestions((s) => {
      const next = { ...s };
      delete next[index];
      return next;
    });

  return (
    <div className="flex flex-col gap-2">
      {bullets.map((bullet, index) => {
        const hint = bulletHint(bullet);
        const suggestion = suggestions[index];
        const improving = pending === `${aiKey}:improve:${index}`;
        return (
          <div key={index} className="group">
            <div className="flex items-start gap-1.5">
              <span className="mt-2.5 select-none text-muted" aria-hidden>
                •
              </span>
              <Textarea
                aria-label={`Bullet point ${index + 1}`}
                rows={2}
                className="min-h-[2.75rem] flex-1 resize-y [field-sizing:content]"
                value={bullet}
                placeholder="Describe an achievement: action + what you did + measurable result"
                onChange={(e) => set(index, e.target.value)}
              />
              <div className="flex flex-col">
                <IconButton label="Improve with AI" onClick={() => improve(index)} disabled={!bullet.trim() || pending !== null} className="text-accent">
                  {improving ? <Spinner /> : <Wand2 className="size-4" />}
                </IconButton>
                <IconButton label="Remove bullet" onClick={() => remove(index)} className="hover:text-danger">
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
              <div className="hidden flex-col sm:flex">
                <IconButton label="Move up" onClick={() => move(index, -1)} disabled={index === 0}>
                  <ArrowUp className="size-3.5" />
                </IconButton>
                <IconButton label="Move down" onClick={() => move(index, 1)} disabled={index === bullets.length - 1}>
                  <ArrowDown className="size-3.5" />
                </IconButton>
              </div>
            </div>
            {hint && !suggestion ? <p className="ml-4 mt-1 text-xs text-warn">{hint}</p> : null}
            {suggestion ? (
              <div className="ml-4 mt-2 rounded-md border border-accent/30 bg-accent-soft p-3">
                <p className="text-sm font-medium text-accent-strong">Suggested rewrite</p>
                <p className="mt-1 text-sm text-ink">{suggestion}</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      set(index, suggestion);
                      dismiss(index);
                    }}
                  >
                    <Check className="size-3.5" /> Use this
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dismiss(index)}>
                    <X className="size-3.5" /> Keep mine
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="secondary" onClick={() => onChange([...bullets, ""])} disabled={bullets.length >= 20}>
          <Plus className="size-3.5" /> Add bullet
        </Button>
        <Button
          size="sm"
          variant="subtle"
          onClick={generate}
          loading={pending === `${aiKey}:generate`}
          disabled={(!role.trim() && !context.trim()) || (pending !== null && pending !== `${aiKey}:generate`)}
          title={!role.trim() && !context.trim() ? "Add a title first" : undefined}
        >
          {pending === `${aiKey}:generate` ? null : <Sparkles className="size-3.5" />} {generateLabel}
        </Button>
      </div>
    </div>
  );
}
