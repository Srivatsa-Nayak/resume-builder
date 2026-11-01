import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { cssFamily, type FontKey } from "@/lib/resume/fonts";
import fontList from "@/lib/resume/font-list.json";
import { pdfFamily } from "@/lib/resume/fonts";
import { ICONS } from "@/lib/resume/icons";
import type { ResumeData } from "@/lib/resume/schema";
import { resolveTheme } from "@/lib/resume/theme";
import { ResumeContent, type Primitives, type Style } from "./ResumeLayout";

// HTML rendering of a resume for the live preview and thumbnails. The layout
// itself lives in ResumeLayout.tsx and is shared with the PDF renderer; this
// file only maps react-pdf-style primitives onto the DOM.

const pt = (n: number) => `${n}pt`;

const FONT_KEYS: FontKey[] = ["helvetica", "times", "courier", ...fontList.map((f) => f.key as FontKey)];
const CSS_BY_PDF_FAMILY = new Map(FONT_KEYS.map((k) => [pdfFamily(k), cssFamily(k)]));

const UNITLESS = new Set(["lineHeight", "flex", "flexGrow", "flexShrink", "fontWeight", "opacity", "zIndex"]);
const SHORTHANDS: Record<string, [string, string]> = {
  paddingVertical: ["paddingTop", "paddingBottom"],
  paddingHorizontal: ["paddingLeft", "paddingRight"],
  marginVertical: ["marginTop", "marginBottom"],
  marginHorizontal: ["marginLeft", "marginRight"],
};

/** Converts a react-pdf style (numbers are points) to CSS. */
function toCss(style: Style | undefined): CSSProperties {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(style ?? {})) {
    if (value === undefined) continue;
    const css = typeof value === "number" && !UNITLESS.has(key) ? pt(value) : value;
    if (key === "fontFamily") out.fontFamily = CSS_BY_PDF_FAMILY.get(String(value)) ?? String(value);
    else if (SHORTHANDS[key]) for (const k of SHORTHANDS[key]) out[k] = css;
    else out[key] = css;
  }
  // react-pdf borders default to solid; CSS borders default to none.
  for (const side of ["", "Top", "Right", "Bottom", "Left"]) {
    if (out[`border${side}Width`] !== undefined && out[`border${side}Style`] === undefined && out.borderStyle === undefined) {
      out[`border${side}Style`] = "solid";
    }
  }
  return out as CSSProperties;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightPattern(terms: string[] | undefined): RegExp | null {
  const list = (terms ?? []).map((t) => t.trim()).filter(Boolean);
  if (!list.length) return null;
  const alternation = list.sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return new RegExp(`(?<![\\p{L}\\p{N}])(${alternation})(?![\\p{L}\\p{N}])`, "giu");
}

const HighlightContext = createContext<RegExp | null>(null);
const InsideText = createContext(false);

/** Draws highlighter marks around matched keywords in plain-string children (preview only). */
function highlightChildren(children: ReactNode, pattern: RegExp | null): ReactNode {
  if (!pattern || typeof children !== "string") return children;
  return children.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="mark">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

const htmlPrimitives: Primitives = {
  View: ({ style, children }) => <div style={{ display: "flex", flexDirection: "column", ...toCss(style) }}>{children}</div>,
  Text: function HtmlText({ style, children }) {
    const nested = useContext(InsideText);
    const pattern = useContext(HighlightContext);
    const content = <InsideText.Provider value>{highlightChildren(children, pattern)}</InsideText.Provider>;
    // react-pdf Text is a block unless nested in another Text.
    return nested ? <span style={toCss(style)}>{content}</span> : <div style={toCss(style)}>{content}</div>;
  },
  Link: ({ style, children }) => <span style={toCss(style)}>{children}</span>,
  Icon: ({ name, size, color, style }) => (
    <svg
      viewBox="0 0 24 24"
      width={pt(size)}
      height={pt(size)}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...toCss(style) }}
      aria-hidden
    >
      {ICONS[name].map((s, i) =>
        s.type === "path" ? (
          <path key={i} d={s.d} />
        ) : s.type === "circle" ? (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} />
        ) : (
          <rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} />
        ),
      )}
    </svg>
  ),
};

export function ResumeDocument({ data, templateId, highlight }: { data: ResumeData; templateId: string; highlight?: string[] }) {
  const theme = resolveTheme(templateId, data);
  return (
    <HighlightContext.Provider value={highlightPattern(highlight)}>
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: pt(theme.page.width),
          minHeight: pt(theme.page.height),
          boxSizing: "border-box",
          paddingTop: pt(theme.spacing.pageY),
          paddingBottom: pt(theme.spacing.pageY),
          background: theme.colors.paper,
          color: theme.colors.ink,
          fontFamily: theme.fonts.body.css,
          fontSize: pt(theme.sizes.body),
          lineHeight: theme.sizes.lineHeight,
          overflowWrap: "anywhere",
          textAlign: "left",
          // Unhinted glyph metrics: at thumbnail sizes, hinting rounds letter widths
          // up to whole pixels and lines overflow (very visible with Lato on Windows).
          textRendering: "geometricPrecision",
        }}
      >
        <ResumeContent P={htmlPrimitives} data={data} theme={theme} />
      </div>
    </HighlightContext.Provider>
  );
}
