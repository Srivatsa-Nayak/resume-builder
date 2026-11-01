import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { parseResumeWithAi } from "@/lib/ai/router";
import { extractPdf } from "@/lib/pdf/extract";
import { ocrPdf } from "@/lib/pdf/ocr";
import { looksLikeMissingText, parseQuality, parseResumeText } from "@/lib/pdf/parse-resume";
import { rateLimit } from "@/lib/rate-limit";
import type { ResumeData } from "@/lib/resume/schema";
import { createResume } from "@/lib/resume/service";

const MAX_BYTES = 5 * 1024 * 1024;

/** Fill any personal fields the AI left blank with what the heuristic parser found. */
function mergePersonal(primary: ResumeData, fallback: ResumeData): ResumeData {
  const personal = { ...primary.personal };
  for (const key of Object.keys(personal) as (keyof typeof personal)[]) {
    if (!personal[key]) personal[key] = fallback.personal[key];
  }
  return { ...primary, personal };
}

export async function POST(request: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  if (!rateLimit(`import:${user.id}`, 10, 60 * 60 * 1000).ok) {
    return jsonError("You've imported a lot of files recently. Please wait a bit and try again.", 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Upload a PDF file.", 400);
  }
  const file = form.get("file");
  const useAi = form.get("useAi") !== "false";
  if (!(file instanceof File)) return jsonError("Upload a PDF file.", 400);
  if (file.size > MAX_BYTES) return jsonError("The file is larger than 5 MB.", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") return jsonError("That file isn't a valid PDF.", 400);

  let extracted;
  try {
    extracted = await extractPdf(bytes.slice()); // pdf.js may take ownership of the buffer
  } catch (err) {
    console.error("[import] PDF extraction failed:", err instanceof Error ? err.message : err);
    return jsonError("We couldn't read that PDF. It may be encrypted or damaged.", 422);
  }

  let lines = extracted.lines;
  let heuristic = parseResumeText(lines, extracted.links);
  const warnings: string[] = [];

  // Scanned PDFs have no text layer, and browser "Print to PDF" output can draw
  // some text (often the name, headings and bold phrases) as shapes. OCR the
  // rendered pages in either case and keep whichever parse recovered more.
  const scanned = lines.join("").replace(/\s/g, "").length < 50;
  const incomplete = scanned || looksLikeMissingText(lines) || heuristic.sectionsFound === 0 || !heuristic.data.personal.fullName;
  if (incomplete) {
    try {
      const ocrLines = await ocrPdf(bytes, extracted.lines);
      const ocr = parseResumeText(ocrLines, extracted.links);
      if (parseQuality(ocr) > parseQuality(heuristic)) {
        lines = ocrLines;
        heuristic = ocr;
        warnings.push(
          scanned
            ? "This PDF is a scanned image, so it was read with OCR. Check for misread characters."
            : "Parts of this PDF (often the name, headings and bold text) are drawn as shapes instead of real text, so we read them with OCR. Applicant tracking systems can't read that text either: download a fresh PDF from this editor before applying.",
        );
      }
    } catch (err) {
      console.error("[import] OCR failed:", err instanceof Error ? err.message : err);
    }
  }
  if (lines.join("").replace(/\s/g, "").length < 50) {
    return jsonError("No readable text was found in this PDF.", 422);
  }

  const text = lines.join("\n");
  let data = heuristic.data;
  let method: "ai" | "heuristic" = "heuristic";
  let engineLabel: string | undefined;
  warnings.push(...heuristic.warnings);

  if (useAi) {
    const ai = await parseResumeWithAi(user.id, text, user.preferredProvider);
    if (ai) {
      data = mergePersonal(ai.data, heuristic.data);
      method = "ai";
      engineLabel = ai.engine.label.replace("Generated with", "Parsed with");
      // The heuristic parser's warnings no longer apply; keep the OCR notice.
      warnings.splice(0, warnings.length, ...warnings.filter((w) => w.includes("OCR")));
    }
  }
  if (extracted.pageCount > 10) warnings.push("Only the first 10 pages were imported.");

  const baseName = file.name.replace(/\.pdf$/i, "").slice(0, 80) || "Imported resume";
  try {
    const resume = await createResume(user.id, { title: baseName, template: "modern", data });
    return NextResponse.json({ id: resume.id, method, engine: engineLabel, warnings }, { status: 201 });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not save the imported resume", 400);
  }
}
