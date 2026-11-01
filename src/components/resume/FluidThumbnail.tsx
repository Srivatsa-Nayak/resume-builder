"use client";

import { useEffect, useRef, useState } from "react";
import type { ResumeData } from "@/lib/resume/schema";
import { PAGE_DIMENSIONS } from "@/lib/resume/templates";
import { ResumeThumbnail } from "./ResumeThumbnail";

/** A resume thumbnail that fills its container's width (up to `maxWidth`). */
export function FluidThumbnail({
  data,
  templateId,
  highlight,
  maxWidth = 640,
  className,
}: {
  data: ResumeData;
  templateId: string;
  highlight?: string[];
  maxWidth?: number;
  className?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const page = PAGE_DIMENSIONS[data.design.pageSize];

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.min(maxWidth, Math.floor(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, [maxWidth]);

  return (
    <div ref={container} className="w-full">
      <div className={className} style={{ width: width || "100%", maxWidth, marginInline: "auto" }}>
        {width ? (
          <ResumeThumbnail data={data} templateId={templateId} width={width} highlight={highlight} />
        ) : (
          // Reserve the page's shape until the width is known, to avoid layout shift.
          <div className="bg-white" style={{ aspectRatio: `${page.width} / ${page.height}` }} />
        )}
      </div>
    </div>
  );
}
