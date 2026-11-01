import type { Education, Experience, ResumeData } from "./schema";

export function formatDateRange(start: string, end: string, current = false): string {
  const finish = current ? "Present" : end;
  if (start && finish) return `${start} – ${finish}`;
  return start || finish || "";
}

export function experienceDates(item: Experience): string {
  return formatDateRange(item.startDate, item.endDate, item.current);
}

export function educationTitle(item: Education): string {
  if (item.degree && item.field) return `${item.degree} in ${item.field}`;
  return item.degree || item.field;
}

/** Strips protocol and trailing slash for compact display of links. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

export function contactItems(data: ResumeData): string[] {
  return contactEntries(data).map((c) => c.text);
}

export type ContactKind = "email" | "phone" | "location" | "website" | "linkedin" | "github";

/** Contact details in display order, with their kind (used to pick an icon). */
export function contactEntries(data: ResumeData): { kind: ContactKind; text: string }[] {
  const p = data.personal;
  const entries: [ContactKind, string][] = [
    ["email", p.email],
    ["phone", p.phone],
    ["location", p.location],
    ["website", p.website],
    ["linkedin", p.linkedin],
    ["github", p.github],
  ];
  return entries.filter(([, v]) => v.trim()).map(([kind, v]) => ({ kind, text: displayUrl(v.trim()) }));
}

export function nonEmpty(values: string[]): string[] {
  return values.map((v) => v.trim()).filter(Boolean);
}

/** Flattens a resume into plain text, used for ATS keyword matching and AI prompts. */
export function resumeToPlainText(data: ResumeData): string {
  const lines: string[] = [];
  const p = data.personal;
  lines.push(p.fullName, p.headline, contactItems(data).join(" | "));
  if (data.summary) lines.push("SUMMARY", data.summary);
  if (data.experience.length) {
    lines.push("EXPERIENCE");
    for (const e of data.experience) {
      lines.push([e.role, e.company, e.location, experienceDates(e)].filter(Boolean).join(" | "));
      lines.push(...nonEmpty(e.bullets).map((b) => `- ${b}`));
    }
  }
  if (data.projects.length) {
    lines.push("PROJECTS");
    for (const pr of data.projects) {
      lines.push([pr.name, pr.link].filter(Boolean).join(" | "));
      if (pr.description) lines.push(pr.description);
      lines.push(...nonEmpty(pr.bullets).map((b) => `- ${b}`));
    }
  }
  if (data.education.length) {
    lines.push("EDUCATION");
    for (const ed of data.education) {
      lines.push(
        [educationTitle(ed), ed.institution, formatDateRange(ed.startDate, ed.endDate)].filter(Boolean).join(" | "),
      );
      if (ed.details) lines.push(ed.details);
    }
  }
  if (data.skills.length) {
    lines.push("SKILLS");
    for (const g of data.skills) {
      const items = nonEmpty(g.items).join(", ");
      if (items) lines.push(g.name ? `${g.name}: ${items}` : items);
    }
  }
  if (data.certifications.length) {
    lines.push("CERTIFICATIONS");
    for (const c of data.certifications) lines.push([c.name, c.issuer, c.date].filter(Boolean).join(" | "));
  }
  return lines.filter((l) => l && l.trim()).join("\n");
}

/** All bullet points across experience and projects. */
export function allBullets(data: ResumeData): string[] {
  return [...data.experience.flatMap((e) => e.bullets), ...data.projects.flatMap((p) => p.bullets)]
    .map((b) => b.trim())
    .filter(Boolean);
}
