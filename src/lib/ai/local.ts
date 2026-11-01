// Offline writing assistant used when no AI provider is configured (or the
// platform quota is exhausted). Rule-based, deterministic and free.

import { scoreResume } from "@/lib/ats/scorer";
import { stemPhrase } from "@/lib/ats/keywords";
import { WEAK_REPLACEMENTS } from "@/lib/ats/lexicon";
import { nonEmpty } from "@/lib/resume/format";
import { parseResumeData } from "@/lib/resume/schema";
import type { AiResult, AiTask } from "./tasks";

type RoleFamily = "engineering" | "data" | "design" | "management" | "sales" | "operations" | "general";

const FAMILY_PATTERNS: [RoleFamily, RegExp][] = [
  ["data", /\b(data|analyst|analytics|scientist|machine learning|ml|bi)\b/i],
  ["engineering", /\b(engineer|developer|programmer|architect|devops|sre|software|frontend|backend|full[- ]?stack|qa)\b/i],
  ["design", /\b(design|designer|ux|ui|creative|art director)\b/i],
  ["management", /\b(manager|director|head|vp|vice president|chief|lead|supervisor|principal)\b/i],
  ["sales", /\b(sales|account|marketing|growth|business development|seo|brand|content)\b/i],
  ["operations", /\b(operations|coordinator|assistant|administrator|support|specialist|associate|hr|recruiter)\b/i],
];

const BULLET_TEMPLATES: Record<RoleFamily, string[]> = {
  engineering: [
    "Designed and shipped [feature/service] used by [N] users, improving [metric] by [X%]",
    "Reduced page load / API latency by [X%] by profiling bottlenecks and optimizing [component]",
    "Automated [manual process] with [tool], saving the team [N] hours per week",
    "Refactored [legacy module] to improve test coverage from [X%] to [Y%] and cut defects by [Z%]",
    "Collaborated with product and design to deliver [project] [N] weeks ahead of schedule",
    "Mentored [N] engineers through code reviews and pairing, raising team delivery velocity by [X%]",
  ],
  data: [
    "Built [dashboard/model] in [tool] that informed [decision], driving [X%] improvement in [metric]",
    "Analyzed [N]+ records to identify [insight], leading to [business outcome]",
    "Automated reporting pipeline with [SQL/Python], cutting turnaround time from [X] days to [Y] hours",
    "Developed predictive model achieving [X%] accuracy for [use case]",
    "Partnered with stakeholders to define KPIs and A/B tests for [product area]",
    "Improved data quality by [X%] by implementing validation checks across [N] sources",
  ],
  design: [
    "Redesigned [product flow], increasing conversion by [X%] and reducing drop-off by [Y%]",
    "Led user research with [N] participants to uncover [insight] that shaped the [product] roadmap",
    "Built and maintained a design system of [N] components adopted by [N] teams",
    "Delivered high-fidelity prototypes in Figma for [N] features, shortening review cycles by [X%]",
    "Partnered with engineering to ship [feature] used by [N] customers",
    "Ran usability tests that improved task success rate from [X%] to [Y%]",
  ],
  management: [
    "Led a team of [N] to deliver [initiative], growing [metric] by [X%] year over year",
    "Managed a [₹X] budget and reduced costs by [X%] through [action]",
    "Hired and developed [N] team members, improving retention by [X%]",
    "Defined and executed [strategy/roadmap] aligned with company OKRs, achieving [result]",
    "Introduced [process] that increased team productivity by [X%]",
    "Partnered with [departments] to launch [product/program] reaching [N] customers",
  ],
  sales: [
    "Exceeded quarterly quota by [X%], generating [₹X] in new revenue",
    "Built a pipeline of [N] qualified leads through [channel], increasing conversion by [X%]",
    "Launched [campaign] that grew [traffic/engagement] by [X%] in [N] months",
    "Managed a portfolio of [N] accounts worth [₹X], achieving a [X%] renewal rate",
    "Negotiated contracts with [N] enterprise clients, shortening the sales cycle by [X] days",
    "Analyzed campaign performance to reallocate budget, improving ROI by [X%]",
  ],
  operations: [
    "Streamlined [process], reducing turnaround time by [X%] and errors by [Y%]",
    "Coordinated [N] cross-functional projects, delivering all on time and within budget",
    "Resolved [N]+ customer or internal requests per week while maintaining a [X%] satisfaction score",
    "Implemented [tool/system] that saved [N] hours per month",
    "Maintained accurate records for [N] [items/accounts], passing [audit] with zero findings",
    "Trained [N] new team members on [process/tools]",
  ],
  general: [
    "Delivered [project/result] that improved [metric] by [X%]",
    "Streamlined [process], saving [N] hours per week",
    "Collaborated with [teams] to launch [initiative] reaching [N] people",
    "Identified and resolved [problem], reducing [cost/time/errors] by [X%]",
    "Recognized for [achievement] among [N] peers",
    "Trained and supported [N] colleagues on [skill/process]",
  ],
};

function roleFamily(role: string): RoleFamily {
  return FAMILY_PATTERNS.find(([, re]) => re.test(role))?.[0] ?? "general";
}

const IRREGULAR_PAST: Record<string, string> = {
  leading: "Led",
  building: "Built",
  running: "Ran",
  writing: "Wrote",
  making: "Made",
  selling: "Sold",
  teaching: "Taught",
  driving: "Drove",
  growing: "Grew",
  overseeing: "Oversaw",
  setting: "Set",
  bringing: "Brought",
  winning: "Won",
  cutting: "Cut",
  spending: "Spent",
  getting: "Got",
};

function gerundToPast(word: string): string | null {
  const lower = word.toLowerCase();
  if (!/^[a-z]{4,}ing$/.test(lower)) return null;
  if (IRREGULAR_PAST[lower]) return IRREGULAR_PAST[lower];
  const base = lower.slice(0, -3);
  const past = base.endsWith("e") ? `${base}d` : `${base}ed`;
  return past.charAt(0).toUpperCase() + past.slice(1);
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function improveBulletLocally(input: string): string {
  let b = input
    .trim()
    .replace(/^[-•*▪◦●‣–]\s*/, "")
    .replace(/\.$/, "")
    .replace(/^(i|we)\s+/i, "")
    .replace(/\b(my|our)\s+/gi, "");

  const lower = b.toLowerCase();
  const weak = Object.keys(WEAK_REPLACEMENTS)
    .sort((a, b2) => b2.length - a.length)
    .find((w) => lower.startsWith(`${w} `) || lower === w);
  if (weak) {
    const rest = b.slice(weak.length).trim();
    const [next, ...others] = rest.split(/\s+/);
    const past = next ? gerundToPast(next) : null;
    b = past ? [past, ...others].join(" ") : `${WEAK_REPLACEMENTS[weak]} ${rest}`;
  } else {
    const [first, ...others] = b.split(/\s+/);
    const past = first ? gerundToPast(first) : null;
    if (past) b = [past, ...others].join(" ");
  }

  b = capitalize(b.replace(/\s+/g, " ").trim());
  if (!/\d|\[/.test(b)) b += ", resulting in [quantified impact, e.g. X% faster or ₹Y saved]";
  return b;
}

function estimateYears(data: ReturnType<typeof parseResumeData>): number | null {
  const years = data.experience
    .map((e) => Number(e.startDate.match(/(19|20)\d{2}/)?.[0]))
    .filter((y) => Number.isFinite(y) && y > 1950);
  if (!years.length) return null;
  const span = new Date().getFullYear() - Math.min(...years);
  return span > 0 ? span : null;
}

function localSummary(resumeInput: unknown, targetRole: string): string {
  const data = parseResumeData(resumeInput);
  const title = data.personal.headline || data.experience[0]?.role || targetRole || "professional";
  const years = estimateYears(data);
  const skills = data.skills.flatMap((g) => nonEmpty(g.items)).slice(0, 4);
  const highlight = data.experience.flatMap((e) => nonEmpty(e.bullets)).find((b) => /\d/.test(b));

  const sentences = [
    years ? `${capitalize(title)} with ${years}+ years of experience delivering measurable results.` : `Results-driven ${title.toLowerCase()} focused on delivering measurable results.`,
  ];
  if (skills.length) {
    const list = skills.length > 1 ? `${skills.slice(0, -1).join(", ")} and ${skills.at(-1)}` : skills[0];
    sentences.push(`Skilled in ${list}.`);
  }
  if (highlight) sentences.push(`Track record includes: ${highlight.charAt(0).toLowerCase()}${highlight.slice(1).replace(/\.$/, "")}.`);
  if (targetRole) sentences.push(`Eager to bring this expertise to a ${targetRole} role.`);
  return sentences.join(" ");
}

function localTailor(resumeInput: unknown, jobDescription: string): string[] {
  const data = parseResumeData(resumeInput);
  const report = scoreResume(data, jobDescription);
  const suggestions: string[] = [];

  for (const kw of report.missingKeywords.filter((k) => k.importance !== "low").slice(0, 4)) {
    suggestions.push(
      kw.isSkill
        ? `If you have experience with ${kw.display}, add it to your Skills section and mention it in a relevant bullet (the posting mentions it ${kw.count}×).`
        : `The posting emphasizes “${kw.display}”. Reflect it in your summary or a bullet point if it matches your experience.`,
    );
  }

  const title = jobDescription
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && l.split(/\s+/).length <= 8 && !/[.:]$/.test(l));
  if (title && !data.personal.headline.toLowerCase().includes(title.toLowerCase())) {
    suggestions.push(`Consider aligning your headline with the job title “${title}” if it accurately reflects your experience.`);
  }

  const summaryStems = ` ${stemPhrase(data.summary)} `;
  const topMatched = report.matchedKeywords.filter((k) => !summaryStems.includes(` ${k.key} `)).slice(0, 3);
  if (topMatched.length) {
    suggestions.push(`Mention ${topMatched.map((k) => k.display).join(", ")} in your summary; they are key requirements you already meet.`);
  }
  if (report.weakBullets.length) {
    suggestions.push(`Rewrite ${report.weakBullets.length} bullet(s) to open with strong action verbs, e.g. “${improveBulletLocally(report.weakBullets[0].bullet)}”.`);
  }
  if (report.stats.bulletCount && report.stats.quantifiedBullets / report.stats.bulletCount < 0.5) {
    suggestions.push("Add numbers to more bullets (revenue, %, time saved, users, team size) to show the scale of your impact.");
  }
  if (!suggestions.length) suggestions.push("Your resume already covers the main requirements. Fine-tune wording to mirror the posting's language.");
  return suggestions;
}

export function runLocalTask(task: AiTask): AiResult {
  switch (task.type) {
    case "bullets": {
      const existing = new Set(task.existing.map((b) => b.trim().toLowerCase()));
      const templates = BULLET_TEMPLATES[roleFamily(`${task.role} ${task.context}`)];
      return { type: "bullets", bullets: templates.filter((t) => !existing.has(t.toLowerCase())).slice(0, 4) };
    }
    case "improve":
      return { type: "improve", bullet: improveBulletLocally(task.bullet) };
    case "summary":
      return { type: "summary", summary: localSummary(task.resume, task.targetRole) };
    case "tailor":
      return { type: "tailor", suggestions: localTailor(task.resume, task.jobDescription) };
  }
}
