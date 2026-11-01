import type { ComponentType, ReactNode } from "react";
import { contactEntries, displayUrl, educationTitle, experienceDates, formatDateRange, nonEmpty, type ContactKind } from "@/lib/resume/format";
import type { IconName } from "@/lib/resume/icons";
import type { ResumeData } from "@/lib/resume/schema";
import { SECTION_TITLES, type SectionKey } from "@/lib/resume/templates";
import type { PanelColors, ResolvedTheme } from "@/lib/resume/theme";

// The resume layout, written once against three primitives. The PDF renderer
// supplies react-pdf's View/Text/Link; the HTML preview supplies DOM versions
// (see ResumeDocument.tsx), so preview and export can't drift apart.
//
// Rules for keeping exported PDFs ATS-friendly:
// - Every word is real text (no images); no letter-spacing (parsers split spaced letters).
// - Contact details are joined with " | " or stacked one per line.
// - Section titles are a single Text node with a standard name.

export type Style = { [key: string]: string | number | undefined };

export interface Primitives {
  View: ComponentType<{ style?: Style; wrap?: boolean; fixed?: boolean; minPresenceAhead?: number; children?: ReactNode }>;
  Text: ComponentType<{ style?: Style; children?: ReactNode }>;
  Link: ComponentType<{ src: string; style?: Style; children?: ReactNode }>;
  /** A small stroked vector icon (see lib/resume/icons.ts); never text. */
  Icon: ComponentType<{ name: IconName; size: number; color: string; style?: Style }>;
}

interface Ctx {
  P: Primitives;
  data: ResumeData;
  theme: ResolvedTheme;
  /** Colors for the sidebar panel when rendering inside it. */
  panel: PanelColors | null;
}

const bold = (theme: ResolvedTheme, font: "heading" | "body" | "name" = "body"): Style => ({ fontFamily: theme.fonts[font].pdf, fontWeight: 700 });

function contactHref(item: string): string | null {
  if (item.includes("@") && !item.includes("/")) return `mailto:${item}`;
  if (/\.[a-z]{2,}(\/|$)/i.test(item) && !/\s/.test(item)) return `https://${item}`;
  return null;
}

// --- Building blocks ---------------------------------------------------------

function Heading({ ctx, title }: { ctx: Ctx; title: string }) {
  const { P, theme, panel } = ctx;
  const { headings } = theme.template;
  const accent = panel?.accent ?? theme.colors.accent;
  const text = panel?.text ?? theme.colors.ink;
  const rule = panel?.rule ?? theme.colors.rule;
  const align = panel ? "left" : headings.align;
  const label = headings.case === "upper" ? title.toUpperCase() : title;
  const base: Style = { ...bold(theme, "heading"), fontSize: theme.sizes.heading, textAlign: align, lineHeight: 1.25 };
  const gap = { marginBottom: 6 };

  switch (headings.style) {
    case "bar":
      return (
        <P.View style={{ flexDirection: "row", alignItems: "center", justifyContent: align === "center" ? "center" : "flex-start", ...gap }}>
          <P.View style={{ width: 3, height: theme.sizes.heading, backgroundColor: accent, borderRadius: 1.5, marginRight: 7 }} />
          <P.Text style={{ ...base, color: text }}>{label}</P.Text>
        </P.View>
      );
    case "pill":
      return (
        <P.View style={{ flexDirection: "row", justifyContent: align === "center" ? "center" : "flex-start", ...gap }}>
          <P.Text
            style={{
              ...base,
              color: panel ? panel.text : accent,
              backgroundColor: panel ? panel.chip : theme.colors.accentSoft,
              paddingVertical: 2,
              paddingHorizontal: 8,
              borderRadius: 8,
            }}
          >
            {label}
          </P.Text>
        </P.View>
      );
    case "underline":
      return <P.Text style={{ ...base, ...gap, color: accent, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: accent }}>{label}</P.Text>;
    case "dashed":
      return (
        <P.Text style={{ ...base, ...gap, color: accent, paddingBottom: 2, borderBottomWidth: 1, borderBottomColor: accent, borderBottomStyle: "dashed" }}>
          {label}
        </P.Text>
      );
    case "rule":
      return <P.Text style={{ ...base, ...gap, color: text, paddingBottom: 2, borderBottomWidth: 0.75, borderBottomColor: panel ? rule : text }}>{label}</P.Text>;
    case "overline":
      return <P.Text style={{ ...base, ...gap, color: text, paddingTop: 4, borderTopWidth: 2, borderTopColor: accent }}>{label}</P.Text>;
    case "plain":
      return <P.Text style={{ ...base, ...gap, color: accent }}>{label}</P.Text>;
  }
}

function Bullets({ ctx, items }: { ctx: Ctx; items: string[] }) {
  const { P } = ctx;
  const list = nonEmpty(items);
  if (!list.length) return null;
  return (
    <P.View style={{ marginTop: 2 }}>
      {list.map((b, i) => (
        <P.View key={i} style={{ flexDirection: "row", marginBottom: 1.5 }} wrap={false}>
          <P.Text style={{ width: 10 }}>•</P.Text>
          <P.Text style={{ flex: 1 }}>{b}</P.Text>
        </P.View>
      ))}
    </P.View>
  );
}

function TitleRow({ ctx, title, right }: { ctx: Ctx; title: ReactNode; right?: string }) {
  const { P, theme, panel } = ctx;
  return (
    <P.View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
      <P.Text style={{ ...bold(theme), flex: 1, paddingRight: 8 }}>{title}</P.Text>
      {right ? <P.Text style={{ fontSize: theme.sizes.small, color: panel?.muted ?? theme.colors.muted, paddingTop: 0.5 }}>{right}</P.Text> : null}
    </P.View>
  );
}

function Sub({ ctx, children }: { ctx: Ctx; children: string }) {
  const { P, theme, panel } = ctx;
  return <P.Text style={{ fontStyle: "italic", fontSize: theme.sizes.small + 0.5, color: panel?.muted ?? theme.colors.accent }}>{children}</P.Text>;
}

// --- Sections ---------------------------------------------------------------

function Experience({ ctx }: { ctx: Ctx }) {
  const { P, data, theme } = ctx;
  const items = data.experience.filter((e) => e.role || e.company || nonEmpty(e.bullets).length);
  if (!items.length) return null;

  if (theme.template.experience === "timeline" && !ctx.panel) {
    return (
      <>
        {items.map((e, i) => (
          <P.View key={e.id} style={{ flexDirection: "row" }}>
            <P.View style={{ width: theme.spacing.timelineDate, paddingRight: 10 }}>
              <P.Text style={{ fontSize: theme.sizes.small, color: theme.colors.muted }}>{experienceDates(e)}</P.Text>
            </P.View>
            <P.View
              style={{
                flex: 1,
                position: "relative",
                borderLeftWidth: 1,
                borderLeftColor: theme.colors.rule,
                paddingLeft: 12,
                paddingBottom: i < items.length - 1 ? theme.spacing.entryGap + 2 : 0,
              }}
            >
              <P.View style={{ position: "absolute", left: -3.5, top: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.accent }} />
              <P.View wrap={false} minPresenceAhead={24}>
                <P.Text style={bold(theme)}>{e.role || e.company}</P.Text>
                {e.role && (e.company || e.location) ? <Sub ctx={ctx}>{[e.company, e.location].filter(Boolean).join(" · ")}</Sub> : null}
              </P.View>
              <Bullets ctx={ctx} items={e.bullets} />
            </P.View>
          </P.View>
        ))}
      </>
    );
  }

  return (
    <>
      {items.map((e, i) => (
        <P.View key={e.id} style={{ marginTop: i ? theme.spacing.entryGap : 0 }}>
          <P.View wrap={false} minPresenceAhead={24}>
            <TitleRow ctx={ctx} title={e.role || e.company} right={experienceDates(e)} />
            {e.role && (e.company || e.location) ? <Sub ctx={ctx}>{[e.company, e.location].filter(Boolean).join(" · ")}</Sub> : null}
          </P.View>
          <Bullets ctx={ctx} items={e.bullets} />
        </P.View>
      ))}
    </>
  );
}

function Projects({ ctx }: { ctx: Ctx }) {
  const { P, data, theme, panel } = ctx;
  const items = data.projects.filter((p) => p.name || nonEmpty(p.bullets).length);
  if (!items.length) return null;
  return (
    <>
      {items.map((p, i) => (
        <P.View key={p.id} style={{ marginTop: i ? theme.spacing.entryGap : 0 }}>
          <P.View wrap={false} minPresenceAhead={20}>
            <TitleRow
              ctx={ctx}
              title={
                <>
                  {p.name}
                  {p.link ? (
                    <P.Text style={{ fontFamily: theme.fonts.body.pdf, fontWeight: 400, fontSize: theme.sizes.small, color: panel?.muted ?? theme.colors.accent }}>
                      {` · ${displayUrl(p.link)}`}
                    </P.Text>
                  ) : null}
                </>
              }
            />
            {p.description ? <P.Text>{p.description}</P.Text> : null}
          </P.View>
          <Bullets ctx={ctx} items={p.bullets} />
        </P.View>
      ))}
    </>
  );
}

function Education({ ctx }: { ctx: Ctx }) {
  const { P, data, theme, panel } = ctx;
  const items = data.education.filter((e) => e.institution || e.degree);
  if (!items.length) return null;
  return (
    <>
      {items.map((e, i) => (
        <P.View key={e.id} style={{ marginTop: i ? theme.spacing.entryGap : 0 }} wrap={false}>
          {panel ? (
            // Narrow column: stack fields instead of a title/date row.
            <>
              <P.Text style={bold(theme)}>{educationTitle(e) || e.institution}</P.Text>
              {educationTitle(e) && e.institution ? <P.Text>{e.institution}</P.Text> : null}
              <P.Text style={{ fontSize: theme.sizes.small, color: panel.muted }}>
                {[formatDateRange(e.startDate, e.endDate), e.location].filter(Boolean).join(" · ")}
              </P.Text>
            </>
          ) : (
            <>
              <TitleRow ctx={ctx} title={educationTitle(e) || e.institution} right={formatDateRange(e.startDate, e.endDate)} />
              {educationTitle(e) && (e.institution || e.location) ? <Sub ctx={ctx}>{[e.institution, e.location].filter(Boolean).join(" · ")}</Sub> : null}
            </>
          )}
          {e.gpa ? (
            // Scores out of 10 are CGPAs (common in India); others are GPAs.
            <P.Text style={{ fontSize: theme.sizes.small }}>{`${/\/\s*10\b/.test(e.gpa) ? "CGPA" : "GPA"}: ${e.gpa}`}</P.Text>
          ) : null}
          {e.details ? <P.Text style={{ fontSize: theme.sizes.small }}>{e.details}</P.Text> : null}
        </P.View>
      ))}
    </>
  );
}

function Skills({ ctx }: { ctx: Ctx }) {
  const { P, data, theme, panel } = ctx;
  const groups = data.skills.filter((g) => nonEmpty(g.items).length);
  if (!groups.length) return null;
  const style = theme.template.skills;

  if (style === "tags") {
    return (
      <>
        {groups.map((g) => (
          <P.View key={g.id} style={{ marginBottom: 4 }} wrap={false}>
            {g.name ? <P.Text style={{ ...bold(theme), fontSize: theme.sizes.small + 0.5, marginBottom: 3 }}>{g.name}</P.Text> : null}
            <P.View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {nonEmpty(g.items).map((item, i) => (
                <P.View
                  key={i}
                  style={{
                    backgroundColor: panel?.chip ?? theme.colors.accentSoft,
                    borderRadius: 3,
                    paddingVertical: 1.5,
                    paddingHorizontal: 5,
                    marginRight: 4,
                    marginBottom: 4,
                  }}
                >
                  <P.Text style={{ fontSize: theme.sizes.small, color: panel?.text ?? theme.colors.ink }}>{item}</P.Text>
                </P.View>
              ))}
            </P.View>
          </P.View>
        ))}
      </>
    );
  }

  if (style === "stacked" || panel) {
    return (
      <>
        {groups.map((g) => (
          <P.View key={g.id} style={{ marginBottom: 5 }} wrap={false}>
            {g.name ? <P.Text style={bold(theme)}>{g.name}</P.Text> : null}
            <P.Text>{nonEmpty(g.items).join(", ")}</P.Text>
          </P.View>
        ))}
      </>
    );
  }

  return (
    <>
      {groups.map((g) => (
        <P.Text key={g.id} style={{ marginBottom: 2 }}>
          {g.name ? <P.Text style={bold(theme)}>{`${g.name}: `}</P.Text> : null}
          {nonEmpty(g.items).join(", ")}
        </P.Text>
      ))}
    </>
  );
}

function Certifications({ ctx }: { ctx: Ctx }) {
  const { P, data, theme, panel } = ctx;
  const items = data.certifications.filter((c) => c.name);
  if (!items.length) return null;
  return (
    <>
      {items.map((c) =>
        panel ? (
          <P.View key={c.id} style={{ marginBottom: 5 }} wrap={false}>
            <P.Text style={bold(theme)}>{c.name}</P.Text>
            {c.issuer || c.date ? <P.Text style={{ fontSize: theme.sizes.small, color: panel.muted }}>{[c.issuer, c.date].filter(Boolean).join(" · ")}</P.Text> : null}
          </P.View>
        ) : (
          <P.View key={c.id} style={{ marginBottom: 3 }} wrap={false}>
            <TitleRow
              ctx={ctx}
              title={
                <>
                  {c.name}
                  {c.issuer ? <P.Text style={{ fontFamily: theme.fonts.body.pdf, fontWeight: 400 }}>{` · ${c.issuer}`}</P.Text> : null}
                </>
              }
              right={c.date}
            />
          </P.View>
        ),
      )}
    </>
  );
}

const SECTION_BODY: Record<SectionKey, (p: { ctx: Ctx }) => ReactNode> = {
  summary: ({ ctx }) => (ctx.data.summary ? <ctx.P.Text>{ctx.data.summary}</ctx.P.Text> : null),
  experience: Experience,
  projects: Projects,
  education: Education,
  skills: Skills,
  certifications: Certifications,
};

function hasContent(data: ResumeData, key: SectionKey): boolean {
  switch (key) {
    case "summary":
      return !!data.summary;
    case "experience":
      return data.experience.some((e) => e.role || e.company || nonEmpty(e.bullets).length);
    case "projects":
      return data.projects.some((p) => p.name || nonEmpty(p.bullets).length);
    case "education":
      return data.education.some((e) => e.institution || e.degree);
    case "skills":
      return data.skills.some((g) => nonEmpty(g.items).length);
    case "certifications":
      return data.certifications.some((c) => c.name);
  }
}

function Section({ ctx, section }: { ctx: Ctx; section: SectionKey }) {
  if (!hasContent(ctx.data, section)) return null;
  const { P, theme } = ctx;
  const Body = SECTION_BODY[section];
  return (
    <P.View style={{ marginBottom: theme.spacing.sectionGap }}>
      <P.View wrap={false} minPresenceAhead={40}>
        <Heading ctx={ctx} title={SECTION_TITLES[section]} />
      </P.View>
      <Body ctx={ctx} />
    </P.View>
  );
}

// --- Header ---------------------------------------------------------------

const ICON_FOR: Record<ContactKind, IconName> = {
  email: "mail",
  phone: "phone",
  location: "location",
  website: "globe",
  linkedin: "linkedin",
  github: "github",
};

function ContactText({ ctx, text, color, align }: { ctx: Ctx; text: string; color: string; align?: "left" | "right" | "center" }) {
  const { P } = ctx;
  const href = contactHref(text);
  return href ? (
    <P.Link src={href} style={{ color, textDecoration: "none", textAlign: align }}>
      {text}
    </P.Link>
  ) : (
    <P.Text style={{ color, textAlign: align }}>{text}</P.Text>
  );
}

/** Contact details stacked one per line (sidebars, right-hand header columns). */
function ContactList({ ctx, color, iconColor, align = "left" }: { ctx: Ctx; color: string; iconColor?: string; align?: "left" | "right" }) {
  const { P, data, theme } = ctx;
  const icons = theme.template.contactIcons;
  return (
    <P.View style={{ fontSize: theme.sizes.contact, lineHeight: 1.6 }}>
      {contactEntries(data).map((c) =>
        icons ? (
          <P.View key={c.text} style={{ flexDirection: "row", alignItems: "center", justifyContent: align === "right" ? "flex-end" : "flex-start", marginBottom: 1.5 }}>
            <P.Icon name={ICON_FOR[c.kind]} size={theme.sizes.contact + 1} color={iconColor ?? color} style={{ marginRight: 5 }} />
            <ContactText ctx={ctx} text={c.text} color={color} align={align} />
          </P.View>
        ) : (
          <ContactText key={c.text} ctx={ctx} text={c.text} color={color} align={align} />
        ),
      )}
    </P.View>
  );
}

/**
 * Contact details on one line under the name. Without icons they're joined with
 * " | "; with icons, items are spaced widely (over 3× the font size), which PDF
 * readers treat as a column break, so ATS parsers still see separate details.
 */
function InlineContacts({ ctx, color, iconColor, align }: { ctx: Ctx; color: string; iconColor: string; align: "left" | "center" }) {
  const { P, data, theme } = ctx;
  const entries = contactEntries(data);
  if (!entries.length) return null;
  if (!theme.template.contactIcons) {
    return <P.Text style={{ marginTop: 6, fontSize: theme.sizes.contact, color, textAlign: align }}>{entries.map((e) => e.text).join(" | ")}</P.Text>;
  }
  const center = align === "center";
  return (
    <P.View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", justifyContent: center ? "center" : "flex-start", fontSize: theme.sizes.contact }}>
      {entries.map((c) => (
        <P.View key={c.text} style={{ flexDirection: "row", alignItems: "center", marginBottom: 3, ...(center ? { marginHorizontal: 9 } : { marginRight: 18 }) }}>
          <P.Icon name={ICON_FOR[c.kind]} size={theme.sizes.contact + 1} color={iconColor} style={{ marginRight: 4 }} />
          <ContactText ctx={ctx} text={c.text} color={color} />
        </P.View>
      ))}
    </P.View>
  );
}

function NameBlock({ ctx, color, headlineColor, size, align }: { ctx: Ctx; color: string; headlineColor: string; size: number; align: "left" | "center" }) {
  const { P, data, theme } = ctx;
  const t = theme.template.header;
  return (
    <>
      <P.Text
        style={{
          ...bold(theme, "name"),
          fontSize: size,
          lineHeight: 1.15,
          color,
          textAlign: align,
          textTransform: t.nameCase === "upper" ? "uppercase" : "none",
        }}
      >
        {data.personal.fullName || "Your Name"}
      </P.Text>
      {data.personal.headline ? (
        <P.Text style={{ fontSize: theme.sizes.headline, marginTop: 3, color: headlineColor, textAlign: align }}>{data.personal.headline}</P.Text>
      ) : null}
    </>
  );
}

function TopHeader({ ctx, contactsInHeader }: { ctx: Ctx; contactsInHeader: boolean }) {
  const { P, data, theme } = ctx;
  const t = theme.template.header;
  const c = theme.colors;
  const inline = contactsInHeader && contactEntries(data).length > 0;
  const gapBelow = theme.spacing.sectionGap + 4;

  if (t.style === "band" && c.band) {
    const band = c.band;
    return (
      <P.View
        style={{
          backgroundColor: band.bg,
          marginTop: -theme.spacing.pageY,
          marginHorizontal: -theme.spacing.pageX,
          paddingTop: theme.spacing.pageY * 0.85,
          paddingBottom: 18,
          paddingHorizontal: theme.spacing.pageX,
          marginBottom: gapBelow,
          flexDirection: t.contactsRight ? "row" : "column",
          // Top-aligned so the name comes first in reading order (what ATS parsers see).
          alignItems: t.contactsRight ? "flex-start" : "stretch",
        }}
      >
        <P.View style={{ flex: t.contactsRight ? 1 : undefined, paddingRight: t.contactsRight ? 16 : 0 }}>
          <NameBlock ctx={ctx} color={band.text} headlineColor={band.muted} size={t.nameSize} align={t.align} />
          {inline && !t.contactsRight ? <InlineContacts ctx={ctx} color={band.muted} iconColor={band.text} align={t.align} /> : null}
        </P.View>
        {contactsInHeader && t.contactsRight ? <ContactList ctx={ctx} color={band.text} iconColor={band.muted} align="right" /> : null}
      </P.View>
    );
  }

  if (t.style === "split") {
    return (
      <P.View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: c.rule,
          marginBottom: gapBelow,
        }}
      >
        <P.View style={{ flex: 1, paddingRight: 16 }}>
          <NameBlock ctx={ctx} color={c.ink} headlineColor={c.accent} size={t.nameSize} align="left" />
        </P.View>
        {contactsInHeader ? <ContactList ctx={ctx} color={c.muted} iconColor={c.accent} align="right" /> : null}
      </P.View>
    );
  }

  if (t.style === "boxed") {
    return (
      <P.View style={{ borderWidth: 1.5, borderColor: c.accent, paddingVertical: 12, paddingHorizontal: 16, marginBottom: gapBelow, alignItems: "center" }}>
        <NameBlock ctx={ctx} color={c.ink} headlineColor={c.accent} size={t.nameSize} align="center" />
        {inline ? <InlineContacts ctx={ctx} color={c.muted} iconColor={c.accent} align="center" /> : null}
      </P.View>
    );
  }

  const underline = t.style === "underline";
  return (
    <P.View
      style={{
        marginBottom: gapBelow,
        paddingBottom: underline ? 10 : 0,
        borderBottomWidth: underline ? 3 : 0,
        borderBottomColor: c.accent,
      }}
    >
      <NameBlock ctx={ctx} color={theme.template.id === "traditional" || theme.template.id === "tech" ? c.ink : c.accent} headlineColor={theme.template.id === "traditional" ? c.muted : c.accent} size={t.nameSize} align={t.align} />
      {inline ? <InlineContacts ctx={ctx} color={c.muted} iconColor={c.accent} align={t.align} /> : null}
    </P.View>
  );
}

function SidebarHeader({ ctx }: { ctx: Ctx }) {
  const panel = ctx.panel!;
  const { P, theme } = ctx;
  return (
    <P.View style={{ marginBottom: theme.spacing.sectionGap + 2 }}>
      <NameBlock ctx={ctx} color={panel.text} headlineColor={panel.muted} size={Math.min(theme.template.header.nameSize, 22)} align="left" />
      <P.View style={{ marginTop: 10 }}>
        <ContactList ctx={ctx} color={panel.text} iconColor={panel.accent} />
      </P.View>
    </P.View>
  );
}

function SidebarContact({ ctx }: { ctx: Ctx }) {
  if (!contactEntries(ctx.data).length) return null;
  return (
    <ctx.P.View style={{ marginBottom: ctx.theme.spacing.sectionGap }}>
      <Heading ctx={ctx} title="Contact" />
      <ContactList ctx={ctx} color={ctx.panel!.text} iconColor={ctx.panel!.accent} />
    </ctx.P.View>
  );
}

// --- Page ---------------------------------------------------------------

/** The page's content. The caller supplies the page itself (size, paper color, base font, vertical padding). */
export function ResumeContent({ P, data, theme }: { P: Primitives; data: ResumeData; theme: ResolvedTheme }) {
  const t = theme.template;
  const main: Ctx = { P, data, theme, panel: null };

  if (t.layout !== "sidebar" || !t.sidebar || !theme.colors.sidebar) {
    return (
      <P.View style={{ paddingHorizontal: theme.spacing.pageX }}>
        <TopHeader ctx={main} contactsInHeader />
        {t.sectionOrder.map((s) => (
          <Section key={s} ctx={main} section={s} />
        ))}
      </P.View>
    );
  }

  const panelColors = theme.colors.sidebar;
  const side: Ctx = { P, data, theme, panel: panelColors };
  const { sidebarWidth, sidebarPad, pageX } = theme.spacing;
  const right = t.sidebar.side === "right";
  const headerInSidebar = t.header.placement === "sidebar";

  const sidebarColumn = (
    <P.View
      style={{
        width: sidebarWidth,
        paddingHorizontal: sidebarPad,
        color: panelColors.text,
        position: "relative",
        ...(t.sidebar.background === "none" ? { borderLeftWidth: right ? 0.75 : 0, borderRightWidth: right ? 0 : 0.75, borderColor: panelColors.rule } : {}),
      }}
    >
      {headerInSidebar ? <SidebarHeader ctx={side} /> : <SidebarContact ctx={side} />}
      {t.sidebar.sections.map((s) => (
        <Section key={s} ctx={side} section={s} />
      ))}
    </P.View>
  );
  const mainColumn = (
    <P.View style={{ flex: 1, paddingHorizontal: pageX - 10, position: "relative" }}>
      {t.sectionOrder.map((s) => (
        <Section key={s} ctx={main} section={s} />
      ))}
    </P.View>
  );

  return (
    <>
      {t.sidebar.background !== "none" ? (
        // Full-height sidebar color, repeated on every page.
        <P.View
          fixed
          style={{ position: "absolute", top: 0, bottom: 0, [right ? "right" : "left"]: 0, width: sidebarWidth, backgroundColor: panelColors.bg }}
        />
      ) : null}
      {!headerInSidebar ? (
        // Keep the header clear of the sidebar column so it doesn't sit on the sidebar's color.
        <P.View style={{ position: "relative", paddingLeft: right ? pageX : sidebarWidth + 16, paddingRight: right ? sidebarWidth + 16 : pageX }}>
          <TopHeader ctx={main} contactsInHeader={false} />
        </P.View>
      ) : null}
      <P.View style={{ flexDirection: "row", position: "relative" }}>
        {right ? mainColumn : sidebarColumn}
        {right ? sidebarColumn : mainColumn}
      </P.View>
    </>
  );
}
