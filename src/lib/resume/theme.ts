import { cssFamily, pdfFamily, type FontKey } from "./fonts";
import type { ResumeData } from "./schema";
import { PAGE_DIMENSIONS, getTemplate, type TemplateDef } from "./templates";

// Resolves a template plus the user's design choices into concrete tokens
// shared by the HTML preview and the PDF renderer. Sizes are PDF points.

export const INK = "#1f2328";
export const MUTED = "#57606a";
const DARK_PANEL = "#1f2937";

export const ACCENT_PRESETS = ["#1d6b5f", "#2563eb", "#5b3a6e", "#b45309", "#be123c", "#1f2937", "#0e7490", "#4d7c0f", "#6d28d9", "#0f62fe"];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** Mixes a color toward white; `amount` 0 = original, 1 = white. */
export function tint(hex: string, amount: number): string {
  return `#${hexToRgb(hex)
    .map((c) => Math.round(c + (255 - c) * amount).toString(16).padStart(2, "0"))
    .join("")}`;
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Text colors that stay readable on a background (handles light custom accents). */
function onColor(bg: string) {
  return luminance(bg) > 0.45 ? { text: INK, muted: "#3d444d", rule: "#1f232840" } : { text: "#ffffff", muted: "#ffffffd0", rule: "#ffffff66" };
}

export interface FontRef {
  /** react-pdf family name. */
  pdf: string;
  /** CSS font-family value. */
  css: string;
}

const fontRef = (key: FontKey): FontRef => ({ pdf: pdfFamily(key), css: cssFamily(key) });

export interface PanelColors {
  bg: string;
  text: string;
  muted: string;
  rule: string;
  accent: string;
  chip: string;
}

export interface ResolvedTheme {
  template: TemplateDef;
  page: { width: number; height: number };
  fonts: { name: FontRef; heading: FontRef; body: FontRef };
  colors: {
    accent: string;
    accentSoft: string;
    ink: string;
    muted: string;
    rule: string;
    paper: string;
    sidebar: PanelColors | null;
    band: PanelColors | null;
  };
  sizes: { body: number; small: number; heading: number; headline: number; contact: number; name: number; lineHeight: number };
  spacing: { pageX: number; pageY: number; sidebarWidth: number; sidebarPad: number; sectionGap: number; entryGap: number; timelineDate: number };
}

const DENSITY = {
  compact: { body: 9, sectionGap: 9, entryGap: 5, pageY: 28, pageX: 34, lineHeight: 1.3 },
  normal: { body: 9.5, sectionGap: 12, entryGap: 7, pageY: 34, pageX: 40, lineHeight: 1.35 },
  airy: { body: 9.5, sectionGap: 16, entryGap: 9, pageY: 42, pageX: 48, lineHeight: 1.45 },
};

function panel(bg: string, accent: string, onTint: boolean): PanelColors {
  const c = onColor(bg);
  return {
    bg,
    ...c,
    // On a pale tint the accent itself reads fine; on solid color, headings use the panel's text color.
    accent: onTint ? accent : c.text,
    chip: onTint ? tint(accent, 0.78) : c.text === INK ? "#00000014" : "#ffffff26",
  };
}

export function resolveTheme(templateId: string, data: ResumeData): ResolvedTheme {
  const template = getTemplate(templateId);
  const accent = data.design.accentColor || template.defaultAccent;
  const d = DENSITY[template.density];

  let sidebar: PanelColors | null = null;
  if (template.layout === "sidebar" && template.sidebar) {
    const bg = template.sidebar.background;
    if (bg === "accent") sidebar = panel(accent, accent, false);
    else if (bg === "dark") sidebar = { ...panel(DARK_PANEL, accent, false), accent: tint(accent, 0.35) };
    else if (bg === "tint") sidebar = panel(tint(accent, 0.9), accent, true);
    else sidebar = { bg: "transparent", text: INK, muted: MUTED, rule: "#d0d7de", accent, chip: tint(accent, 0.86) };
  }
  const band = template.header.style === "band" ? panel(template.header.band === "dark" ? "#111827" : accent, accent, false) : null;

  return {
    template,
    page: PAGE_DIMENSIONS[data.design.pageSize],
    fonts: { name: fontRef(template.fonts.name), heading: fontRef(template.fonts.heading), body: fontRef(template.fonts.body) },
    colors: {
      accent,
      accentSoft: tint(accent, 0.86),
      ink: INK,
      muted: MUTED,
      rule: "#d0d7de",
      paper: template.paper ?? "#ffffff",
      sidebar,
      band,
    },
    sizes: {
      body: d.body,
      small: d.body - 1,
      heading: d.body + 1,
      headline: d.body + 1.5,
      contact: d.body - 1,
      name: template.header.nameSize,
      lineHeight: d.lineHeight,
    },
    spacing: {
      pageX: d.pageX,
      pageY: d.pageY,
      sidebarWidth: 190,
      sidebarPad: 20,
      sectionGap: d.sectionGap,
      entryGap: d.entryGap,
      timelineDate: 92,
    },
  };
}
