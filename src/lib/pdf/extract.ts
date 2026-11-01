import { getDocumentProxy } from "unpdf";

// Rebuilds reading-order text lines from a PDF using pdf.js text positions.
// Handles two-column layouts by detecting a vertical gutter and reading the
// left column before the right one.

export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  size: number;
}

export interface ExtractedPdf {
  lines: string[];
  pageCount: number;
  /** URLs from link annotations (often LinkedIn/GitHub/portfolio links). */
  links: string[];
}

export const MAX_PDF_PAGES = 10;

/** Finds an x position that no text item crosses and that splits the page into two real columns. */
export function findGutter(items: TextItem[], pageWidth: number): number | null {
  if (items.length < 20) return null;
  const ys = items.map((i) => i.y);
  const pageSpan = Math.max(...ys) - Math.min(...ys) || 1;
  let best: { x: number; balance: number } | null = null;

  for (let x = pageWidth * 0.2; x <= pageWidth * 0.75; x += 4) {
    if (items.some((i) => i.x < x - 1 && i.x + i.width > x + 1)) continue;
    const left = items.filter((i) => i.x + i.width <= x);
    const right = items.filter((i) => i.x >= x);
    if (left.length < items.length * 0.15 || right.length < items.length * 0.15) continue;
    const span = (list: TextItem[]) => {
      const y = list.map((i) => i.y);
      return (Math.max(...y) - Math.min(...y)) / pageSpan;
    };
    if (span(left) < 0.5 || span(right) < 0.5) continue;
    const balance = Math.min(left.length, right.length);
    if (!best || balance > best.balance) best = { x, balance };
  }
  return best?.x ?? null;
}

/** Groups items into lines by baseline, inserting spaces (or tabs for wide gaps). */
export function toLines(items: TextItem[]): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: TextItem[][] = [];
  for (const item of sorted) {
    const row = rows.at(-1);
    // Tolerance follows the smaller text, so a large name doesn't swallow the headline under it.
    if (row && Math.abs(row[0].y - item.y) <= Math.max(2, Math.min(row[0].size, item.size) * 0.45)) row.push(item);
    else rows.push([item]);
  }
  return rows.map((row) => {
    row.sort((a, b) => a.x - b.x);
    let line = "";
    let prevEnd: number | null = null;
    for (const item of row) {
      if (prevEnd !== null) {
        const gap = item.x - prevEnd;
        if (gap > item.size * 3) line += "\t";
        else if (gap > item.size * 0.15 && !line.endsWith(" ") && !item.str.startsWith(" ")) line += " ";
      }
      line += item.str;
      prevEnd = item.x + item.width;
    }
    return line.replace(/[  ]+/g, " ").trim();
  });
}

/** Lines in reading order: left column first when the page has two columns. */
export function readingOrderLines(items: TextItem[], pageWidth: number): string[] {
  const gutter = findGutter(items, pageWidth);
  if (gutter === null) return toLines(items);
  return [...toLines(items.filter((i) => i.x < gutter)), ...toLines(items.filter((i) => i.x >= gutter))];
}

export async function extractPdf(data: Uint8Array): Promise<ExtractedPdf> {
  const pdf = await getDocumentProxy(data);
  const pageCount = pdf.numPages;
  const lines: string[] = [];
  const links = new Set<string>();

  for (let pageNumber = 1; pageNumber <= Math.min(pageCount, MAX_PDF_PAGES); pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items: TextItem[] = [];
    for (const raw of content.items) {
      if (!("str" in raw) || !raw.str.trim()) continue;
      const [, , c, d, e, f] = raw.transform as number[];
      items.push({ str: raw.str, x: e, y: f, width: raw.width, size: Math.hypot(c, d) || raw.height || 10 });
    }

    lines.push(...readingOrderLines(items, viewport.width));

    try {
      for (const annotation of await page.getAnnotations()) {
        const url = (annotation as { url?: string }).url;
        if (typeof url === "string") links.add(url);
      }
    } catch {
      // Annotations are optional.
    }
  }

  await pdf.loadingTask.destroy();
  return { lines: lines.filter(Boolean), pageCount, links: [...links] };
}
