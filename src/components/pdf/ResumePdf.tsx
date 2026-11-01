import { Circle, Document, Font, Link, Page, Path, Rect, Svg, Text, View } from "@react-pdf/renderer";
import { ICONS } from "@/lib/resume/icons";
import { ResumeContent, type Primitives } from "@/components/resume/ResumeLayout";
import { nonEmpty } from "@/lib/resume/format";
import { embeddedFontFiles } from "@/lib/resume/fonts";
import type { ResumeData } from "@/lib/resume/schema";
import { resolveTheme } from "@/lib/resume/theme";

// PDF rendering with @react-pdf/renderer. The layout is shared with the HTML
// preview (ResumeLayout.tsx); this file supplies react-pdf primitives, fonts
// and the document wrapper. Embedded TrueType fonts keep text selectable and
// ATS-readable (react-pdf writes a ToUnicode map for every subset).

// Never hyphenate words: split words confuse ATS keyword matching.
Font.registerHyphenationCallback((word) => [word]);

let registeredFrom: string | null = null;

/** Registers template fonts from a URL prefix (browser) or a directory path (Node). */
export function registerResumeFonts(base: string): void {
  if (registeredFrom === base) return;
  const byFamily = new Map<string, ReturnType<typeof embeddedFontFiles>>();
  for (const f of embeddedFontFiles()) byFamily.set(f.family, [...(byFamily.get(f.family) ?? []), f]);
  for (const [family, files] of byFamily) {
    Font.register({ family, fonts: files.map((f) => ({ src: `${base}/${f.file}`, fontWeight: f.fontWeight, fontStyle: f.fontStyle })) });
  }
  registeredFrom = base;
}

// react-pdf's style types are stricter than our shared Style map; the layout only uses supported properties.
const pdfPrimitives: Primitives = {
  View: ({ style, wrap, fixed, minPresenceAhead, children }) => (
    <View style={style as never} wrap={wrap} fixed={fixed} minPresenceAhead={minPresenceAhead}>
      {children}
    </View>
  ),
  Text: ({ style, children }) => <Text style={style as never}>{children}</Text>,
  Link: ({ src, style, children }) => (
    <Link src={src} style={style as never}>
      {children}
    </Link>
  ),
  Icon: ({ name, size, color, style }) => {
    const stroke = { stroke: color, strokeWidth: 2, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
    return (
      <Svg viewBox="0 0 24 24" width={size} height={size} style={style as never}>
        {ICONS[name].map((s, i) =>
          s.type === "path" ? (
            <Path key={i} d={s.d} {...stroke} />
          ) : s.type === "circle" ? (
            <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} {...stroke} />
          ) : (
            <Rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} {...stroke} />
          ),
        )}
      </Svg>
    );
  },
};

export function ResumePdf({ data, templateId }: { data: ResumeData; templateId: string }) {
  const theme = resolveTheme(templateId, data);
  const name = data.personal.fullName || "Resume";
  return (
    <Document
      title={`${name} – Resume`}
      author={name}
      subject={data.personal.headline || "Resume"}
      keywords={data.skills.flatMap((g) => nonEmpty(g.items)).join(", ")}
      creator="Resume Builder"
      producer="Resume Builder"
    >
      <Page
        size={data.design.pageSize}
        style={{
          backgroundColor: theme.colors.paper,
          fontFamily: theme.fonts.body.pdf,
          fontSize: theme.sizes.body,
          lineHeight: theme.sizes.lineHeight,
          color: theme.colors.ink,
          paddingVertical: theme.spacing.pageY,
        }}
      >
        <ResumeContent P={pdfPrimitives} data={data} theme={theme} />
      </Page>
    </Document>
  );
}

/** Renders the resume to a PDF Blob in the browser. */
export async function renderResumePdf(data: ResumeData, templateId: string): Promise<Blob> {
  const { pdf } = await import("@react-pdf/renderer");
  registerResumeFonts(`${window.location.origin}/fonts`);
  return pdf(<ResumePdf data={data} templateId={templateId} />).toBlob();
}
