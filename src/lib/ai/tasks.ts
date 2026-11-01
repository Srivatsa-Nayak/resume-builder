import { z } from "zod";
import { resumeToPlainText } from "@/lib/resume/format";
import { ResumeDataSchema, type ResumeData } from "@/lib/resume/schema";

/** Requests the editor can send to the AI endpoint. */
export const AiTaskSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("bullets"),
    kind: z.enum(["job", "project"]).default("job"),
    role: z.string().trim().min(1, "Add a title first").max(160),
    company: z.string().max(160).default(""),
    context: z.string().max(2000).default(""),
    existing: z.array(z.string().max(1000)).max(20).default([]),
    current: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("improve"),
    bullet: z.string().trim().min(3, "Write a bullet point first").max(1000),
    role: z.string().max(160).default(""),
  }),
  z.object({
    type: z.literal("summary"),
    resume: z.unknown(),
    targetRole: z.string().max(160).default(""),
  }),
  z.object({
    type: z.literal("tailor"),
    resume: z.unknown(),
    jobDescription: z.string().trim().min(50, "Paste a longer job description").max(20000),
  }),
]);

export type AiTask = z.infer<typeof AiTaskSchema>;
export type AiTaskType = AiTask["type"];

export type AiResult =
  | { type: "bullets"; bullets: string[] }
  | { type: "improve"; bullet: string }
  | { type: "summary"; summary: string }
  | { type: "tailor"; suggestions: string[] };

export const SYSTEM_PROMPT = `You are an expert resume writer and career coach. You write concise, achievement-focused, ATS-friendly resume content.
Rules:
- Never invent employers, job titles, degrees, certifications, or specific facts the user did not provide.
- When a metric would strengthen a statement but is unknown, use a bracketed placeholder such as [X%] or [N users] for the user to fill in.
- Do not use first-person pronouns (I, me, my).
- Follow the requested output format exactly, with no preamble or commentary.`;

const clip = (s: string, max: number) => (s.length > max ? `${s.slice(0, max)}…` : s);

export function buildPrompt(task: AiTask, resume?: ResumeData): string {
  switch (task.type) {
    case "bullets":
      return [
        task.kind === "project"
          ? `Write 4 resume bullet points describing the project "${task.role}".`
          : `Write 4 resume bullet points for the role "${task.role}"${task.company ? ` at "${task.company}"` : ""}.`,
        task.context ? `Context from the candidate:\n${clip(task.context, 2000)}` : "",
        task.existing.filter(Boolean).length
          ? `Existing bullets (do not repeat them):\n${task.existing.filter(Boolean).map((b) => `- ${b}`).join("\n")}`
          : "",
        `Each bullet must start with a strong ${task.current ? "present-tense" : "past-tense"} action verb, be at most 25 words, and show impact with a number or a placeholder. No trailing periods.`,
        `Respond with JSON only, in this shape: {"bullets": ["...", "...", "...", "..."]}`,
      ]
        .filter(Boolean)
        .join("\n\n");
    case "improve":
      return [
        `Rewrite this resume bullet point to be more impactful${task.role ? ` for a ${task.role}` : ""}:`,
        `"${task.bullet}"`,
        "Start with a strong action verb, keep every fact from the original, make the result or impact explicit, and keep it under 30 words. If a number would help but is unknown, use a placeholder like [X%].",
        "Respond with only the rewritten bullet: no quotes, no bullet symbol, no explanation.",
      ].join("\n\n");
    case "summary":
      return [
        "Write a professional summary for this resume.",
        task.targetRole ? `Target role: ${task.targetRole}` : "",
        `Resume:\n${clip(resumeToPlainText(resume!), 6000)}`,
        "2–3 sentences, 40–70 words, highlighting years of experience, core strengths and a standout achievement from the resume.",
        "Respond with only the summary text.",
      ]
        .filter(Boolean)
        .join("\n\n");
    case "tailor":
      return [
        "Compare this resume with the job description and give 5–7 specific, actionable suggestions to tailor the resume to the job.",
        "Reference the exact section or bullet to change. Only suggest adding a skill or keyword if the resume suggests the candidate plausibly has it; otherwise say to add it only if true.",
        `Resume:\n${clip(resumeToPlainText(resume!), 6000)}`,
        `Job description:\n${clip(task.jobDescription, 6000)}`,
        `Respond with JSON only, in this shape: {"suggestions": ["...", "..."]}`,
      ].join("\n\n");
  }
}

export const PARSE_PROMPT = (text: string) => `Extract structured data from this resume text.

Return JSON only, matching this TypeScript type exactly:
{
  "personal": { "fullName": string, "headline": string, "email": string, "phone": string, "location": string, "website": string, "linkedin": string, "github": string },
  "summary": string,
  "experience": { "role": string, "company": string, "location": string, "startDate": string, "endDate": string, "current": boolean, "bullets": string[] }[],
  "education": { "institution": string, "degree": string, "field": string, "location": string, "startDate": string, "endDate": string, "gpa": string, "details": string }[],
  "skills": { "name": string, "items": string[] }[],
  "projects": { "name": string, "link": string, "description": string, "bullets": string[] }[],
  "certifications": { "name": string, "issuer": string, "date": string }[]
}

Rules: use "" for missing values; keep the candidate's original wording; write dates as they appear (e.g. "Jan 2020"); for a current role set "current": true and "endDate": ""; group skills into categories when the resume does, otherwise use one group named "Skills".

Resume text:
"""
${clip(text, 15000)}
"""`;

/** Pulls the first JSON object out of a model response (handles code fences and stray prose). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in response");
  return JSON.parse(candidate.slice(start, end + 1));
}

/** Normalizes a single line of model output into clean bullet text. */
export function cleanLine(text: string): string {
  return text
    .trim()
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/^[-•*▪◦●‣–]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stringArray(value: unknown, key: string): string[] {
  const arr = (value as Record<string, unknown>)?.[key];
  if (!Array.isArray(arr)) throw new Error(`Response is missing "${key}"`);
  return arr.filter((x): x is string => typeof x === "string").map(cleanLine).filter(Boolean);
}

export function parseOutput(task: AiTask, text: string): AiResult {
  switch (task.type) {
    case "bullets":
      return { type: "bullets", bullets: stringArray(extractJson(text), "bullets").slice(0, 8) };
    case "improve":
      return { type: "improve", bullet: cleanLine(text.split("\n").find((l) => l.trim()) ?? text) };
    case "summary":
      return { type: "summary", summary: text.replace(/^["“]|["”]$/g, "").trim() };
    case "tailor":
      return { type: "tailor", suggestions: stringArray(extractJson(text), "suggestions").slice(0, 10) };
  }
}

/** Models sometimes emit null for unknown fields; treat those as missing. */
function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.filter((v) => v !== null).map(stripNulls);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => [k, stripNulls(v)]),
    );
  }
  return value;
}

export function parseResumeJson(text: string): ResumeData {
  const result = ResumeDataSchema.safeParse(stripNulls(extractJson(text)));
  if (!result.success) throw new Error("AI returned resume data in an unexpected shape");
  return result.data;
}
