import { tmpdir } from "node:os";
import { getDocumentProxy, renderPageAsImage } from "unpdf";
import { readingOrderLines, type TextItem } from "./extract";

// OCR fallback for PDFs whose text layer is incomplete. Browsers' "Print to
// PDF" sometimes draws text set in web or variable fonts (often the name,
// headings and bold phrases) as vector shapes, so that text can't be extracted.
// We render each page, OCR it, and rebuild lines with the same reading-order
// logic used for real text. Rows the text layer captured completely are then
// swapped back for the exact text-layer string, which fixes OCR misreads.

export const MAX_OCR_PAGES = 3;
const SCALE = 3; // ~216 DPI: accurate for body text without being slow

// Tesseract often reads "•" as one of these characters (or drops it entirely).
const BULLET_LOOKALIKES = /^[•·●eé«»°*+o¢©®]$/;

interface Bitmap {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

async function decodePng(png: ArrayBuffer): Promise<Bitmap> {
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  const image = await loadImage(Buffer.from(png));
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return { width: image.width, height: image.height, data: ctx.getImageData(0, 0, image.width, image.height).data };
}

/** True when there is an unrecognized dark mark (a bullet glyph) just left of a line's first word. */
function hasBulletMark(bitmap: Bitmap, firstWordX: number, top: number, bottom: number): boolean {
  const height = bottom - top;
  const x0 = Math.max(0, Math.round(firstWordX - height * 1.2));
  const x1 = Math.max(0, Math.round(firstWordX - height * 0.15));
  const y0 = Math.max(0, Math.round(top + height * 0.2));
  const y1 = Math.min(bitmap.height, Math.round(bottom - height * 0.2));
  let dark = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * bitmap.width + x) * 4;
      if (bitmap.data[i] + bitmap.data[i + 1] + bitmap.data[i + 2] < 300) dark++;
    }
  }
  // A bullet is a small solid blob: enough ink to not be noise, too little to be a word.
  const area = Math.max(1, (x1 - x0) * (y1 - y0));
  return dark >= height * 0.6 && dark / area < 0.35;
}

/** Similarity of two strings (Dice coefficient on character bigrams), ignoring spacing and separators. */
export function similarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(/[\s|·•\-–—]+/g, "");
  const bigrams = (s: string) => {
    const counts = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) counts.set(s.slice(i, i + 2), (counts.get(s.slice(i, i + 2)) ?? 0) + 1);
    return counts;
  };
  const [x, y] = [norm(a), norm(b)];
  if (x.length < 2 || y.length < 2) return x === y ? 1 : 0;
  const bx = bigrams(x);
  const by = bigrams(y);
  let overlap = 0;
  for (const [k, n] of bx) overlap += Math.min(n, by.get(k) ?? 0);
  return (2 * overlap) / (x.length - 1 + (y.length - 1));
}

const contentLength = (s: string) => s.replace(/[\s|·•\-–—]+/g, "").length;

/**
 * Tesseract reads small middle dots ("Java · Spring Boot") as "+" or "-". A line
 * using " + " as a separator at least twice was almost certainly dot-separated.
 */
export function restoreDotSeparators(line: string): string {
  if ((line.match(/\p{L} \+ \p{L}/gu) ?? []).length < 2) return line;
  return line.replace(/(\p{L}) [+-] (?=\p{L})/gu, "$1 · ");
}

/**
 * Replaces OCR lines with the matching text-layer line when the text layer
 * captured the whole line. A text-layer line that is shorter is missing words
 * (e.g. "throughput by ." where "35%" was drawn as shapes), so OCR wins there.
 */
export function reconcileWithTextLayer(ocrLines: string[], textLines: string[]): string[] {
  const candidates = textLines.map((t) => t.replace(/^•\s*/, ""));
  return ocrLines.map((line) => {
    const bullet = line.startsWith("• ");
    const body = bullet ? line.slice(2) : line;
    let best = { score: 0, text: "" };
    for (const candidate of candidates) {
      const score = similarity(body, candidate);
      if (score > best.score) best = { score, text: candidate };
    }
    // One misread character costs short lines more similarity, so be more lenient there.
    const threshold = contentLength(body) < 30 ? 0.8 : 0.9;
    if (best.score < threshold || contentLength(best.text) < contentLength(body) * 0.98) return restoreDotSeparators(line);
    return bullet ? `• ${best.text}` : best.text;
  });
}

export async function ocrPdf(data: Uint8Array, textLayerLines: string[] = []): Promise<string[]> {
  const [{ createWorker }, { default: eng }] = await Promise.all([import("tesseract.js"), import("@tesseract.js-data/eng")]);
  const worker = await createWorker("eng", 1, {
    langPath: eng.langPath,
    gzip: eng.gzip,
    cachePath: tmpdir(),
    cacheMethod: "none",
  });

  try {
    const pdf = await getDocumentProxy(data.slice());
    const lines: string[] = [];
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, MAX_OCR_PAGES); pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const { width, height } = page.getViewport({ scale: 1 });
      const png = await renderPageAsImage(pdf, pageNumber, { canvasImport: () => import("@napi-rs/canvas"), scale: SCALE });
      const [{ data: result }, bitmap] = await Promise.all([worker.recognize(Buffer.from(png), {}, { blocks: true }), decodePng(png)]);

      const items: TextItem[] = [];
      for (const block of result.blocks ?? []) {
        for (const paragraph of block.paragraphs) {
          for (const line of paragraph.lines) {
            // All words of an OCR line share its baseline, so lines on the same
            // row (e.g. a title on the left and dates on the right) group together.
            const baseline = (line.baseline.y0 + line.baseline.y1) / 2;
            const size = Math.max(4, (line.rowAttributes?.rowHeight || line.bbox.y1 - line.bbox.y0) / SCALE) * 0.8;
            const words = line.words.filter((w) => w.text.trim() && w.confidence >= 20);
            words.forEach((word, index) => {
              let text = word.text.trim();
              const wordWidth = (word.bbox.x1 - word.bbox.x0) / SCALE;
              if (index === 0) {
                if (words.length > 1 && BULLET_LOOKALIKES.test(text) && wordWidth < size * 0.8) {
                  text = "•";
                } else if (hasBulletMark(bitmap, word.bbox.x0, line.bbox.y0, line.bbox.y1)) {
                  const markX = word.bbox.x0 / SCALE - size;
                  items.push({ str: "•", x: markX, y: height - baseline / SCALE, width: size * 0.4, size });
                }
              }
              items.push({ str: text, x: word.bbox.x0 / SCALE, y: height - baseline / SCALE, width: wordWidth, size });
            });
          }
        }
      }
      lines.push(...readingOrderLines(items, width).filter((l) => /[\p{L}\p{N}]/u.test(l)));
    }
    await pdf.loadingTask.destroy();
    return reconcileWithTextLayer(lines, textLayerLines);
  } finally {
    await worker.terminate();
  }
}
