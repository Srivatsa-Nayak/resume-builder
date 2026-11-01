"use client";

import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge, cn } from "@/components/ui";
import { sampleResume } from "@/lib/resume/sample";
import { GALLERY_TEMPLATES, templateFeatures, type TemplateDef } from "@/lib/resume/templates";
import { ACCENT_PRESETS } from "@/lib/resume/theme";
import { ResumeDocument } from "./ResumeDocument";
import { TemplateImage } from "./TemplateImage";

const PAGE_PX = 595.28 * (96 / 72); // A4 width in CSS pixels

const ATS_NOTES: Record<TemplateDef["atsFriendliness"], string> = {
  Excellent: "Single column with standard headings. Reads cleanly in every applicant tracking system.",
  "Very good": "Reads well in modern applicant tracking systems.",
  Good: "Two-column layouts read well in most modern ATS. For very strict systems, a single-column template is safest.",
};

/**
 * Large preview of a template (Canva-style): the page on the left rendered as
 * real text at close to actual size, so it's sharp, and details, colors and
 * similar templates on the right.
 */
export function TemplatePreviewDialog({
  template,
  templates,
  onNavigate,
  onClose,
  renderAction,
  initialAccent,
}: {
  template: TemplateDef | null;
  /** Order used by the previous/next arrows (usually the visible gallery results). */
  templates: TemplateDef[];
  onNavigate: (t: TemplateDef) => void;
  onClose: () => void;
  /** The main button, given the template and the color picked in the preview. */
  renderAction: (template: TemplateDef, accent: string) => ReactNode;
  initialAccent?: string;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const pane = useRef<HTMLDivElement>(null);
  const [paneWidth, setPaneWidth] = useState(0);
  const [accent, setAccent] = useState("");
  const sample = useMemo(() => sampleResume(), []);

  // Each template opens in its own default color (or the color already in use).
  useEffect(() => {
    if (template) setAccent(initialAccent || template.defaultAccent);
  }, [template, initialAccent]);

  const index = template ? templates.findIndex((t) => t.id === template.id) : -1;
  const prev = index > 0 ? templates[index - 1] : null;
  const next = index >= 0 && index < templates.length - 1 ? templates[index + 1] : null;

  useEffect(() => {
    if (!template) return;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && prev) onNavigate(prev);
      else if (e.key === "ArrowRight" && next) onNavigate(next);
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [template, prev, next, onClose, onNavigate]);

  useEffect(() => {
    const el = pane.current;
    if (!template || !el) return;
    const observer = new ResizeObserver(([entry]) => setPaneWidth(entry.contentRect.width));
    observer.observe(el);
    pane.current?.scrollTo({ top: 0 });
    return () => observer.disconnect();
  }, [template]);

  if (!template) return null;

  // Up to real size, leaving room for the arrows; CSS zoom keeps text crisp
  // because it's laid out at the final size rather than shrunk.
  const gutter = paneWidth >= 1024 ? 150 : 48;
  const zoom = paneWidth ? Math.max(0.42, Math.min(1, (paneWidth - gutter) / PAGE_PX)) : 0;
  const swatches = [template.defaultAccent, ...ACCENT_PRESETS.filter((c) => c.toLowerCase() !== template.defaultAccent.toLowerCase())].slice(0, 8);
  const similar = GALLERY_TEMPLATES.filter((t) => t.category === template.category && t.id !== template.id).slice(0, 4);
  const data = { ...sample, design: { ...sample.design, accentColor: accent } };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${template.name} template preview`}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-ink/70 p-0 backdrop-blur-sm sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex w-full max-w-[1320px] flex-col overflow-y-auto bg-surface shadow-2xl sm:rounded-2xl lg:flex-row lg:overflow-hidden">
        {/* Page (scrolls); the arrows sit on the non-scrolling wrapper so they stay centered. */}
        <div className="relative lg:min-w-0 lg:flex-1">
          <div ref={pane} className="bg-[#e9ecf1] px-6 py-8 lg:h-full lg:overflow-y-auto">
            {zoom ? (
              <div className="mx-auto w-fit overflow-hidden rounded-sm shadow-[var(--shadow-sheet)]" style={{ zoom }}>
                <ResumeDocument data={data} templateId={template.id} />
              </div>
            ) : null}
          </div>
          {prev ? (
            <button
              type="button"
              onClick={() => onNavigate(prev)}
              aria-label={`Previous template: ${prev.name}`}
              className="absolute left-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-surface p-3 text-ink shadow-lg ring-1 ring-ink/10 hover:bg-paper lg:block"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : null}
          {next ? (
            <button
              type="button"
              onClick={() => onNavigate(next)}
              aria-label={`Next template: ${next.name}`}
              className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-surface p-3 text-ink shadow-lg ring-1 ring-ink/10 hover:bg-paper lg:block"
            >
              <ChevronRight className="size-5" />
            </button>
          ) : null}
        </div>

        {/* Details */}
        <aside className="flex shrink-0 flex-col border-line p-6 lg:w-[360px] lg:overflow-y-auto lg:border-l">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {index >= 0 ? <p className="text-sm text-muted">{`Template ${index + 1} of ${templates.length}`}</p> : null}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 className="font-display text-3xl text-ink">{template.name}</h2>
                <Badge>{template.category}</Badge>
              </div>
            </div>
            <button ref={closeButton} type="button" onClick={onClose} aria-label="Close preview" className="rounded-lg p-2 text-muted hover:bg-ink/5 hover:text-ink">
              <X className="size-5" />
            </button>
          </div>
          <p className="mt-2 leading-relaxed text-ink-soft">{template.description}</p>

          <div className="mt-5">
            <p className="text-sm font-medium text-ink">Color</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {swatches.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAccent(c)}
                  aria-label={`Use color ${c}`}
                  aria-pressed={accent.toLowerCase() === c.toLowerCase()}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full ring-offset-2 transition",
                    accent.toLowerCase() === c.toLowerCase() ? "ring-2 ring-ink" : "hover:scale-110",
                  )}
                  style={{ background: c }}
                >
                  {accent.toLowerCase() === c.toLowerCase() ? <Check className="size-4 text-white" /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">{renderAction(template, accent)}</div>

          <ul className="mt-6 flex flex-col gap-2 text-sm text-ink-soft">
            {templateFeatures(template).map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-accent" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-xl bg-paper p-4">
            <Badge tone={template.atsFriendliness === "Good" ? "warn" : "good"}>ATS friendliness: {template.atsFriendliness}</Badge>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{ATS_NOTES[template.atsFriendliness]}</p>
          </div>

          {similar.length ? (
            <div className="mt-6">
              <p className="text-sm font-medium text-ink">More {template.category.toLowerCase()} templates</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {similar.map((t) => (
                  <button key={t.id} type="button" onClick={() => onNavigate(t)} className="group text-left">
                    <div className="overflow-hidden rounded-lg ring-1 ring-ink/10 transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                      <TemplateImage templateId={t.id} sizes="150px" />
                    </div>
                    <p className="mt-1.5 text-sm text-ink-soft group-hover:text-ink">{t.name}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
