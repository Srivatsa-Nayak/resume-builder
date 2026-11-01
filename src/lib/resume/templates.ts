import type { FontKey } from "./fonts";
import type { PageSize } from "./schema";

export type SectionKey = "summary" | "experience" | "projects" | "education" | "skills" | "certifications";
export type TemplateCategory = "Professional" | "Modern" | "Creative" | "Minimalist" | "Simple";
export type HeadingStyle = "underline" | "rule" | "bar" | "pill" | "plain" | "dashed" | "overline";

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  /** Rough guidance on how reliably parsers read this layout. */
  atsFriendliness: "Excellent" | "Very good" | "Good";
  defaultAccent: string;
  /** Page background; white when omitted. */
  paper?: string;
  layout: "single" | "sidebar";
  sidebar?: {
    side: "left" | "right";
    /** accent: accent color · dark: charcoal · tint: pale accent · none: white with a divider */
    background: "accent" | "dark" | "tint" | "none";
    sections: SectionKey[];
  };
  header: {
    style: "plain" | "band" | "split" | "underline" | "boxed";
    align: "left" | "center";
    /** In sidebar layouts, the name can sit at the top of the sidebar instead of across the page. */
    placement: "top" | "sidebar";
    /** Band background for the "band" style. */
    band?: "accent" | "dark";
    /** Contact details in a right-hand column instead of under the name ("split" always does this). */
    contactsRight?: boolean;
    nameCase: "normal" | "upper";
    nameSize: number;
  };
  fonts: { name: FontKey; heading: FontKey; body: FontKey };
  headings: { style: HeadingStyle; case: "upper" | "normal"; align: "left" | "center" };
  skills: "inline" | "tags" | "stacked";
  experience: "standard" | "timeline";
  /** Small icons before each contact detail (email, phone, location, links). */
  contactIcons?: boolean;
  density: "compact" | "normal" | "airy";
  /** Sections in the main column (sidebar sections are listed under `sidebar`). */
  sectionOrder: SectionKey[];
}

const ALL: SectionKey[] = ["summary", "experience", "projects", "education", "skills", "certifications"];
const SKILLS_FIRST: SectionKey[] = ["summary", "skills", "experience", "projects", "education", "certifications"];
const EDUCATION_FIRST: SectionKey[] = ["summary", "education", "experience", "projects", "skills", "certifications"];
const MAIN_WITH_SIDEBAR: SectionKey[] = ["summary", "experience", "projects"];
const SIDEBAR: SectionKey[] = ["skills", "education", "certifications"];

const define = <T extends Record<string, Omit<TemplateDef, "id">>>(defs: T) =>
  Object.fromEntries(Object.entries(defs).map(([id, def]) => [id, { id, ...def }])) as { [K in keyof T]: TemplateDef & { id: K } };

export const TEMPLATES = define({
  modern: {
    name: "Modern",
    description: "Clean single column with an accent color. A safe choice for most roles.",
    category: "Professional",
    atsFriendliness: "Excellent",
    defaultAccent: "#1d6b5f",
    layout: "single",
    header: { style: "plain", align: "left", placement: "top", nameCase: "normal", nameSize: 22 },
    fonts: { name: "helvetica", heading: "helvetica", body: "helvetica" },
    headings: { style: "underline", case: "upper", align: "left" },
    skills: "inline",
    experience: "standard",
    contactIcons: true,
    density: "normal",
    sectionOrder: ALL,
  },
  harbor: {
    name: "Harbor",
    description: "A confident navy header band over a clean, well-spaced body.",
    category: "Professional",
    atsFriendliness: "Very good",
    defaultAccent: "#1f3a5f",
    layout: "single",
    header: { style: "band", align: "left", placement: "top", band: "accent", nameCase: "normal", nameSize: 24 },
    fonts: { name: "montserrat", heading: "montserrat", body: "openSans" },
    headings: { style: "plain", case: "upper", align: "left" },
    skills: "tags",
    experience: "standard",
    contactIcons: true,
    density: "normal",
    sectionOrder: ALL,
  },
  elegant: {
    name: "Elegant",
    description: "Playfair Display headings on warm paper. Refined without being fussy.",
    category: "Professional",
    atsFriendliness: "Excellent",
    defaultAccent: "#8b5e3c",
    paper: "#fbf8f3",
    layout: "single",
    header: { style: "plain", align: "center", placement: "top", nameCase: "normal", nameSize: 28 },
    fonts: { name: "playfair", heading: "playfair", body: "lato" },
    headings: { style: "rule", case: "upper", align: "center" },
    skills: "inline",
    experience: "standard",
    density: "normal",
    sectionOrder: ALL,
  },
  executive: {
    name: "Executive",
    description: "Baskerville and a heavy accent rule for senior and leadership roles.",
    category: "Professional",
    atsFriendliness: "Excellent",
    defaultAccent: "#7a1f2b",
    layout: "single",
    header: { style: "underline", align: "left", placement: "top", nameCase: "normal", nameSize: 26 },
    fonts: { name: "libreBaskerville", heading: "libreBaskerville", body: "sourceSerif" },
    headings: { style: "overline", case: "upper", align: "left" },
    skills: "inline",
    experience: "standard",
    density: "normal",
    sectionOrder: ALL,
  },
  ivy: {
    name: "Ivy",
    description: "Merriweather headings and a deep green accent. Classic with some warmth.",
    category: "Professional",
    atsFriendliness: "Excellent",
    defaultAccent: "#2f6b3b",
    layout: "single",
    header: { style: "underline", align: "left", placement: "top", nameCase: "normal", nameSize: 24 },
    fonts: { name: "merriweather", heading: "merriweather", body: "openSans" },
    headings: { style: "underline", case: "upper", align: "left" },
    skills: "inline",
    experience: "standard",
    density: "normal",
    sectionOrder: ALL,
  },
  academic: {
    name: "Academic",
    description: "Education first, set in Source Serif. Built for research and teaching CVs.",
    category: "Professional",
    atsFriendliness: "Excellent",
    defaultAccent: "#1e3a8a",
    layout: "single",
    header: { style: "plain", align: "center", placement: "top", nameCase: "normal", nameSize: 24 },
    fonts: { name: "sourceSerif", heading: "sourceSerif", body: "sourceSerif" },
    headings: { style: "rule", case: "normal", align: "left" },
    skills: "inline",
    experience: "standard",
    density: "normal",
    sectionOrder: EDUCATION_FIRST,
  },
  graphite: {
    name: "Graphite",
    description: "IBM Plex Sans with a soft grey sidebar. Calm, corporate and tidy.",
    category: "Professional",
    atsFriendliness: "Good",
    defaultAccent: "#4b5563",
    layout: "sidebar",
    sidebar: { side: "left", background: "tint", sections: SIDEBAR },
    header: { style: "plain", align: "left", placement: "sidebar", nameCase: "normal", nameSize: 20 },
    fonts: { name: "ibmPlex", heading: "ibmPlex", body: "ibmPlex" },
    headings: { style: "rule", case: "upper", align: "left" },
    skills: "stacked",
    experience: "standard",
    contactIcons: true,
    density: "normal",
    sectionOrder: MAIN_WITH_SIDEBAR,
  },
  tech: {
    name: "Tech",
    description: "Skills first with monospace headings. Built for engineering roles.",
    category: "Modern",
    atsFriendliness: "Very good",
    defaultAccent: "#2563eb",
    layout: "single",
    header: { style: "plain", align: "left", placement: "top", nameCase: "normal", nameSize: 22 },
    fonts: { name: "helvetica", heading: "courier", body: "helvetica" },
    headings: { style: "dashed", case: "upper", align: "left" },
    skills: "inline",
    experience: "standard",
    density: "normal",
    sectionOrder: SKILLS_FIRST,
  },
  aurora: {
    name: "Aurora",
    description: "Poppins headline, lavender sidebar and a timeline for your experience.",
    category: "Modern",
    atsFriendliness: "Good",
    defaultAccent: "#6d28d9",
    layout: "sidebar",
    sidebar: { side: "right", background: "tint", sections: SIDEBAR },
    header: { style: "plain", align: "left", placement: "top", nameCase: "normal", nameSize: 28 },
    fonts: { name: "poppins", heading: "poppins", body: "dmSans" },
    headings: { style: "bar", case: "normal", align: "left" },
    skills: "tags",
    experience: "timeline",
    contactIcons: true,
    density: "normal",
    sectionOrder: MAIN_WITH_SIDEBAR,
  },
  slate: {
    name: "Slate",
    description: "Charcoal sidebar, Montserrat headings and teal highlights.",
    category: "Modern",
    atsFriendliness: "Good",
    defaultAccent: "#0d9488",
    layout: "sidebar",
    sidebar: { side: "left", background: "dark", sections: SIDEBAR },
    header: { style: "plain", align: "left", placement: "sidebar", nameCase: "normal", nameSize: 20 },
    fonts: { name: "montserrat", heading: "montserrat", body: "openSans" },
    headings: { style: "underline", case: "upper", align: "left" },
    skills: "tags",
    experience: "standard",
    contactIcons: true,
    density: "normal",
    sectionOrder: MAIN_WITH_SIDEBAR,
  },
  bold: {
    name: "Bold",
    description: "Tall Oswald name on a black band. Hard to overlook.",
    category: "Modern",
    atsFriendliness: "Very good",
    defaultAccent: "#b45309",
    layout: "single",
    header: { style: "band", align: "left", placement: "top", band: "dark", nameCase: "upper", nameSize: 30 },
    fonts: { name: "oswald", heading: "oswald", body: "lato" },
    headings: { style: "plain", case: "upper", align: "left" },
    skills: "inline",
    experience: "timeline",
    contactIcons: true,
    density: "normal",
    sectionOrder: ALL,
  },
  metro: {
    name: "Metro",
    description: "Split header, pill headings and a timeline. Work Sans throughout.",
    category: "Modern",
    atsFriendliness: "Very good",
    defaultAccent: "#1d4ed8",
    layout: "single",
    header: { style: "split", align: "left", placement: "top", nameCase: "normal", nameSize: 26 },
    fonts: { name: "workSans", heading: "workSans", body: "workSans" },
    headings: { style: "pill", case: "upper", align: "left" },
    skills: "tags",
    experience: "timeline",
    contactIcons: true,
    density: "normal",
    sectionOrder: ALL,
  },
  pulse: {
    name: "Pulse",
    description: "Bright blue band and Poppins headings. Energetic and current.",
    category: "Modern",
    atsFriendliness: "Very good",
    defaultAccent: "#0f62fe",
    layout: "single",
    header: { style: "band", align: "left", placement: "top", band: "accent", nameCase: "normal", nameSize: 26 },
    fonts: { name: "poppins", heading: "poppins", body: "dmSans" },
    headings: { style: "bar", case: "normal", align: "left" },
    skills: "tags",
    experience: "standard",
    contactIcons: true,
    density: "normal",
    sectionOrder: ALL,
  },
  horizon: {
    name: "Horizon",
    description: "Teal band with your contact details opposite your name.",
    category: "Modern",
    atsFriendliness: "Very good",
    defaultAccent: "#0e7490",
    layout: "single",
    header: { style: "band", align: "left", placement: "top", band: "accent", contactsRight: true, nameCase: "normal", nameSize: 24 },
    fonts: { name: "montserrat", heading: "montserrat", body: "lato" },
    headings: { style: "underline", case: "upper", align: "left" },
    skills: "inline",
    experience: "standard",
    contactIcons: true,
    density: "normal",
    sectionOrder: ALL,
  },
  blueprint: {
    name: "Blueprint",
    description: "Roboto Slab, skills up front and a timeline. Made for developers.",
    category: "Modern",
    atsFriendliness: "Very good",
    defaultAccent: "#1d4ed8",
    layout: "single",
    header: { style: "plain", align: "left", placement: "top", nameCase: "normal", nameSize: 24 },
    fonts: { name: "robotoSlab", heading: "robotoSlab", body: "openSans" },
    headings: { style: "dashed", case: "upper", align: "left" },
    skills: "tags",
    experience: "timeline",
    contactIcons: true,
    density: "normal",
    sectionOrder: SKILLS_FIRST,
  },
  cascade: {
    name: "Cascade",
    description: "Two white columns split by a fine rule, with crimson accents.",
    category: "Modern",
    atsFriendliness: "Good",
    defaultAccent: "#be123c",
    layout: "sidebar",
    sidebar: { side: "right", background: "none", sections: SIDEBAR },
    header: { style: "plain", align: "left", placement: "top", nameCase: "normal", nameSize: 26 },
    fonts: { name: "raleway", heading: "raleway", body: "nunito" },
    headings: { style: "underline", case: "normal", align: "left" },
    skills: "stacked",
    experience: "standard",
    contactIcons: true,
    density: "normal",
    sectionOrder: MAIN_WITH_SIDEBAR,
  },
  creative: {
    name: "Creative",
    description: "Plum sidebar with Montserrat headings. Great for design and marketing.",
    category: "Creative",
    atsFriendliness: "Good",
    defaultAccent: "#5b3a6e",
    layout: "sidebar",
    sidebar: { side: "left", background: "accent", sections: SIDEBAR },
    header: { style: "plain", align: "left", placement: "sidebar", nameCase: "normal", nameSize: 20 },
    fonts: { name: "montserrat", heading: "montserrat", body: "lato" },
    headings: { style: "plain", case: "upper", align: "left" },
    skills: "stacked",
    experience: "standard",
    contactIcons: true,
    density: "normal",
    sectionOrder: MAIN_WITH_SIDEBAR,
  },
  mint: {
    name: "Mint",
    description: "Pale green sidebar, rounded Josefin Sans and friendly pill headings.",
    category: "Creative",
    atsFriendliness: "Good",
    defaultAccent: "#0f766e",
    layout: "sidebar",
    sidebar: { side: "left", background: "tint", sections: SIDEBAR },
    header: { style: "plain", align: "left", placement: "sidebar", nameCase: "normal", nameSize: 22 },
    fonts: { name: "josefin", heading: "josefin", body: "nunito" },
    headings: { style: "pill", case: "normal", align: "left" },
    skills: "tags",
    experience: "standard",
    contactIcons: true,
    density: "normal",
    sectionOrder: MAIN_WITH_SIDEBAR,
  },
  studio: {
    name: "Studio",
    description: "Deep indigo sidebar on the right and a big Poppins name.",
    category: "Creative",
    atsFriendliness: "Good",
    defaultAccent: "#3730a3",
    layout: "sidebar",
    sidebar: { side: "right", background: "accent", sections: SIDEBAR },
    header: { style: "plain", align: "left", placement: "top", nameCase: "normal", nameSize: 28 },
    fonts: { name: "poppins", heading: "poppins", body: "poppins" },
    headings: { style: "bar", case: "upper", align: "left" },
    skills: "tags",
    experience: "standard",
    contactIcons: true,
    density: "normal",
    sectionOrder: MAIN_WITH_SIDEBAR,
  },
  sage: {
    name: "Sage",
    description: "Muted green sidebar, Playfair name and a timeline. Soft and editorial.",
    category: "Creative",
    atsFriendliness: "Good",
    defaultAccent: "#5f7d5a",
    layout: "sidebar",
    sidebar: { side: "left", background: "tint", sections: SIDEBAR },
    header: { style: "plain", align: "left", placement: "sidebar", nameCase: "normal", nameSize: 24 },
    fonts: { name: "playfair", heading: "playfair", body: "raleway" },
    headings: { style: "plain", case: "normal", align: "left" },
    skills: "tags",
    experience: "timeline",
    contactIcons: true,
    density: "normal",
    sectionOrder: MAIN_WITH_SIDEBAR,
  },
  monogram: {
    name: "Monogram",
    description: "Your name framed in a box, Playfair headings and rose accents.",
    category: "Creative",
    atsFriendliness: "Very good",
    defaultAccent: "#9d174d",
    layout: "single",
    header: { style: "boxed", align: "center", placement: "top", nameCase: "upper", nameSize: 24 },
    fonts: { name: "playfair", heading: "playfair", body: "lato" },
    headings: { style: "rule", case: "normal", align: "center" },
    skills: "tags",
    experience: "standard",
    contactIcons: true,
    density: "normal",
    sectionOrder: ALL,
  },
  minimal: {
    name: "Minimal",
    description: "Raleway and Work Sans with generous white space. Nothing extra.",
    category: "Minimalist",
    atsFriendliness: "Excellent",
    defaultAccent: "#111827",
    layout: "single",
    header: { style: "plain", align: "left", placement: "top", nameCase: "normal", nameSize: 30 },
    fonts: { name: "raleway", heading: "raleway", body: "workSans" },
    headings: { style: "plain", case: "normal", align: "left" },
    skills: "inline",
    experience: "standard",
    density: "airy",
    sectionOrder: ALL,
  },
  nordic: {
    name: "Nordic",
    description: "Cool paper, DM Sans and a split header. Quiet and precise.",
    category: "Minimalist",
    atsFriendliness: "Very good",
    defaultAccent: "#0369a1",
    paper: "#f7f9fb",
    layout: "single",
    header: { style: "split", align: "left", placement: "top", nameCase: "normal", nameSize: 26 },
    fonts: { name: "dmSans", heading: "dmSans", body: "dmSans" },
    headings: { style: "bar", case: "upper", align: "left" },
    skills: "inline",
    experience: "standard",
    contactIcons: true,
    density: "normal",
    sectionOrder: ALL,
  },
  clarity: {
    name: "Clarity",
    description: "Ink-black DM Sans headings over fine rules. Airy and easy to scan.",
    category: "Minimalist",
    atsFriendliness: "Excellent",
    defaultAccent: "#0f172a",
    layout: "single",
    header: { style: "plain", align: "left", placement: "top", nameCase: "normal", nameSize: 26 },
    fonts: { name: "dmSans", heading: "dmSans", body: "dmSans" },
    headings: { style: "rule", case: "normal", align: "left" },
    skills: "inline",
    experience: "standard",
    density: "airy",
    sectionOrder: ALL,
  },
  traditional: {
    name: "Traditional",
    description: "Classic serif layout with a centered header. Suits law, finance and academia.",
    category: "Simple",
    atsFriendliness: "Excellent",
    defaultAccent: "#1f2937",
    layout: "single",
    header: { style: "plain", align: "center", placement: "top", nameCase: "upper", nameSize: 22 },
    fonts: { name: "times", heading: "times", body: "times" },
    headings: { style: "rule", case: "upper", align: "left" },
    skills: "inline",
    experience: "standard",
    density: "normal",
    sectionOrder: ["summary", "experience", "education", "skills", "projects", "certifications"],
  },
  garamond: {
    name: "Garamond",
    description: "EB Garamond throughout with centered headings. Timeless.",
    category: "Simple",
    atsFriendliness: "Excellent",
    defaultAccent: "#374151",
    layout: "single",
    header: { style: "plain", align: "center", placement: "top", nameCase: "normal", nameSize: 26 },
    fonts: { name: "ebGaramond", heading: "ebGaramond", body: "ebGaramond" },
    headings: { style: "rule", case: "normal", align: "center" },
    skills: "inline",
    experience: "standard",
    density: "normal",
    sectionOrder: ALL,
  },
  linen: {
    name: "Linen",
    description: "Warm paper, Baskerville name and soft brown accents.",
    category: "Simple",
    atsFriendliness: "Excellent",
    defaultAccent: "#8a5a44",
    paper: "#faf7f2",
    layout: "single",
    header: { style: "plain", align: "center", placement: "top", nameCase: "normal", nameSize: 26 },
    fonts: { name: "libreBaskerville", heading: "libreBaskerville", body: "lato" },
    headings: { style: "plain", case: "normal", align: "left" },
    skills: "inline",
    experience: "standard",
    density: "normal",
    sectionOrder: ALL,
  },
  compact: {
    name: "Compact",
    description: "Tighter spacing in Open Sans to fit a long career on fewer pages.",
    category: "Simple",
    atsFriendliness: "Excellent",
    defaultAccent: "#334155",
    layout: "single",
    header: { style: "plain", align: "left", placement: "top", nameCase: "normal", nameSize: 20 },
    fonts: { name: "openSans", heading: "openSans", body: "openSans" },
    headings: { style: "rule", case: "upper", align: "left" },
    skills: "inline",
    experience: "standard",
    density: "compact",
    sectionOrder: ALL,
  },
});

export type TemplateId = keyof typeof TEMPLATES;

export const TEMPLATE_LIST = Object.values(TEMPLATES) as (TemplateDef & { id: TemplateId })[];
export const TEMPLATE_CATEGORIES: TemplateCategory[] = ["Professional", "Modern", "Creative", "Minimalist", "Simple"];

/** Gallery order: the most visually distinctive designs first, the plainest last. */
const DISPLAY_ORDER: TemplateId[] = [
  "aurora",
  "harbor",
  "slate",
  "studio",
  "horizon",
  "sage",
  "pulse",
  "creative",
  "mint",
  "bold",
  "metro",
  "elegant",
  "monogram",
  "blueprint",
  "cascade",
  "graphite",
  "nordic",
  "executive",
  "ivy",
  "linen",
  "modern",
  "garamond",
  "minimal",
  "clarity",
  "tech",
  "academic",
  "traditional",
  "compact",
];

export const GALLERY_TEMPLATES = DISPLAY_ORDER.map((id) => TEMPLATES[id]) as (TemplateDef & { id: TemplateId })[];

/** Plain-language summary of a template's design, for the preview panel. */
export function templateFeatures(t: TemplateDef): string[] {
  const fontNames = [...new Set([t.fonts.name, t.fonts.heading, t.fonts.body])].map((f) => (FONT_NAMES[f] ?? f).replace(/ (serif|monospace|condensed)$/, ""));
  const features: string[] = [];
  if (t.layout === "sidebar" && t.sidebar) {
    const bg = { accent: "colored", dark: "dark", tint: "tinted", none: "white" }[t.sidebar.background];
    features.push(`Two columns with a ${bg} ${t.sidebar.side} sidebar`);
  } else {
    features.push("Single column, easy for recruiters to scan");
  }
  if (t.header.style === "band") features.push("Full-width colored header");
  if (t.header.style === "boxed") features.push("Name framed in a box");
  if (t.header.style === "split") features.push("Contact details opposite your name");
  if (t.contactIcons) features.push("Icons for contact details");
  if (t.experience === "timeline") features.push("Timeline layout for experience");
  if (t.skills === "tags") features.push("Skills shown as tags");
  if (t.paper) features.push("Soft tinted paper");
  features.push(`Fonts: ${fontNames.join(", ")}`);
  return features;
}

const FONT_NAMES: Record<string, string> = {
  helvetica: "Helvetica",
  times: "Times serif",
  courier: "Courier monospace",
  lato: "Lato",
  montserrat: "Montserrat",
  raleway: "Raleway",
  poppins: "Poppins",
  openSans: "Open Sans",
  dmSans: "DM Sans",
  workSans: "Work Sans",
  josefin: "Josefin Sans",
  nunito: "Nunito",
  ibmPlex: "IBM Plex Sans",
  oswald: "Oswald condensed",
  playfair: "Playfair Display serif",
  merriweather: "Merriweather serif",
  libreBaskerville: "Libre Baskerville serif",
  ebGaramond: "EB Garamond serif",
  sourceSerif: "Source Serif serif",
  robotoSlab: "Roboto Slab serif",
};

/** Words describing a template's design, so people can search for "sidebar", "serif", "timeline" or a font name. */
export function templateKeywords(t: TemplateDef): string {
  const words = [t.name, t.category, t.description, `ATS ${t.atsFriendliness}`, ...new Set(Object.values(t.fonts).map((f) => FONT_NAMES[f] ?? f))];
  if (t.layout === "sidebar" && t.sidebar) {
    words.push("sidebar two column 2 column", `${t.sidebar.side} sidebar`, t.sidebar.background === "none" ? "divider" : `${t.sidebar.background} sidebar colored color`);
  } else {
    words.push("single column one column");
  }
  if (t.header.style === "band") words.push("header band banner colored color");
  if (t.header.style === "boxed") words.push("boxed framed border");
  if (t.header.style === "split") words.push("split header");
  if (t.header.align === "center") words.push("centered");
  if (t.experience === "timeline") words.push("timeline");
  if (t.skills === "tags") words.push("skill tags chips");
  if (t.paper) words.push("tinted paper cream warm");
  if (t.density === "compact") words.push("compact dense one page");
  if (t.density === "airy") words.push("spacious airy white space");
  const serif = [t.fonts.name, t.fonts.heading].some((f) => / serif$/.test(FONT_NAMES[f] ?? ""));
  // "sansserif" is one word so that searching "serif" only finds serif designs.
  words.push(serif ? "serif classic" : "sans sansserif");
  return words.join(" ").toLowerCase();
}

/**
 * Templates where every word of the query starts a word in the template's
 * keywords, so partial typing works ("side" finds sidebar designs).
 */
export function searchTemplates<T extends TemplateDef>(templates: T[], query: string): T[] {
  const terms = query.toLowerCase().split(/[^a-z0-9+#]+/).filter(Boolean);
  if (!terms.length) return templates;
  return templates.filter((t) => {
    const words = templateKeywords(t).split(/[^a-z0-9+#]+/);
    return terms.every((term) => words.some((w) => w.startsWith(term)));
  });
}

export function getTemplate(id: string | null | undefined): TemplateDef {
  return TEMPLATES[(id ?? "") as TemplateId] ?? TEMPLATES.modern;
}

export function isTemplateId(id: unknown): id is TemplateId {
  return typeof id === "string" && id in TEMPLATES;
}

export const SECTION_TITLES: Record<SectionKey, string> = {
  summary: "Summary",
  experience: "Experience",
  projects: "Projects",
  education: "Education",
  skills: "Skills",
  certifications: "Certifications",
};

/** Page dimensions in PDF points (1pt = 1/72in). */
export const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
  LETTER: { width: 612, height: 792 },
  A4: { width: 595.28, height: 841.89 },
};
