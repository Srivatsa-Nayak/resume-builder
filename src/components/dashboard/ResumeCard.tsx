"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { ResumeImage } from "@/components/resume/TemplateImage";
import { useToast } from "@/components/Toaster";
import { Badge, IconButton, scoreTone } from "@/components/ui";
import type { ResumeRecord } from "@/lib/resume/service";
import { getTemplate } from "@/lib/resume/templates";

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function updatedLabel(iso: string): string {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return relativeTime.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeTime.format(hours, "hour");
  return relativeTime.format(Math.round(hours / 24), "day");
}

export function ResumeCard({ resume }: { resume: ResumeRecord }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<"copy" | "delete" | null>(null);

  async function duplicate() {
    setBusy("copy");
    const res = await fetch(`/api/resumes/${resume.id}/duplicate`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return toast({ tone: "error", title: "Couldn't duplicate", description: body.error });
    toast({ tone: "success", title: "Resume duplicated" });
    router.refresh();
  }

  async function remove() {
    const ok = await confirm({
      title: `Delete “${resume.title}”?`,
      description: "The resume will be permanently deleted. This can't be undone.",
      confirmLabel: "Delete resume",
      tone: "danger",
    });
    if (!ok) return;
    setBusy("delete");
    const res = await fetch(`/api/resumes/${resume.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) return toast({ tone: "error", title: "Couldn't delete the resume" });
    toast({ tone: "success", title: "Resume deleted" });
    router.refresh();
  }

  return (
    <article className="group overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-md">
      <Link href={`/resumes/${resume.id}`} className="block border-b border-line bg-paper px-8 pt-6">
        <div className="mx-auto h-48 overflow-hidden rounded-t-sm shadow-sm">
          <ResumeImage resumeId={resume.id} version={resume.updatedAt} title={resume.title} sizes="260px" />
        </div>
      </Link>
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <Link href={`/resumes/${resume.id}`} className="block truncate font-medium text-ink hover:text-accent">
            {resume.title}
          </Link>
          <p className="mt-0.5 text-xs text-muted">
            {getTemplate(resume.template).name} template, edited {updatedLabel(resume.updatedAt)}
          </p>
          {resume.atsScore !== null ? (
            <Badge tone={scoreTone(resume.atsScore)} className="mt-2">
              {resume.jobDescription ? "Job match" : "ATS score"} {resume.atsScore}
            </Badge>
          ) : null}
        </div>
        <div className="flex">
          <IconButton label="Duplicate" onClick={duplicate} disabled={busy !== null}>
            <Copy className="size-4" />
          </IconButton>
          <IconButton label="Delete" onClick={remove} disabled={busy !== null} className="hover:text-danger">
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </div>
    </article>
  );
}
