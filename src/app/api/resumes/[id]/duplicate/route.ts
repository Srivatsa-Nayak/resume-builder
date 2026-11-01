import { NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/api";
import { createResume, findUserResume, toRecord } from "@/lib/resume/service";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  const row = await findUserResume(user.id, (await params).id);
  if (!row) return jsonError("Resume not found", 404);

  const source = toRecord(row);
  try {
    const copy = await createResume(user.id, {
      title: `${source.title} (copy)`.slice(0, 120),
      template: source.template,
      data: source.data,
      jobDescription: source.jobDescription,
    });
    return NextResponse.json({ id: copy.id }, { status: 201 });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Could not duplicate resume", 400);
  }
}
