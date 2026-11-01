import { z } from "zod";
import { scoreResume } from "@/lib/ats/scorer";
import { prisma } from "@/lib/db";
import { ResumeDataSchema, parseResumeData, type ResumeData } from "./schema";
import { isTemplateId, type TemplateId } from "./templates";

export const MAX_RESUMES_PER_USER = 50;

export const ResumeUpdateSchema = z.object({
  title: z.string().trim().min(1, "Title can't be empty").max(120).optional(),
  template: z.string().refine(isTemplateId, "Unknown template").optional(),
  data: ResumeDataSchema.optional(),
  jobDescription: z.string().max(20000).optional(),
});

export interface ResumeRecord {
  id: string;
  title: string;
  template: TemplateId;
  data: ResumeData;
  jobDescription: string;
  atsScore: number | null;
  updatedAt: string;
}

type Row = { id: string; title: string; template: string; data: string; jobDescription: string | null; atsScore: number | null; updatedAt: Date };

export function toRecord(row: Row): ResumeRecord {
  return {
    id: row.id,
    title: row.title,
    template: isTemplateId(row.template) ? row.template : "modern",
    data: parseResumeData(row.data),
    jobDescription: row.jobDescription ?? "",
    atsScore: row.atsScore,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function findUserResume(userId: string, id: string) {
  return prisma.resume.findFirst({ where: { id, userId } });
}

export async function createResume(userId: string, input: { title: string; template: TemplateId; data: ResumeData; jobDescription?: string }) {
  const count = await prisma.resume.count({ where: { userId } });
  if (count >= MAX_RESUMES_PER_USER) {
    throw new Error(`You can store up to ${MAX_RESUMES_PER_USER} resumes. Delete one to create another.`);
  }
  return prisma.resume.create({
    data: {
      userId,
      title: input.title,
      template: input.template,
      data: JSON.stringify(input.data),
      jobDescription: input.jobDescription ?? null,
      atsScore: scoreResume(input.data, input.jobDescription ?? "").score,
    },
  });
}
