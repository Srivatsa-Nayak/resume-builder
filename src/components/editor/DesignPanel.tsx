"use client";

import { Check, Maximize2 } from "lucide-react";
import { useCallback, useState } from "react";
import { CategoryFilter, TemplateSearch, templateCounts } from "@/components/dashboard/TemplateGallery";
import { TemplateImage } from "@/components/resume/TemplateImage";
import { TemplatePreviewDialog } from "@/components/resume/TemplatePreviewDialog";
import { Button, Card, IconButton, cn } from "@/components/ui";
import { PAGE_SIZES, type PageSize, type ResumeData } from "@/lib/resume/schema";
import { GALLERY_TEMPLATES, getTemplate, searchTemplates, type TemplateCategory, type TemplateDef, type TemplateId } from "@/lib/resume/templates";
import { ACCENT_PRESETS } from "@/lib/resume/theme";

/** Sharp example previews of every template. Your own content appears in the live preview once applied. */
function TemplateGrid({
  template,
  shown,
  onTemplateChange,
  onPreview,
}: {
  template: TemplateId;
  shown: TemplateDef[];
  onTemplateChange: (id: TemplateId) => void;
  onPreview: (t: TemplateDef) => void;
}) {
  if (!shown.length) return <p className="mt-4 rounded-lg border border-dashed border-line-strong p-6 text-center text-sm text-muted">No templates match your search.</p>;
  return (
    <div className="mt-4 grid grid-cols-2 gap-4">
      {shown.map((t) => {
        const active = t.id === template;
        return (
          <div key={t.id} className={cn("rounded-xl border-2 p-2 transition-colors", active ? "border-accent" : "border-transparent hover:border-line-strong")}>
            <button type="button" onClick={() => onTemplateChange(t.id as TemplateId)} aria-pressed={active} className="block w-full text-left" title={t.description}>
              <div className="overflow-hidden rounded-md ring-1 ring-line">
                <TemplateImage templateId={t.id} sizes="(min-width: 1024px) 22vw, 45vw" />
              </div>
            </button>
            <div className="mt-2 flex items-center gap-1 px-0.5">
              <span className="flex-1 truncate text-sm font-medium text-ink">{t.name}</span>
              {active ? <Check className="size-4 shrink-0 text-accent" aria-label="Selected" /> : null}
              <IconButton label={`Preview ${t.name}`} onClick={() => onPreview(t)} className="size-7">
                <Maximize2 className="size-3.5" />
              </IconButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DesignPanel({
  data,
  template,
  onTemplateChange,
  onDesignChange,
}: {
  data: ResumeData;
  template: TemplateId;
  onTemplateChange: (id: TemplateId) => void;
  onDesignChange: (design: Partial<ResumeData["design"]>) => void;
}) {
  const current = getTemplate(template);
  const accent = data.design.accentColor || current.defaultAccent;
  const [filter, setFilter] = useState<"All" | TemplateCategory>("All");
  const [query, setQuery] = useState("");
  const [previewing, setPreviewing] = useState<TemplateDef | null>(null);
  const closePreview = useCallback(() => setPreviewing(null), []);
  const matching = searchTemplates(GALLERY_TEMPLATES, query);
  const shown = filter === "All" ? matching : matching.filter((t) => t.category === filter);
  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <h2 className="font-display text-2xl text-ink">Template</h2>
        <p className="mt-1 text-sm text-muted">
          Using <span className="font-medium text-ink">{current.name}</span> (ATS friendliness: {current.atsFriendliness}). Click a design to apply
          it; the live preview shows it with your content, and nothing you&apos;ve written is lost.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          {/* No "/" shortcut here: people type that character while editing. */}
          <TemplateSearch value={query} onChange={setQuery} autoFocusKey={false} />
          <CategoryFilter value={filter} onChange={setFilter} counts={templateCounts(matching)} />
        </div>
        <TemplateGrid template={template} shown={shown} onTemplateChange={onTemplateChange} onPreview={setPreviewing} />
        <TemplatePreviewDialog
          template={previewing}
          templates={shown}
          onNavigate={setPreviewing}
          onClose={closePreview}
          initialAccent={data.design.accentColor || undefined}
          renderAction={(t, color) => (
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                onTemplateChange(t.id as TemplateId);
                // The template's own default color is stored as "" so it follows the template.
                onDesignChange({ accentColor: color.toLowerCase() === t.defaultAccent.toLowerCase() ? "" : color });
                setPreviewing(null);
              }}
            >
              Apply to my resume
            </Button>
          )}
        />
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-ink">Accent color</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Use color ${c}`}
              onClick={() => onDesignChange({ accentColor: c })}
              className={cn("size-8 rounded-full ring-offset-2 transition", accent.toLowerCase() === c ? "ring-2 ring-ink" : "hover:scale-110")}
              style={{ background: c }}
            />
          ))}
          <label className="ml-1 inline-flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input
              type="color"
              value={accent}
              onChange={(e) => onDesignChange({ accentColor: e.target.value })}
              className="size-8 cursor-pointer rounded border border-line bg-transparent"
            />
            Custom
          </label>
          {data.design.accentColor ? (
            <button type="button" className="text-sm text-accent hover:underline" onClick={() => onDesignChange({ accentColor: "" })}>
              Reset to default
            </button>
          ) : null}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-ink">Page size</h3>
        <div className="mt-3 inline-flex rounded-md border border-line-strong p-0.5">
          {PAGE_SIZES.map((size: PageSize) => (
            <button
              key={size}
              type="button"
              onClick={() => onDesignChange({ pageSize: size })}
              className={cn("rounded px-3 py-1.5 text-sm", data.design.pageSize === size ? "bg-ink text-white" : "text-ink-soft hover:bg-ink/5")}
            >
              {size === "LETTER" ? "US Letter" : "A4"}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">A4 is standard in India and most countries. Use US Letter for jobs in the US or Canada.</p>
      </Card>
    </div>
  );
}
