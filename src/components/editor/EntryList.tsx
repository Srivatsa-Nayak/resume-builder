"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button, IconButton, cn } from "@/components/ui";

/** Collapsible, reorderable list of section entries (jobs, schools, projects…). */
export function EntryList<T extends { id: string }>({
  items,
  onChange,
  create,
  title,
  subtitle,
  children,
  addLabel,
  emptyText,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  title: (item: T) => string;
  subtitle?: (item: T) => string;
  children: (item: T, patch: (partial: Partial<T>) => void) => ReactNode;
  addLabel: string;
  emptyText: string;
}) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const confirm = useConfirm();

  const patchAt = (index: number) => (partial: Partial<T>) => onChange(items.map((it, i) => (i === index ? { ...it, ...partial } : it)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = async (index: number) => {
    const item = items[index];
    const label = title(item);
    const ok = await confirm({
      title: label ? `Remove “${label}”?` : "Remove this entry?",
      description: "It will be removed from this resume.",
      confirmLabel: "Remove",
      tone: "danger",
    });
    // Match by id: the list may have changed while the dialog was open.
    if (ok) onChange(items.filter((it) => it.id !== item.id));
  };

  const add = () => {
    const item = create();
    onChange([...items, item]);
    setOpenId(item.id);
  };

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-sm text-muted">{emptyText}</p> : null}
      {items.map((item, index) => {
        const open = openId === item.id;
        return (
          <div key={item.id} className={cn("rounded-lg border bg-surface", open ? "border-line-strong shadow-sm" : "border-line")}>
            <div className="flex items-center gap-1 pr-2">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex min-w-0 flex-1 items-center gap-2 px-4 py-3 text-left"
                aria-expanded={open}
              >
                <ChevronDown className={cn("size-4 shrink-0 text-muted transition-transform", open ? "" : "-rotate-90")} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{title(item) || "Untitled"}</span>
                  {subtitle?.(item) ? <span className="block truncate text-xs text-muted">{subtitle(item)}</span> : null}
                </span>
              </button>
              <IconButton label="Move up" onClick={() => move(index, -1)} disabled={index === 0}>
                <ChevronUp className="size-4" />
              </IconButton>
              <IconButton label="Move down" onClick={() => move(index, 1)} disabled={index === items.length - 1}>
                <ChevronDown className="size-4" />
              </IconButton>
              <IconButton label="Remove" onClick={() => remove(index)} className="hover:text-danger">
                <Trash2 className="size-4" />
              </IconButton>
            </div>
            {open ? <div className="border-t border-line px-4 pb-4 pt-4">{children(item, patchAt(index))}</div> : null}
          </div>
        );
      })}
      <Button variant="secondary" onClick={add} className="self-start">
        <Plus className="size-4" /> {addLabel}
      </Button>
    </div>
  );
}
