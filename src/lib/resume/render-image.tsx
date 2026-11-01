import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getDocumentProxy, renderPageAsImage } from "unpdf";
import { ResumePdf, registerResumeFonts } from "@/components/pdf/ResumePdf";
import type { ResumeData } from "./schema";

// Server-side preview images. Shrinking a live HTML page in the browser can't
// produce legible small text (it's either blurred or distorted by font
// hinting), so previews are rendered from the real PDF with pdf.js at high
// resolution and served as images the browser can downscale smoothly.

// Several steps so the browser can pick an image close to its on-screen size;
// shrinking a much larger image softens small text.
export const PREVIEW_WIDTHS = [400, 600, 800, 1000, 1300] as const;
export type PreviewWidth = (typeof PREVIEW_WIDTHS)[number];

export function previewWidth(value: string | null, fallback: PreviewWidth = 800): PreviewWidth {
  const n = Number(value);
  return (PREVIEW_WIDTHS as readonly number[]).includes(n) ? (n as PreviewWidth) : fallback;
}

// At most a few renders at a time: a gallery page requests many at once.
const MAX_CONCURRENT = 4;
let running = 0;
const queue: (() => void)[] = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) await new Promise<void>((resolve) => queue.push(resolve));
  running++;
  try {
    return await task();
  } finally {
    running--;
    queue.shift()?.();
  }
}

/** Renders page one of a resume to a PNG `width` pixels wide (lossless: lossy formats smear thin colored text). */
export function renderResumeImage(data: ResumeData, templateId: string, width: number): Promise<Buffer> {
  return withSlot(async () => {
    registerResumeFonts(path.join(process.cwd(), "public", "fonts"));
    const pdfBytes = await renderToBuffer(<ResumePdf data={data} templateId={templateId} />);
    const pdf = await getDocumentProxy(new Uint8Array(pdfBytes));
    try {
      const page = await pdf.getPage(1);
      const scale = width / page.getViewport({ scale: 1 }).width;
      const png = await renderPageAsImage(pdf, 1, { canvasImport: () => import("@napi-rs/canvas"), scale });
      return Buffer.from(png);
    } finally {
      await pdf.loadingTask.destroy();
    }
  });
}

/** A small in-memory cache that keeps the most recently used entries. */
export class LruCache<V> {
  private map = new Map<string, V>();
  constructor(private readonly max: number) {}
  get(key: string): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }
  set(key: string, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }
  delete(key: string): void {
    this.map.delete(key);
  }
}

// Template previews only depend on the template and size, so one cache serves
// everyone. It lives on globalThis so the startup warm-up (instrumentation.ts)
// and the route handler share it.
const globalForPreviews = globalThis as unknown as { templatePreviews?: LruCache<Promise<Buffer>> };
const templatePreviews = (globalForPreviews.templatePreviews ??= new LruCache<Promise<Buffer>>(200));

/** Cached preview image of a template filled with the example content. */
export async function getTemplatePreview(templateId: string, width: PreviewWidth): Promise<Buffer> {
  const key = `${templateId}:${width}`;
  let image = templatePreviews.get(key);
  if (!image) {
    const { sampleResume } = await import("./sample");
    image = renderResumeImage(sampleResume(), templateId, width);
    templatePreviews.set(key, image);
    image.catch(() => templatePreviews.delete(key));
  }
  return image;
}

export function imageResponse(body: Buffer, cacheControl: string): Response {
  return new Response(new Uint8Array(body), { headers: { "Content-Type": "image/png", "Cache-Control": cacheControl } });
}
