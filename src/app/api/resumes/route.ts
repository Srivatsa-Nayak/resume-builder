import { NextResponse } from "next/server";
import { z } from "zod";
import { apiUser, jsonError, readJson, zodMessage } from "@/lib/api";
import { prisma } from "@/lib/db";
import { sampleResume } from "@/lib/resume/sample";
import { emptyResume } from "@/lib/resume/schema";
import { createResume } from "@/lib/resume/service";
import { getTemplate, isTemplateId } from "@/lib/resume/templates";

const CreateSchema = z.object({
  title: z.string().trim().max(120).optional(),
  template: z.string().refine(isTemplateId, "Unknown template").default("modern"),
  /** Start from the example content (the default) so people have a reference to edit. */
  sample: z.boolean().default(true),
  /** Accent color picked in the template preview (the template's default when omitted). */
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export async function GET() {
  const { user, error } = await apiUser();
  if (error) return error;
  const resumes = await prisma.resume.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, template: true, atsScore: true, updatedAt: true },
  });
  return NextResponse.json({ resumes });
}

export async function POST(request: Request) {
  const { user, error } = await apiUser();
  if (error) return error;
  const parsed = CreateSchema.safeParse((await readJson(request)) ?? {});
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 400);
  const { template, sample } = parsed.data;

  const data = sample ? sampleResume() : emptyResume();
  // The account's own name and email replace the example's either way.
  if (user.name) data.personal.fullName = user.name;
  data.personal.email = user.email;
  const { accentColor } = parsed.data;
  if (accentColor && accentColor.toLowerCase() !== getTemplate(template).defaultAccent.toLowerCase()) data.design.accentColor = accentColor.toLowerCase();
  try {
    const resume = await createResume(user.id, {
      title: parsed.data.title || `${getTemplate(template).name} resume`,
      template,
      data,
    });
    return NextResponse.json({ id: resume.id }, { status: 201 });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not create resume", 400);
  }
}
