"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { ResumeDocument } from "@/components/resume/ResumeDocument";
import type { ResumeData } from "@/lib/resume/schema";
import { PAGE_DIMENSIONS } from "@/lib/resume/templates";

const PX_PER_PT = 96 / 72;

/** Scaled, real-time preview of the resume with approximate page-break guides. */
export function LivePreview({ data, templateId, highlight }: { data: ResumeData; templateId: string; highlight?: string[] }) {
  const deferred = useDeferredValue(data);
  const container = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === container.current) setWidth(entry.contentRect.width);
        if (entry.target === sheet.current) setHeight(entry.contentRect.height);
      }
    });
    if (container.current) observer.observe(container.current);
    if (sheet.current) observer.observe(sheet.current);
    return () => observer.disconnect();
  }, []);

  const page = PAGE_DIMENSIONS[deferred.design.pageSize];
  const pageW = page.width * PX_PER_PT;
  const pageH = page.height * PX_PER_PT;
  const scale = width ? Math.min(1.15, width / pageW) : 0.6;
  const pages = Math.max(1, Math.ceil((height - 1) / pageH));

  return (
    <div ref={container} className="w-full">
      <div className="relative mx-auto bg-white shadow-[var(--shadow-sheet)]" style={{ width: pageW * scale, height: Math.max(height, pageH) * scale }}>
        <div ref={sheet} className="absolute left-0 top-0" style={{ width: pageW, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <ResumeDocument data={deferred} templateId={templateId} highlight={highlight} />
          {Array.from({ length: pages - 1 }, (_, i) => (
            <div key={i} className="page-break-guide pointer-events-none absolute inset-x-0" style={{ top: (i + 1) * pageH }}>
              <span className="absolute right-2 top-1 rounded bg-ink/70 px-1.5 py-0.5 text-[11px] font-medium text-white">Page {i + 2}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        {pages} page{pages > 1 ? "s" : ""}. {pages > 2 ? "Consider trimming to two." : "Page breaks are approximate."}
      </p>
    </div>
  );
}
