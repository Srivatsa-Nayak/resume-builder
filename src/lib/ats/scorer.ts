import type { ResumeData } from "@/lib/resume/schema";
import { allBullets, nonEmpty, resumeToPlainText } from "@/lib/resume/format";
import { buildTextIndex, extractJobKeywords, textHasKeyword, type JobKeyword } from "./keywords";
import { ACTION_VERBS, FIRST_PERSON, WEAK_PHRASES } from "./lexicon";

export type CheckCategory = "completeness" | "formatting";

export interface AtsCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  category: CheckCategory;
  weight: number;
}

export interface CategoryScore {
  id: "keywords" | "impact" | "completeness" | "formatting";
  label: string;
  score: number;
  weight: number;
}

export interface WeakBullet {
  bullet: string;
  reason: string;
}

export interface AtsReport {
  score: number;
  hasJobDescription: boolean;
  categories: CategoryScore[];
  matchedKeywords: JobKeyword[];
  missingKeywords: JobKeyword[];
  checks: AtsCheck[];
  weakBullets: WeakBullet[];
  suggestions: string[];
  stats: {
    wordCount: number;
    bulletCount: number;
    strongVerbBullets: number;
    quantifiedBullets: number;
  };
}

const IMPORTANCE_WEIGHT = { high: 3, medium: 2, low: 1 } as const;
const QUANTIFIED = /(\d|\$|₹|%|\blakh|\bcrore|\bone\b|\btwo\b|\bthree\b|\bfour\b|\bfive\b|\bten\b|\bdozen|\bhundred|\bthousand|\bmillion|\bbillion)/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function firstWord(bullet: string): string {
  return (bullet.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z-]/g, "");
}

export function startsWithActionVerb(bullet: string): boolean {
  const word = firstWord(bullet);
  if (!word) return false;
  return ACTION_VERBS.has(word) || ACTION_VERBS.has(`${word}d`) || ACTION_VERBS.has(`${word}ed`) || ACTION_VERBS.has(word.replace(/s$/, ""));
}

export function findWeakPhrase(bullet: string): string | null {
  const lower = bullet.toLowerCase();
  return WEAK_PHRASES.find((p) => new RegExp(`(^|\\W)${p}(\\W|$)`).test(lower)) ?? null;
}

type DateStyle = "month-name" | "numeric" | "year" | "other";
function dateStyle(value: string): DateStyle | null {
  const v = value.trim();
  if (!v || /^(present|current|now)$/i.test(v)) return null;
  if (/^[A-Za-z]{3,9}\.?\s+\d{4}$/.test(v)) return "month-name";
  if (/^\d{1,2}[/.-]\d{4}$/.test(v)) return "numeric";
  if (/^\d{4}$/.test(v)) return "year";
  return "other";
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

function buildChecks(data: ResumeData, wordCount: number, bullets: string[]): AtsCheck[] {
  const p = data.personal;
  const checks: AtsCheck[] = [];
  const push = (c: Omit<AtsCheck, "passed"> & { passed: boolean }) => checks.push(c);
  const skillCount = data.skills.reduce((n, g) => n + nonEmpty(g.items).length, 0);
  const roles = data.experience.filter((e) => e.role || e.company);

  push({ id: "name", category: "completeness", weight: 3, label: "Full name", passed: !!p.fullName, detail: "Add your full name at the top of the resume." });
  push({ id: "email", category: "completeness", weight: 3, label: "Valid email address", passed: EMAIL.test(p.email), detail: "Add a professional email address so recruiters can reach you." });
  push({ id: "phone", category: "completeness", weight: 2, label: "Phone number", passed: p.phone.replace(/\D/g, "").length >= 7, detail: "Add a phone number." });
  push({ id: "location", category: "completeness", weight: 1, label: "Location", passed: !!p.location, detail: "Add your city and state/country; many ATS filters search by location." });
  push({ id: "links", category: "completeness", weight: 1, label: "LinkedIn or portfolio link", passed: !!(p.linkedin || p.website || p.github), detail: "Add a LinkedIn profile or portfolio link." });
  push({ id: "summary", category: "completeness", weight: 2, label: "Professional summary", passed: words(data.summary) >= 20, detail: "Write a 2–4 sentence summary (at least 20 words) highlighting your experience and strengths." });
  push({ id: "experience", category: "completeness", weight: 3, label: "Work experience", passed: roles.length > 0, detail: "Add at least one position to the Experience section." });
  push({
    id: "experience-dates",
    category: "completeness",
    weight: 2,
    label: "Dates on every position",
    passed: roles.length > 0 && roles.every((e) => e.startDate && (e.endDate || e.current)),
    detail: "Give every position a start and end date (or mark it as current). ATS systems use dates to calculate experience.",
  });
  push({
    id: "experience-bullets",
    category: "completeness",
    weight: 2,
    label: "At least 2 bullet points per position",
    passed: roles.length > 0 && roles.every((e) => nonEmpty(e.bullets).length >= 2),
    detail: "Describe each role with 2–6 achievement-focused bullet points.",
  });
  push({ id: "education", category: "completeness", weight: 2, label: "Education", passed: data.education.some((e) => e.institution || e.degree), detail: "Add your education (degree and institution)." });
  push({ id: "skills", category: "completeness", weight: 2, label: "At least 6 skills listed", passed: skillCount >= 6, detail: `List at least 6 relevant skills (you have ${skillCount}). Skills sections are heavily weighted by ATS keyword searches.` });

  push({
    id: "length",
    category: "formatting",
    weight: 2,
    label: "Resume length (250–1,000 words)",
    passed: wordCount >= 250 && wordCount <= 1000,
    detail:
      wordCount < 250
        ? `Your resume has ${wordCount} words. Aim for at least 250 so there is enough content to match against.`
        : `Your resume has ${wordCount} words. Trim to under 1,000 so it fits on 1–2 pages.`,
  });
  const longBullets = bullets.filter((b) => words(b) > 35);
  push({ id: "bullet-length", category: "formatting", weight: 2, label: "Concise bullet points (≤ 35 words)", passed: longBullets.length === 0, detail: `${longBullets.length} bullet point(s) are longer than 35 words. Split or tighten them.` });
  const firstPerson = [data.summary, ...bullets].some((t) => FIRST_PERSON.test(t));
  push({ id: "pronouns", category: "formatting", weight: 1, label: "No first-person pronouns", passed: !firstPerson, detail: "Remove “I”, “me” and “my”. Resumes are conventionally written without pronouns." });
  const styles = new Set(
    data.experience.flatMap((e) => [dateStyle(e.startDate), dateStyle(e.endDate)]).filter((s): s is DateStyle => s !== null),
  );
  push({ id: "date-format", category: "formatting", weight: 1, label: "Consistent date format", passed: styles.size <= 1 && !styles.has("other"), detail: "Use one date format everywhere, e.g. “Jan 2022 – Mar 2024”." });
  push({ id: "summary-length", category: "formatting", weight: 1, label: "Summary under 100 words", passed: words(data.summary) <= 100, detail: "Keep your summary under 100 words; recruiters skim it in seconds." });
  push({
    id: "bullets-per-role",
    category: "formatting",
    weight: 1,
    label: "No more than 8 bullets per position",
    passed: data.experience.every((e) => nonEmpty(e.bullets).length <= 8),
    detail: "Limit each position to 8 bullets; keep the most impressive ones.",
  });
  return checks;
}

function checksScore(checks: AtsCheck[], category: CheckCategory): number {
  const list = checks.filter((c) => c.category === category);
  const total = list.reduce((n, c) => n + c.weight, 0);
  const passed = list.filter((c) => c.passed).reduce((n, c) => n + c.weight, 0);
  return total ? (passed / total) * 100 : 0;
}

/**
 * Scores a resume for ATS compatibility. When a job description is provided,
 * keyword coverage becomes the largest factor.
 */
export function scoreResume(data: ResumeData, jobDescription = ""): AtsReport {
  const text = resumeToPlainText(data);
  const wordCount = words(text);
  const bullets = allBullets(data);
  const checks = buildChecks(data, wordCount, bullets);

  // Impact: action verbs, weak phrasing and quantified results.
  const weakBullets: WeakBullet[] = [];
  let strong = 0;
  let quantified = 0;
  let weakPhrases = 0;
  for (const b of bullets) {
    const isStrong = startsWithActionVerb(b);
    const weak = findWeakPhrase(b);
    if (isStrong) strong += 1;
    if (QUANTIFIED.test(b)) quantified += 1;
    if (weak) {
      weakPhrases += 1;
      weakBullets.push({ bullet: b, reason: `Uses the weak phrase “${weak}”.` });
    } else if (!isStrong) {
      weakBullets.push({ bullet: b, reason: "Doesn't start with a strong action verb." });
    }
  }
  const verbScore = bullets.length ? clamp((strong / bullets.length) * 100 - weakPhrases * 5) : 0;
  const quantScore = bullets.length ? clamp((quantified / bullets.length / 0.5) * 100) : 0;
  const impact = 0.6 * verbScore + 0.4 * quantScore;

  // Keywords from the job description.
  const keywords = jobDescription.trim() ? extractJobKeywords(jobDescription) : [];
  const hasJobDescription = keywords.length >= 3;
  const index = buildTextIndex(text);
  const matchedKeywords: JobKeyword[] = [];
  const missingKeywords: JobKeyword[] = [];
  for (const kw of keywords) (textHasKeyword(index, kw) ? matchedKeywords : missingKeywords).push(kw);
  const totalWeight = keywords.reduce((n, k) => n + IMPORTANCE_WEIGHT[k.importance], 0);
  const matchedWeight = matchedKeywords.reduce((n, k) => n + IMPORTANCE_WEIGHT[k.importance], 0);
  const keywordScore = totalWeight ? (matchedWeight / totalWeight) * 100 : 0;

  const completeness = checksScore(checks, "completeness");
  const formatting = checksScore(checks, "formatting");

  const categories: CategoryScore[] = hasJobDescription
    ? [
        { id: "keywords", label: "Keyword match", score: clamp(keywordScore), weight: 40 },
        { id: "impact", label: "Impact & action verbs", score: clamp(impact), weight: 25 },
        { id: "completeness", label: "Completeness", score: clamp(completeness), weight: 20 },
        { id: "formatting", label: "Formatting & length", score: clamp(formatting), weight: 15 },
      ]
    : [
        { id: "impact", label: "Impact & action verbs", score: clamp(impact), weight: 40 },
        { id: "completeness", label: "Completeness", score: clamp(completeness), weight: 35 },
        { id: "formatting", label: "Formatting & length", score: clamp(formatting), weight: 25 },
      ];
  const score = clamp(categories.reduce((n, c) => n + (c.score * c.weight) / 100, 0));

  const suggestions: string[] = [];
  const missingImportant = missingKeywords.filter((k) => k.importance !== "low").slice(0, 6);
  if (missingImportant.length) {
    suggestions.push(
      `Work these job-description keywords into your experience or skills (only where truthful): ${missingImportant.map((k) => k.display).join(", ")}.`,
    );
  }
  for (const c of checks.filter((c) => !c.passed).sort((a, b) => b.weight - a.weight)) suggestions.push(c.detail);
  if (bullets.length && quantified / bullets.length < 0.5) {
    suggestions.push(`Only ${quantified} of ${bullets.length} bullets include numbers. Quantify results (%, $, time saved, users, team size).`);
  }
  if (weakBullets.length) {
    suggestions.push(`${weakBullets.length} bullet(s) could start with a stronger action verb such as “Led”, “Built”, “Reduced” or “Increased”.`);
  }

  return {
    score,
    hasJobDescription,
    categories,
    matchedKeywords,
    missingKeywords,
    checks,
    weakBullets,
    suggestions,
    stats: { wordCount, bulletCount: bullets.length, strongVerbBullets: strong, quantifiedBullets: quantified },
  };
}
