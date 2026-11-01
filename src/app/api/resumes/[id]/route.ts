import { NextResponse } from "next/server";
import { apiUser, jsonError, readJson, zodMessage } from "@/lib/api";
import { scoreResume } from "@/lib/ats/scorer";
import { prisma } from "@/lib/db";
import { parseResumeData } from "@/lib/resume/schema";
import { ResumeUpdateSchema, findUserResume, toRecord } from "@/lib/resume/service";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { user, error } = await apiUser();
  if (error) return error;
  const row = await findUserResume(user.id, (await params).id);
  if (!row) return jsonError("Resume not found", 404);
  return NextResponse.json({ resume: toRecord(row) });
}

export async function PUT(request: Request, { params }: Context) {
  const { user, error } = await apiUser();
  if (error) return error;
  const row = await findUserResume(user.id, (await params).id);
  if (!row) return jsonError("Resume not found", 404);

  const parsed = ResumeUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(zodMessage(parsed.error), 400);
  const { title, template, data, jobDescription } = parsed.data;

  // The score is always recomputed on the server from what is actually stored.
  const finalData = data ?? parseResumeData(row.data);
  const finalJd = jobDescription ?? row.jobDescription ?? "";
  const updated = await prisma.resume.update({
    where: { id: row.id },
    data: {
      title,
      template,
      data: data ? JSON.stringify(data) : undefined,
      jobDescription: jobDescription ?? undefined,
      atsScore: scoreResume(finalData, finalJd).score,
    },
  });
  return NextResponse.json({ updatedAt: updated.updatedAt.toISOString(), atsScore: updated.atsScore });
}

export async function DELETE(_request: Request, { params }: Context) {
  const { user, error } = await apiUser();
  if (error) return error;
  const result = await prisma.resume.deleteMany({ where: { id: (await params).id, userId: user.id } });
  if (!result.count) return jsonError("Resume not found", 404);
  return NextResponse.json({ ok: true });
}
