import fontList from "./font-list.json";

// Fonts available to resume templates. Embedded fonts are self-hosted TTFs in
// public/fonts (see scripts/fetch-fonts.mjs); "standard" fonts are the 14 PDF
// base fonts that need no embedding. Both the HTML preview and the PDF use the
// same family names, so the preview matches the export.

export type StandardFontKey = "helvetica" | "times" | "courier";
export type EmbeddedFontKey =
  | "lato"
  | "montserrat"
  | "raleway"
  | "poppins"
  | "openSans"
  | "dmSans"
  | "workSans"
  | "josefin"
  | "nunito"
  | "ibmPlex"
  | "oswald"
  | "playfair"
  | "merriweather"
  | "libreBaskerville"
  | "ebGaramond"
  | "sourceSerif"
  | "robotoSlab";
export type FontKey = StandardFontKey | EmbeddedFontKey;

interface FontEntry {
  key: EmbeddedFontKey;
  google: string;
  italic: boolean;
  kind: "sans" | "serif" | "display";
}

const EMBEDDED = fontList as FontEntry[];

const STANDARD: Record<StandardFontKey, { pdf: string; css: string }> = {
  helvetica: { pdf: "Helvetica", css: "Helvetica, Arial, 'Liberation Sans', sans-serif" },
  times: { pdf: "Times-Roman", css: "'Times New Roman', Times, 'Liberation Serif', serif" },
  courier: { pdf: "Courier", css: "'Courier New', Courier, 'Liberation Mono', monospace" },
};

const isStandard = (key: FontKey): key is StandardFontKey => key in STANDARD;

/** Family name registered with react-pdf and with @font-face. Prefixed to avoid clashing with installed fonts. */
export function pdfFamily(key: FontKey): string {
  return isStandard(key) ? STANDARD[key].pdf : `RB ${EMBEDDED.find((f) => f.key === key)!.google}`;
}

/** CSS font-family value for the HTML preview. */
export function cssFamily(key: FontKey): string {
  if (isStandard(key)) return STANDARD[key].css;
  const entry = EMBEDDED.find((f) => f.key === key)!;
  const fallback = entry.kind === "serif" ? "Georgia, serif" : "Arial, sans-serif";
  return `'${pdfFamily(key)}', ${fallback}`;
}

export function fontLabel(key: FontKey): string {
  return isStandard(key) ? STANDARD[key].pdf.replace("-Roman", "") : EMBEDDED.find((f) => f.key === key)!.google;
}

interface FontFile {
  family: string;
  file: string;
  fontWeight: 400 | 700;
  fontStyle: "normal" | "italic";
}

/**
 * Every weight/style combination for each embedded family. Families without
 * an italic map italic requests to the upright file, because react-pdf throws
 * when a requested style is missing.
 */
export function embeddedFontFiles(): FontFile[] {
  return EMBEDDED.flatMap((f) => {
    const family = pdfFamily(f.key);
    const file = (weight: number, italic: boolean) => `${f.key}-${weight}${italic && f.italic ? "-italic" : ""}.ttf`;
    return ([400, 700] as const).flatMap((fontWeight) =>
      (["normal", "italic"] as const).map((fontStyle) => ({ family, file: file(fontWeight, fontStyle === "italic"), fontWeight, fontStyle })),
    );
  });
}

/** @font-face rules for the preview (browsers only download the fonts a page uses). */
export function fontFaceCss(baseUrl = "/fonts"): string {
  return embeddedFontFiles()
    .map(
      (f) =>
        `@font-face{font-family:'${f.family}';font-style:${f.fontStyle};font-weight:${f.fontWeight};font-display:swap;src:url(${baseUrl}/${f.file}) format('truetype');}`,
    )
    .join("\n");
}
