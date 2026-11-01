import { z } from "zod";

/** Random id usable in both the browser and Node (falls back outside secure contexts). */
export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const text = (max = 300) => z.string().trim().max(max).default("");
const id = () => z.string().max(64).default(() => createId());
const bulletList = z.array(z.string().max(1000)).max(20).default([]);

export const PersonalSchema = z.object({
  fullName: text(120),
  headline: text(160),
  email: text(200),
  phone: text(60),
  location: text(120),
  website: text(300),
  linkedin: text(300),
  github: text(300),
});

export const ExperienceSchema = z.object({
  id: id(),
  role: text(160),
  company: text(160),
  location: text(120),
  startDate: text(40),
  endDate: text(40),
  current: z.boolean().default(false),
  bullets: bulletList,
});

export const EducationSchema = z.object({
  id: id(),
  institution: text(200),
  degree: text(160),
  field: text(160),
  location: text(120),
  startDate: text(40),
  endDate: text(40),
  gpa: text(20),
  details: text(1000),
});

export const SkillGroupSchema = z.object({
  id: id(),
  name: text(80),
  items: z.array(z.string().trim().max(80)).max(60).default([]),
});

export const ProjectSchema = z.object({
  id: id(),
  name: text(160),
  link: text(300),
  description: text(1000),
  bullets: bulletList,
});

export const CertificationSchema = z.object({
  id: id(),
  name: text(200),
  issuer: text(160),
  date: text(40),
});

export const PAGE_SIZES = ["LETTER", "A4"] as const;

export const DesignSchema = z.object({
  /** Empty string means "use the template's default accent". */
  accentColor: z
    .string()
    .regex(/^(#[0-9a-fA-F]{6})?$/)
    .default(""),
  pageSize: z.enum(PAGE_SIZES).default("A4"),
});

export const ResumeDataSchema = z.object({
  personal: PersonalSchema.default(() => PersonalSchema.parse({})),
  summary: text(3000),
  experience: z.array(ExperienceSchema).max(30).default([]),
  education: z.array(EducationSchema).max(20).default([]),
  skills: z.array(SkillGroupSchema).max(20).default([]),
  projects: z.array(ProjectSchema).max(20).default([]),
  certifications: z.array(CertificationSchema).max(30).default([]),
  design: DesignSchema.default(() => DesignSchema.parse({})),
});

export type ResumeData = z.infer<typeof ResumeDataSchema>;
export type Personal = ResumeData["personal"];
export type Experience = ResumeData["experience"][number];
export type Education = ResumeData["education"][number];
export type SkillGroup = ResumeData["skills"][number];
export type Project = ResumeData["projects"][number];
export type Certification = ResumeData["certifications"][number];
export type PageSize = (typeof PAGE_SIZES)[number];

export function emptyResume(): ResumeData {
  return ResumeDataSchema.parse({});
}

export function newExperience(): Experience {
  return ExperienceSchema.parse({ bullets: [""] });
}
export function newEducation(): Education {
  return EducationSchema.parse({});
}
export function newSkillGroup(name = ""): SkillGroup {
  return SkillGroupSchema.parse({ name });
}
export function newProject(): Project {
  return ProjectSchema.parse({ bullets: [""] });
}
export function newCertification(): Certification {
  return CertificationSchema.parse({});
}

/**
 * Parses stored or user-supplied resume JSON, filling in defaults for any
 * missing fields. Falls back to an empty resume if the data is unusable.
 */
export function parseResumeData(input: unknown): ResumeData {
  let value = input;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return emptyResume();
    }
  }
  const result = ResumeDataSchema.safeParse(value ?? {});
  return result.success ? result.data : emptyResume();
}
