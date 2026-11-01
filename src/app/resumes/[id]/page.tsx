import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResumeEditor } from "@/components/editor/ResumeEditor";
import { requireUser } from "@/lib/auth/session";
import { findUserResume, toRecord } from "@/lib/resume/service";

export const metadata: Metadata = { title: "Editor" };

export default async function ResumeEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/resumes/${id}`);
  const row = await findUserResume(user.id, id);
  if (!row) notFound();
  return <ResumeEditor key={row.id} resume={toRecord(row)} />;
}
