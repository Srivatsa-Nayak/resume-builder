"use client";

import { Eye, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TemplateImage } from "@/components/resume/TemplateImage";
import { TemplatePreviewDialog } from "@/components/resume/TemplatePreviewDialog";
import { takePendingTemplate, templateAction } from "@/components/site/SignInToUseTemplate";
import { Button, Spinner, cn } from "@/components/ui";
import { GALLERY_TEMPLATES, TEMPLATE_CATEGORIES, getTemplate, searchTemplates, type TemplateCategory, type TemplateDef } from "@/lib/resume/templates";
import { useCreateResume } from "./UseTemplateButtons";

type Filter = "All" | TemplateCategory;

export function CategoryFilter({ value, onChange, counts }: { value: Filter; onChange: (f: Filter) => void; counts: Record<Filter, number> }) {
  return (
    <div role="tablist" aria-label="Template categories" className="flex flex-wrap gap-2">
      {(["All", ...TEMPLATE_CATEGORIES] as Filter[]).map((f) => (
        <button
          key={f}
          type="button"
          role="tab"
          aria-selected={value === f}
          onClick={() => onChange(f)}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
            value === f ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:border-line-strong",
          )}
        >
          {f} <span className={value === f ? "text-white/60" : "text-muted"}>{counts[f]}</span>
        </button>
      ))}
    </div>
  );
}

export function templateCounts(list: TemplateDef[] = GALLERY_TEMPLATES): Record<Filter, number> {
  const counts = { All: list.length } as Record<Filter, number>;
  for (const c of TEMPLATE_CATEGORIES) counts[c] = list.filter((t) => t.category === c).length;
  return counts;
}

const SUGGESTIONS = ["sidebar", "serif", "timeline", "header band", "minimal", "Poppins"];

export function TemplateSearch({
  value,
  onChange,
  autoFocusKey = true,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocusKey?: boolean;
  size?: "md" | "lg";
}) {
  const input = useRef<HTMLInputElement>(null);

  // Press "/" anywhere to jump to the search box.
  useEffect(() => {
    if (!autoFocusKey) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(target.tagName) && !target.isContentEditable) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [autoFocusKey]);

  return (
    <div className="relative">
      <Search className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-muted", size === "lg" ? "left-4 size-5" : "left-3.5 size-4")} aria-hidden />
      <input
        ref={input}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onChange("")}
        placeholder="Search templates, e.g. sidebar, serif, timeline or a font"
        aria-label="Search templates"
        className={cn(
          "w-full rounded-xl border border-line-strong bg-surface text-ink shadow-sm placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 [&::-webkit-search-cancel-button]:hidden",
          size === "lg" ? "h-14 pl-12 pr-12 text-base" : "h-11 pl-10 pr-10 text-[15px]",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            input.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted hover:bg-ink/5 hover:text-ink"
        >
          <X className="size-4" />
        </button>
      ) : autoFocusKey ? (
        <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 text-xs text-muted sm:block">/</kbd>
      ) : null}
    </div>
  );
}

/** A template card: the design itself, large and clean, like a gallery of printed pages. */
function TemplateCard({ template, onOpen, priority }: { template: TemplateDef; onOpen: () => void; priority: boolean }) {
  return (
    <button type="button" onClick={onOpen} className="group block w-full text-left" aria-label={`Preview the ${template.name} template`}>
      <div className="relative overflow-hidden rounded-xl bg-white shadow-[0_1px_3px_rgb(20_26_38/0.08),0_8px_24px_-12px_rgb(20_26_38/0.25)] ring-1 ring-ink/10 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-[0_2px_6px_rgb(20_26_38/0.1),0_20px_40px_-16px_rgb(20_26_38/0.4)] group-focus-visible:ring-2 group-focus-visible:ring-accent">
        <TemplateImage templateId={template.id} eager={priority} sizes="(min-width: 1536px) 340px, (min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw" />
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-ink/55 via-ink/0 to-transparent p-5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-ink shadow-md">
            <Eye className="size-4" /> Preview
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2 px-0.5">
        <span className="font-medium text-ink">{template.name}</span>
        <span className="text-sm text-muted">{template.category}</span>
      </div>
    </button>
  );
}

export function TemplateGallery({
  signedIn,
  initialTemplateId,
  initialAccent,
}: {
  signedIn: boolean;
  /** From the URL (?template=…&color=…), e.g. when sign-in returns here: opens that template's preview. */
  initialTemplateId?: string;
  initialAccent?: string;
}) {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [previewing, setPreviewing] = useState<TemplateDef | null>(null);
  // The URL's color applies only to the template it came with.
  const [startAccent, setStartAccent] = useState(initialAccent);
  const [starting, setStarting] = useState<TemplateDef | null>(null);
  const { create } = useCreateResume();
  const handledUrl = useRef(false);

  useEffect(() => {
    if (!initialTemplateId || handledUrl.current) return;
    handledUrl.current = true;
    // Drop the query so a refresh doesn't reopen the preview.
    window.history.replaceState(null, "", "/templates");
    const template = getTemplate(initialTemplateId);
    // Back from sign-in after choosing "Use this template": finish what they started.
    const pending = signedIn ? takePendingTemplate(template.id) : null;
    if (!pending) return setPreviewing(template);
    setStarting(template);
    void create(template.id, pending.accent || undefined).then((ok) => {
      if (ok) return;
      setStarting(null);
      setPreviewing(template);
    });
  }, [initialTemplateId, signedIn, create]);

  const matching = searchTemplates(GALLERY_TEMPLATES, query);
  const shown = filter === "All" ? matching : matching.filter((t) => t.category === filter);
  const clearAll = () => {
    setQuery("");
    setFilter("All");
  };
  const navigate = useCallback((t: TemplateDef) => {
    setStartAccent(undefined);
    setPreviewing(t);
  }, []);
  const close = useCallback(() => {
    setStartAccent(undefined);
    setPreviewing(null);
  }, []);

  return (
    <>
      <div className="mt-8 rounded-3xl bg-gradient-to-br from-accent-soft via-surface to-[#f1f7d8] px-6 py-10 ring-1 ring-line sm:px-10">
        <h1 className="font-display text-4xl text-ink sm:text-5xl">Resume templates</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          {GALLERY_TEMPLATES.length} designs that applicant tracking systems can read. Open one to see it full size, pick a color, and start with
          example content you can edit.{signedIn ? "" : " Browse as much as you like; you'll only need an account when you start editing."}
        </p>
        <div className="mt-6 max-w-2xl">
          <TemplateSearch value={query} onChange={setQuery} size="lg" />
        </div>
        <div className="mt-5">
          <CategoryFilter value={filter} onChange={setFilter} counts={templateCounts(matching)} />
        </div>
      </div>

      <p className="mt-8 text-sm text-muted" aria-live="polite">
        {query || filter !== "All" ? `Showing ${shown.length} of ${GALLERY_TEMPLATES.length} templates` : `${GALLERY_TEMPLATES.length} templates`}
      </p>

      {shown.length ? (
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {shown.map((t, i) => (
            <TemplateCard key={t.id} template={t} onOpen={() => setPreviewing(t)} priority={i < 6} />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
          <p className="font-display text-xl text-ink">No templates match “{query}”{filter !== "All" ? ` in ${filter}` : ""}</p>
          <p className="mt-2 text-muted">Try one of these:</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuery(s);
                  setFilter("All");
                }}
                className="rounded-full border border-line bg-paper px-3 py-1 text-sm text-ink-soft hover:border-line-strong"
              >
                {s}
              </button>
            ))}
          </div>
          <Button variant="ghost" className="mt-4" onClick={clearAll}>
            Show all templates
          </Button>
        </div>
      )}

      <TemplatePreviewDialog
        template={previewing}
        templates={shown}
        onNavigate={navigate}
        onClose={close}
        initialAccent={startAccent}
        renderAction={templateAction(signedIn)}
      />

      {starting ? (
        <div role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-paper/85 backdrop-blur-sm">
          <p className="flex items-center gap-3 rounded-full bg-surface px-5 py-3 text-ink shadow-lg ring-1 ring-line">
            <Spinner className="text-accent" /> Setting up your {starting.name} resume…
          </p>
        </div>
      ) : null}
    </>
  );
}
