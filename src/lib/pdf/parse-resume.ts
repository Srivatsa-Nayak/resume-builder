// Heuristic resume parser: turns plain text lines (from a PDF) into ResumeData.
// Used directly when no AI provider is available, and as a fallback otherwise.

import {
  CertificationSchema,
  EducationSchema,
  ExperienceSchema,
  ProjectSchema,
  ResumeDataSchema,
  SkillGroupSchema,
  type Certification,
  type Education,
  type Experience,
  type Project,
  type ResumeData,
  type SkillGroup,
} from "@/lib/resume/schema";

type SectionId =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "awards"
  | "volunteer"
  | "languages"
  | "interests"
  | "contact";

const SECTION_ALIASES: Record<SectionId, string[]> = {
  summary: [
    "summary", "professional summary", "profile", "professional profile", "about me", "about", "objective",
    "career objective", "career summary", "executive summary", "overview", "personal statement",
    "qualifications summary", "summary of qualifications", "personal profile",
  ],
  experience: [
    "experience", "work experience", "professional experience", "employment", "employment history", "work history",
    "career history", "relevant experience", "professional background", "career experience", "experience history",
    "professional history", "work and experience",
  ],
  education: [
    "education", "academic background", "education and training", "academic qualifications", "educational background",
    "academics", "academic history", "education history",
  ],
  skills: [
    "skills", "technical skills", "core skills", "key skills", "core competencies", "competencies", "areas of expertise",
    "expertise", "technologies", "tech stack", "skills and tools", "tools", "skills and abilities",
    "technical proficiencies", "proficiencies", "skills summary", "skill set", "skillset", "tools and technologies",
    "technical expertise",
  ],
  projects: [
    "projects", "personal projects", "key projects", "selected projects", "academic projects", "side projects",
    "portfolio", "open source", "notable projects",
  ],
  certifications: [
    "certifications", "certificates", "certification", "licenses", "licenses and certifications",
    "certifications and licenses", "professional certifications", "courses", "training", "professional development",
    "courses and certifications",
  ],
  awards: ["awards", "honors", "honors and awards", "awards and honors", "achievements", "accomplishments", "awards and achievements"],
  volunteer: ["volunteer", "volunteering", "volunteer experience", "community involvement", "leadership and volunteering", "leadership", "extracurricular activities", "activities"],
  languages: ["languages", "language skills", "language"],
  interests: ["interests", "hobbies", "hobbies and interests", "personal interests"],
  // Sidebar contact blocks; their lines are used for contact details only.
  contact: ["contact", "contacts", "contact info", "contact information", "contact details", "personal details", "personal information", "get in touch"],
};

const HEADING_LOOKUP = new Map<string, SectionId>(
  Object.entries(SECTION_ALIASES).flatMap(([id, aliases]) => aliases.map((a) => [a, id as SectionId] as const)),
);
// Letter-spaced headings ("W O R K  E X P E R I E N C E") lose their word gaps.
const HEADING_LOOKUP_NOSPACE = new Map<string, SectionId>([...HEADING_LOOKUP].map(([alias, id]) => [alias.replace(/ /g, ""), id]));

const normalizeHeading = (line: string) =>
  line
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function detectHeading(line: string): SectionId | null {
  const clean = line.replace(/\t/g, " ").trim();
  if (clean.length > 60) return null;
  const words = clean.split(/\s+/);
  if (words.length >= 3 && words.every((w) => w.length <= 2)) {
    return HEADING_LOOKUP_NOSPACE.get(normalizeHeading(clean).replace(/ /g, "")) ?? null;
  }
  if (clean.length > 45 || words.length > 5) return null;
  return HEADING_LOOKUP.get(normalizeHeading(clean)) ?? null;
}

// --- Patterns -------------------------------------------------------------

const MONTH =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const SEASON = "(?:spring|summer|fall|autumn|winter)";
const DATE = `(?:(?:${MONTH}|${SEASON}),?\\s+\\d{4}|\\d{1,2}[/.-]\\d{4}|\\d{4})`;
const END = `(?:${DATE}|present|current|now|today|ongoing)`;
const RANGE_RE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|until|through|~)\\s*(${END})`, "i");
const SINGLE_DATE_RE = new RegExp(`(?:^|[\\s(,|])(${DATE}|(?:expected|exp\\.?)\\s+${DATE})(?=$|[\\s),|])`, "i");

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
// US "(555) 123-4567", international "+91 70192 18352", "+44 20 7946 0958"
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,5})[\s.-]?\d{3,5}(?:[\s.-]?\d{3,5})?/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[A-Za-z0-9\-_/%.]+/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9\-_.]+(?:\/[A-Za-z0-9\-_.]+)?/i;
const WEBSITE_RE =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|dev|io|me|net|org|app|co|ai|tech|design|xyz|info|site|page|us|uk|ca|in|de|eu|portfolio)(?:\/[^\s|,]*)?/i;
const LOCATION_RE = /^(?:[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)*,\s*(?:[A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:,\s*[A-Z][A-Za-z]+)?|remote|hybrid)$/i;
const BULLET_RE = /^[•·▪◦●‣∙○■□➢➤►▶✓✔\-–—*]\s*/;

const ROLE_WORDS =
  /\b(engineer|developer|manager|director|analyst|designer|intern|consultant|specialist|lead|architect|scientist|coordinator|assistant|associate|officer|administrator|representative|executive|president|head|founder|owner|teacher|nurse|technician|writer|editor|accountant|advisor|strategist|programmer|researcher|supervisor|agent|clerk|cashier|chef|tutor|instructor|professor|fellow|vp|cto|ceo|cfo|coo)\b/i;
const COMPANY_WORDS =
  /\b(inc|llc|ltd|corp|corporation|company|co|group|labs?|technologies|technology|solutions|systems|university|bank|agency|partners|gmbh|plc|studio|studios|consulting|services|health|hospital|foundation)\b\.?/i;
const INSTITUTION_RE = /\b(university|college|institute|school|academy|polytechnic|universidad|université|universität|conservatory|iit|mit)\b/i;
const DEGREE_RE =
  /\b(bachelor'?s?|master'?s?|b\.?\s?s\.?c?|b\.?\s?a\.?|m\.?\s?s\.?c?|m\.?\s?a\.?|mba|ph\.?\s?d|associate'?s?|diploma|b\.?\s?tech|m\.?\s?tech|m\.?\s?eng|b\.?\s?eng|doctor(?:ate)?|certificate|high school|ged|jd|md|llb|llm|bba)\b/i;
// Short uppercase forms that would be ambiguous case-insensitively ("be", "me").
const isDegree = (s: string) => DEGREE_RE.test(s) || /\b(?:B\.E\.?|BE|M\.E\.)(?=[\s,]|$)/.test(s);

const SEGMENT_SPLIT = /\t+|\s+[|•·]\s+|\s+[–—]\s+|\s+-\s+(?=[A-Z])/;

// --- Helpers -------------------------------------------------------------

const isBullet = (line: string) => BULLET_RE.test(line) && line.replace(BULLET_RE, "").trim().length > 0;
const stripBullet = (line: string) => line.replace(BULLET_RE, "").trim();
const tidy = (s: string) =>
  s
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,|•·–—-]+|[\s,|•·–—-]+$/g, "")
    .trim();

function titleCaseRatio(line: string): number {
  const words = line.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (!words.length) return 0;
  return words.filter((w) => /^[A-Z]/.test(w)).length / words.length;
}

function isContinuation(line: string, previous: string): boolean {
  if (RANGE_RE.test(line) || detectHeading(line)) return false;
  if (/^[a-z(]/.test(line)) return true;
  if (/[.!?:]$/.test(previous)) return false;
  // Long lines continue unless they read like a title; short wrapped tails ("45%", "2 days")
  // continue unless they look like a job title or company line.
  return line.length > 30 ? titleCaseRatio(line) < 0.6 : titleCaseRatio(line) < 0.5 && !line.includes("\t");
}

interface DateInfo {
  startDate: string;
  endDate: string;
  current: boolean;
  /** The line with the date text removed. */
  rest: string;
}

function extractDates(line: string): DateInfo | null {
  const range = line.match(RANGE_RE);
  if (range) {
    const current = /present|current|now|today|ongoing/i.test(range[2]);
    return {
      startDate: tidy(range[1]),
      endDate: current ? "" : tidy(range[2]),
      current,
      rest: tidy(line.replace(range[0], " ").replace(/\(\s*\)/g, "")),
    };
  }
  const single = line.match(SINGLE_DATE_RE);
  if (single) return { startDate: "", endDate: tidy(single[1]), current: false, rest: tidy(line.replace(single[1], " ").replace(/\(\s*\)/g, "")) };
  return null;
}

function segments(line: string): string[] {
  return line.split(SEGMENT_SPLIT).map(tidy).filter(Boolean);
}

interface Block {
  header: string[];
  bullets: string[];
}

/** Joins a wrapped line onto the previous one, keeping words hyphenated at the break ("GB-" + "scale"). */
const joinWrapped = (previous: string, next: string) => (/\p{L}-$/u.test(previous) ? `${previous}${next}` : `${previous} ${next}`);

/** A short title-case line after a finished sentence, e.g. "SQL Visualizer<tab>github.com". */
function looksLikeTitle(line: string, previous: string): boolean {
  const first = line.split("\t")[0].trim();
  return (
    first.split(/\s+/).length <= 8 &&
    !/[.!?,;:]$/.test(first) &&
    titleCaseRatio(first) >= 0.5 &&
    (/[.!?]$/.test(previous) || line.includes("\t"))
  );
}

/**
 * Splits a section into entries: header lines followed by bullet points.
 * With `glyphlessBullets`, long sentence-like lines in an entry's header are
 * treated as bullets whose bullet symbols were lost. With `titleStartsEntry`,
 * a title-like line starts a new entry even without bullets in between
 * (projects written as title + description paragraphs).
 */
function toBlocks(lines: string[], { glyphlessBullets = false, titleStartsEntry = false } = {}): Block[] {
  const blocks: Block[] = [];
  let cur: Block | null = null;
  for (const line of lines) {
    if (isBullet(line)) {
      if (!cur) {
        cur = { header: [], bullets: [] };
        blocks.push(cur);
      }
      cur.bullets.push(stripBullet(line));
      continue;
    }
    const last = cur?.bullets.at(-1);
    if (cur && last !== undefined && isContinuation(line, last)) {
      cur.bullets[cur.bullets.length - 1] = joinWrapped(last, line);
      continue;
    }
    const headerHasDate = cur?.header.some((h) => RANGE_RE.test(h)) ?? false;
    const startsNew =
      !cur ||
      cur.bullets.length > 0 ||
      (RANGE_RE.test(line) && headerHasDate) ||
      (titleStartsEntry && cur.header.length > 1 && looksLikeTitle(line, cur.header.at(-1)!));
    if (startsNew) {
      cur = { header: [line], bullets: [] };
      blocks.push(cur);
    } else {
      cur!.header.push(line);
    }
  }
  if (!glyphlessBullets) return blocks;
  for (const block of blocks) {
    const firstLong = block.header.findIndex((h, i) => i > 0 && h.length > 60 && !RANGE_RE.test(h));
    if (firstLong === -1) continue;
    // Everything from the first long line on is bullet text; re-join wrapped lines.
    const tail = block.header.splice(firstLong);
    const bullets: string[] = [];
    for (const line of tail) {
      const prev = bullets.at(-1);
      if (prev !== undefined && isContinuation(line, prev)) bullets[bullets.length - 1] = joinWrapped(prev, line);
      else bullets.push(line);
    }
    block.bullets.unshift(...bullets);
  }
  return blocks;
}

function assignRoleCompany(parts: string[]): { role: string; company: string } {
  // "Product Designer at Figma"
  const atSplit = parts[0]?.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (atSplit && (parts.length === 1 || ROLE_WORDS.test(atSplit[1]))) return { role: tidy(atSplit[1]), company: tidy(atSplit[2]) };
  // "Software Engineer, CloudFrame Inc." / "Acme Corp, Product Manager"
  if (parts.length === 1) {
    const comma = parts[0].match(/^([^,]+),\s+(.+)$/);
    if (comma) {
      const [, left, right] = comma;
      if (ROLE_WORDS.test(left) && !ROLE_WORDS.test(right)) return { role: tidy(left), company: tidy(right) };
      if (ROLE_WORDS.test(right) && !ROLE_WORDS.test(left)) return { role: tidy(right), company: tidy(left) };
    }
  }
  const [a = "", b = ""] = parts;
  const aRole = ROLE_WORDS.test(a);
  const bRole = ROLE_WORDS.test(b);
  if (!aRole && bRole) return { role: b, company: a };
  if (aRole && !bRole) return { role: a, company: b };
  if (COMPANY_WORDS.test(a) && !COMPANY_WORDS.test(b)) return { role: b, company: a };
  return { role: a, company: b };
}

// --- Section parsers -------------------------------------------------------

/**
 * "CloudFrame Inc. · Feb 2023 – Present" followed by several roles: an entry
 * with no bullets that precedes roles without a company is a company header.
 * Its company (and location) are copied to those roles and the header dropped.
 */
function applyCompanyHeaders(entries: Experience[]): Experience[] {
  const out: Experience[] = [];
  let group: { company: string; location: string } | null = null;
  entries.forEach((entry, i) => {
    const next = entries[i + 1];
    if (!entry.bullets.length && next && !next.company && next.role) {
      group = { company: entry.company || entry.role, location: entry.location };
      return;
    }
    if (group && !entry.company) out.push({ ...entry, company: group.company, location: entry.location || group.location });
    else {
      group = null;
      out.push(entry);
    }
  });
  return out;
}

function parseExperience(lines: string[]): Experience[] {
  const entries = toBlocks(lines, { glyphlessBullets: true })
    .map((block) => {
      let dates: DateInfo | null = null;
      let location = "";
      const parts: string[] = [];
      for (const line of block.header) {
        let text = line;
        if (!dates) {
          const found = extractDates(line);
          if (found && (found.startDate || found.current)) {
            dates = found;
            text = found.rest;
          }
        }
        for (const seg of segments(text)) {
          if (!location && LOCATION_RE.test(seg) && !COMPANY_WORDS.test(seg)) location = seg;
          else parts.push(seg);
        }
      }
      const { role, company } = assignRoleCompany(parts);
      return ExperienceSchema.parse({
        role: role.slice(0, 160),
        company: company.slice(0, 160),
        location: location.slice(0, 120),
        startDate: dates?.startDate ?? "",
        endDate: dates?.endDate ?? "",
        current: dates?.current ?? false,
        bullets: block.bullets.slice(0, 20).map((b) => b.slice(0, 1000)),
      });
    })
    .filter((e) => e.role || e.company || e.bullets.length);
  return applyCompanyHeaders(entries);
}

/**
 * Re-joins lines that were wrapped in a narrow column, e.g. "National Institute of Technology Karnataka · Surathkal," + "India".
 * A line is a fragment when it is short and carries no recognizable field of its own.
 */
function joinWrappedFragments(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const line = isBullet(raw) ? stripBullet(raw) : raw;
    const prev = out.at(-1);
    const isFragment =
      prev !== undefined &&
      !isBullet(raw) &&
      line.split(/\s+/).length <= 3 &&
      !INSTITUTION_RE.test(line) &&
      !isDegree(line) &&
      !RANGE_RE.test(line) &&
      !SINGLE_DATE_RE.test(line) &&
      !/gpa/i.test(line) &&
      !/[.!?]$/.test(prev);
    if (isFragment) out[out.length - 1] = `${prev} ${line}`;
    else out.push(line);
  }
  return out;
}

function parseEducation(lines: string[]): Education[] {
  const groups: string[][] = [];
  let cur: string[] | null = null;
  const has = (group: string[], test: (line: string) => boolean) => group.some(test);
  const isInstitution = (line: string) => INSTITUTION_RE.test(line);
  for (const line of joinWrappedFragments(lines)) {
    const startsNew =
      !cur ||
      (isInstitution(line) && has(cur, isInstitution)) ||
      (isDegree(line) && !isInstitution(line) && has(cur, isDegree) && has(cur, isInstitution));
    if (startsNew) {
      cur = [line];
      groups.push(cur);
    } else {
      cur!.push(line);
    }
  }

  return groups
    .map((group) => {
      let institution = "";
      let degreeLine = "";
      let location = "";
      let startDate = "";
      let endDate = "";
      let gpa = "";
      const details: string[] = [];
      for (const line of group) {
        let text = line;
        // "GPA: 3.8", "GPA 3.9/4.0", "CGPA 8.44/10"
        const gpaMatch = text.match(/\bC?GPA:?\s*(\d{1,2}(?:\.\d{1,2})?(?:\s*\/\s*(?:4|5|10)(?:\.0+)?)?)/i);
        if (gpaMatch) {
          gpa = gpaMatch[1].replace(/\s+/g, "").replace(/\/4(\.0+)?$/, "");
          text = tidy(text.replace(gpaMatch[0], " "));
        }
        if (!endDate) {
          const d = extractDates(text);
          if (d) {
            startDate = d.startDate;
            endDate = d.current ? "Present" : d.endDate;
            text = d.rest;
          }
        }
        // "Bachelor of Science in Statistics, University of Washington" holds two fields.
        const parts = segments(text).flatMap((seg) => (INSTITUTION_RE.test(seg) && isDegree(seg) ? seg.split(/,\s+(?=[A-Z])/) : [seg]));
        for (const seg of parts) {
          if (!institution && INSTITUTION_RE.test(seg)) institution = seg;
          else if (!degreeLine && isDegree(seg)) degreeLine = seg;
          else if (!location && LOCATION_RE.test(seg)) location = seg;
          else if (seg) details.push(seg);
        }
      }
      if (!institution && details.length) institution = details.shift()!;

      let degree = degreeLine;
      let field = "";
      const inSplit = degreeLine.match(/^(.+?)\s+(?:in|of)\s+(.+)$/i);
      if (inSplit && !/^(bachelor|master|doctor)s?$/i.test(inSplit[1].trim())) {
        degree = tidy(inSplit[1]);
        field = tidy(inSplit[2]);
      } else if (/^(bachelor|master|doctor)/i.test(degreeLine)) {
        const ofIn = degreeLine.match(/^((?:bachelor|master|doctor)\S*\s+(?:of|in)\s+\S+(?:\s+\S+)?)(?:\s+in\s+|,\s*)(.+)$/i);
        if (ofIn) {
          degree = tidy(ofIn[1]);
          field = tidy(ofIn[2]);
        }
      } else if (degreeLine.includes(",")) {
        const [d, ...f] = degreeLine.split(",");
        degree = tidy(d);
        field = tidy(f.join(","));
      }

      return EducationSchema.parse({
        institution: institution.slice(0, 200),
        degree: degree.slice(0, 160),
        field: field.slice(0, 160),
        location: location.slice(0, 120),
        startDate: startDate.slice(0, 40),
        endDate: endDate.slice(0, 40),
        gpa: gpa.slice(0, 20),
        details: details.join("; ").slice(0, 1000),
      });
    })
    .filter((e) => e.institution || e.degree);
}

function splitItems(text: string): string[] {
  return text
    .split(/[,;|•·]\s*|\t|\s{2,}/)
    .map((s) => tidy(s).replace(/\.$/, ""))
    .filter((s) => s.length > 0 && s.length <= 60);
}

function parseSkills(lines: string[], defaultName = "Skills"): SkillGroup[] {
  const groups: SkillGroup[] = [];
  let fallback: SkillGroup | null = null;
  let last: SkillGroup | null = null;
  let pendingName: string | null = null;

  const push = (name: string, items: string[]) => {
    const group = SkillGroupSchema.parse({ name: name.slice(0, 80), items: items.slice(0, 60) });
    groups.push(group);
    return group;
  };

  lines.forEach((raw, i) => {
    const line = isBullet(raw) ? stripBullet(raw) : raw;
    // "Languages: Java, Python" or a two-column table row "Languages<tab>Java, Python".
    const labelled = line.match(/^([^:,]{1,40}):\s*(.+)$/) ?? line.match(/^([^,\t]{1,40})\t+(.+)$/);
    if (labelled && labelled[1].trim().split(/\s+/).length <= 4) {
      last = push(tidy(labelled[1]), splitItems(labelled[2]));
      pendingName = null;
      return;
    }
    const next = lines[i + 1];
    const looksLikeLabel = line.split(/\s+/).length <= 3 && !/[,;]/.test(line) && !!next && /[,;]/.test(next) && !next.includes(":");
    if (looksLikeLabel) {
      pendingName = tidy(line);
      return;
    }
    const items = splitItems(line);
    if (pendingName) {
      last = push(pendingName, items);
      pendingName = null;
    } else if (last && /,\s*$/.test(lines[i - 1] ?? "")) {
      last.items.push(...items);
    } else {
      fallback ??= push(defaultName, []);
      fallback.items.push(...items);
      last = fallback;
    }
  });
  if (pendingName) push(defaultName, [pendingName]);
  return groups
    .map((g) => ({ ...g, items: [...new Set(g.items)].slice(0, 60) }))
    .filter((g) => g.items.length);
}

function parseProjects(lines: string[]): Project[] {
  return toBlocks(lines, { titleStartsEntry: true })
    .map((block) => {
      let link = "";
      const nameParts: string[] = [];
      const description: string[] = [];
      block.header.forEach((line, i) => {
        const url = line.match(GITHUB_RE)?.[0] ?? line.match(WEBSITE_RE)?.[0];
        if (url && !link) link = url;
        const rest = tidy((url ? line.replace(url, " ") : line).replace(RANGE_RE, " "));
        if (!rest) return;
        // Keep subtitles such as "— Finalist, Airbus Aerothon"; drop right-aligned extras.
        if (i === 0) nameParts.push(tidy(rest.split("\t")[0]));
        else description.push(rest);
      });
      return ProjectSchema.parse({
        name: (nameParts[0] ?? "").slice(0, 160),
        link: link.slice(0, 300),
        description: description.join(" ").slice(0, 1000),
        bullets: block.bullets.slice(0, 20).map((b) => b.slice(0, 1000)),
      });
    })
    .filter((p) => p.name || p.bullets.length);
}

/**
 * Project links are often shown as just "github.com" while the clickable link
 * holds the full URL. Assign unused link annotations, in order, to projects
 * whose link has no path.
 */
function attachProjectLinks(projects: Project[], links: string[], contact: { linkedin: string; github: string; website: string }): Project[] {
  const bare = (url: string) => url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();
  const used = new Set([contact.linkedin, contact.github, contact.website].filter(Boolean).map(bare));
  const spare = links.filter((l) => /^https?:/i.test(l) && !LINKEDIN_RE.test(l) && !used.has(bare(l)));
  // A link that is just the person's profile (or a bare domain) isn't the project's own link.
  const generic = (link: string) => !link.includes("/") || used.has(bare(link));
  return projects.map((p) => (generic(p.link) && spare.length ? { ...p, link: spare.shift()!.slice(0, 300) } : p));
}

// Tried in order so that dashes inside names (e.g. "Architect – Associate") survive.
const CERT_SEPARATORS = [/\s+[·|]\s+/, /\s+—\s+/, /,\s+/, /\s+[–-]\s+/];

function splitNameIssuer(text: string): [string, string] {
  const separator = CERT_SEPARATORS.find((re) => re.test(text));
  const [name = "", issuer = ""] = (separator ? text.split(separator) : [text]).map(tidy);
  return [name, issuer];
}

function parseCertifications(lines: string[]): Certification[] {
  // Only strip round bullets: a leading dash is often a wrapped name ("Architect" / "– Associate").
  const clean = lines.map((raw) => (/^[•·▪●◦]\s*/.test(raw) ? stripBullet(raw) : raw)).filter((line) => line.length > 2);
  const hasDate = (l: string) => RANGE_RE.test(l) || SINGLE_DATE_RE.test(l);

  // When entries carry dates, an entry ends at its dated line, which lets a
  // wrapped name ("AWS Certified Solutions" / "Architect – Associate") span lines.
  // Without dates, every line is its own entry.
  const entries: string[][] = [];
  if (clean.some(hasDate)) {
    let cur: string[] = [];
    for (const line of clean) {
      cur.push(line);
      if (hasDate(line)) {
        entries.push(cur);
        cur = [];
      }
    }
    if (cur.length) entries.push(...cur.map((l) => [l]));
  } else {
    entries.push(...clean.map((l) => [l]));
  }

  return entries
    .map((entry) => {
      const last = entry.at(-1)!;
      const d = extractDates(last);
      const lastText = d ? d.rest : last;
      let name: string;
      let issuer: string;
      if (entry.length > 1) {
        name = tidy(entry.slice(0, -1).join(" "));
        issuer = lastText;
      } else {
        [name, issuer] = splitNameIssuer(lastText);
      }
      return CertificationSchema.parse({
        name: name.slice(0, 200),
        issuer: issuer.slice(0, 160),
        date: (d ? d.endDate || d.startDate : "").slice(0, 40),
      });
    })
    .filter((c) => c.name);
}

// --- Contact block -------------------------------------------------------

interface Contact {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
}

function parseContact(header: string[], contactLines: string[], all: string[], links: string[]): Contact {
  // The header and any "Contact" block are the most reliable places for contact details.
  const priority = [...header, ...contactLines];
  const search = (re: RegExp) => {
    for (const line of [...priority, ...all]) {
      const m = line.match(re);
      if (m) return m[0];
    }
    return "";
  };
  const linkMatch = (re: RegExp) => links.find((l) => re.test(l)) ?? "";

  const email = search(EMAIL_RE) || linkMatch(/^mailto:/i).replace(/^mailto:/i, "");
  const linkedin = search(LINKEDIN_RE) || linkMatch(LINKEDIN_RE);
  const github = search(GITHUB_RE) || linkMatch(GITHUB_RE);

  let phone = "";
  for (const line of priority.length ? priority : all.slice(0, 8)) {
    const m = line.replace(EMAIL_RE, " ").match(PHONE_RE);
    if (m && m[0].replace(/\D/g, "").length >= 7 && !RANGE_RE.test(m[0])) {
      phone = m[0].trim();
      break;
    }
  }

  let website = "";
  for (const line of priority) {
    const cleaned = line.replace(EMAIL_RE, " ").replace(LINKEDIN_RE, " ").replace(GITHUB_RE, " ");
    const m = cleaned.match(WEBSITE_RE);
    if (m) {
      website = m[0];
      break;
    }
  }
  if (!website) website = links.find((l) => /^https?:/i.test(l) && !LINKEDIN_RE.test(l) && !GITHUB_RE.test(l)) ?? "";

  let location = "";
  for (const line of priority) {
    for (const seg of segments(line.replace(EMAIL_RE, " ").replace(PHONE_RE, " "))) {
      if (LOCATION_RE.test(seg) && !/remote|hybrid/i.test(seg)) {
        location = seg;
        break;
      }
    }
    if (location) break;
  }

  const isContactLine = (l: string) =>
    EMAIL_RE.test(l) || LINKEDIN_RE.test(l) || GITHUB_RE.test(l) || WEBSITE_RE.test(l) || (PHONE_RE.test(l) && l.replace(/\D/g, "").length >= 7);

  let fullName = "";
  let headline = "";
  for (const line of header) {
    const first = segments(line)[0] ?? "";
    if (!fullName) {
      const words = first.split(/\s+/);
      // A name starts with a capital letter and isn't a contact detail or a "City, ST" location.
      const looksLikeName = /^\p{Lu}/u.test(first) && /^[\p{L} .'-]+$/u.test(first) && !LOCATION_RE.test(first);
      if (!isContactLine(first) && !/\d/.test(first) && words.length >= 1 && words.length <= 5 && looksLikeName) {
        fullName = first;
      }
      continue;
    }
    if (!headline && !isContactLine(line) && !LOCATION_RE.test(first) && first.split(/\s+/).length <= 12) {
      // Keep multi-part headlines such as "Software Developer · Java · Spring Boot".
      headline = line.includes("\t") ? first : tidy(line);
      break;
    }
  }
  // Names set in all caps by the template ("ALEX MORGAN") read better in title case.
  if (fullName && fullName === fullName.toUpperCase()) {
    fullName = fullName.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (c) => c.toUpperCase());
  }
  return { fullName, headline, email, phone, location, website, linkedin, github };
}

// --- Entry point -----------------------------------------------------------

export interface ParseResult {
  data: ResumeData;
  warnings: string[];
  /** Number of recognized section headings. */
  sectionsFound: number;
}

/** Rough measure of how much structure was recovered, for comparing parses. */
export function parseQuality({ data, sectionsFound }: ParseResult): number {
  return (
    sectionsFound * 3 +
    (data.personal.fullName ? 3 : 0) +
    (data.personal.email ? 1 : 0) +
    Math.min(data.experience.filter((e) => e.role || e.company).length, 6) * 2 +
    Math.min(data.education.length, 3) +
    Math.min(data.skills.length, 4)
  );
}

/**
 * Detects text that exists visually but not in the PDF's text layer (drawn as
 * shapes). It leaves telltale gaps: "improving throughput by ." or a
 * mid-sentence jump such as "memory —<gap>, and comparisons".
 */
export function looksLikeMissingText(lines: string[]): boolean {
  let signals = 0;
  for (const line of lines) {
    if (/\b(by|of|to|with|from|at|in|for|the|a|an)\s+[.,;:]/i.test(line)) signals++;
    if (/\b(by|of|to|with|from|the|a|an)\s+(and|or|to|in|with|of|the)\b/i.test(line)) signals++;
    // A column gap followed by punctuation or a connecting word (not e.g. "\tgithub.com").
    if (/\t(?:[,.;:)]|(?:and|or|the|of|to|with|for|that|which)\b)/.test(line)) signals++;
  }
  return signals >= 2;
}

export function parseResumeText(rawLines: string[], links: string[] = []): ParseResult {
  const lines = rawLines
    // Icon fonts (e.g. Font Awesome link/phone icons) use private-use code points.
    .map((l) => l.replace(/[\uE000-\uF8FF]/g, "").replace(/\u00a0/g, " ").replace(/ {2,}/g, " ").trim())
    .filter((l) => l && !/^(page\s*)?\d+(\s*(of|\/)\s*\d+)?$/i.test(l));

  const header: string[] = [];
  const sections = new Map<SectionId, string[]>();
  let current: SectionId | null = null;
  for (const line of lines) {
    const heading = detectHeading(line.replace(/:$/, ""));
    if (heading) {
      current = heading;
      if (!sections.has(heading)) sections.set(heading, []);
      continue;
    }
    if (current) sections.get(current)!.push(line);
    else header.push(line);
  }

  const contact = parseContact(header, sections.get("contact") ?? [], lines, links);
  const warnings: string[] = [];
  const get = (id: SectionId) => sections.get(id) ?? [];

  const experience = [...parseExperience(get("experience")), ...parseExperience(get("volunteer"))];
  const skills = [
    ...parseSkills(get("skills")),
    ...parseSkills(get("languages"), "Languages").map((g) => ({ ...g, name: g.name === "Skills" ? "Languages" : g.name })),
    ...parseSkills(get("interests"), "Interests"),
  ];

  let summary = get("summary").map((l) => (isBullet(l) ? stripBullet(l) : l)).join(" ");
  if (!sections.size) {
    warnings.push("No standard section headings were found, so the text was placed in the summary. Please review and move it into the right sections.");
    summary = header.slice(2).join(" ");
  }

  const data = ResumeDataSchema.parse({
    personal: {
      fullName: contact.fullName.slice(0, 120),
      headline: contact.headline.slice(0, 160),
      email: contact.email.slice(0, 200),
      phone: contact.phone.slice(0, 60),
      location: contact.location.slice(0, 120),
      website: contact.website.slice(0, 300),
      linkedin: contact.linkedin.slice(0, 300),
      github: contact.github.slice(0, 300),
    },
    summary: summary.replace(/\s+/g, " ").trim().slice(0, 3000),
    experience: experience.slice(0, 30),
    education: parseEducation(get("education")).slice(0, 20),
    skills: skills.slice(0, 20),
    projects: attachProjectLinks(parseProjects(get("projects")), links, contact).slice(0, 20),
    certifications: [...parseCertifications(get("certifications")), ...parseCertifications(get("awards"))].slice(0, 30),
  });

  if (!data.personal.fullName) warnings.push("Couldn't detect your name. Please add it in Personal details.");
  if (!data.personal.email) warnings.push("Couldn't detect an email address.");
  if (!data.experience.length && sections.size) warnings.push("No work experience entries were detected. Please check the Experience step.");
  return { data, warnings, sectionsFound: sections.size };
}
