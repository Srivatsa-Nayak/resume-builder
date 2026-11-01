import type { ResumeData } from "@/lib/resume/schema";
import { PAGE_DIMENSIONS } from "@/lib/resume/templates";
import { ResumeDocument } from "./ResumeDocument";

const PX_PER_PT = 96 / 72;

// Below this scale, text is only a few pixels tall: font hinting then rounds
// glyph widths up and lines overflow, so a transform renders more faithfully.
const ZOOM_MIN_SCALE = 0.45;

/**
 * A static, scaled-down first page of a resume (pure CSS, safe to server-render).
 * Large previews use CSS `zoom`, which lays text out at its final size so it
 * renders crisply (a scale transform shrinks a rasterized layer and blurs it).
 * Small thumbnails use a transform instead (see ZOOM_MIN_SCALE).
 */
export function ResumeThumbnail({
  data,
  templateId,
  width = 240,
  highlight,
}: {
  data: ResumeData;
  templateId: string;
  width?: number;
  highlight?: string[];
}) {
  const page = PAGE_DIMENSIONS[data.design.pageSize];
  const pageWidth = page.width * PX_PER_PT;
  const scale = width / pageWidth;
  return (
    <div
      aria-hidden
      className="pointer-events-none relative select-none overflow-hidden bg-white"
      style={{ width, height: Math.round(page.height * PX_PER_PT * scale) }}
    >
      <div
        style={
          scale >= ZOOM_MIN_SCALE
            ? { zoom: scale, width: pageWidth }
            : // will-change makes the browser rasterize at full size and downsample, like a photo of the page.
              { transform: `scale(${scale})`, transformOrigin: "top left", width: pageWidth, willChange: "transform" }
        }
      >
        <ResumeDocument data={data} templateId={templateId} highlight={highlight} />
      </div>
    </div>
  );
}
