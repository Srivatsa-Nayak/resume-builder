import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { ImportPdfButton } from "@/components/dashboard/ImportPdfButton";
import { ResumeCard } from "@/components/dashboard/ResumeCard";
import { buttonClass } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { toRecord } from "@/lib/resume/service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const rows = await prisma.resume.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  const resumes = rows.map(toRecord);
  const firstName = user.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl text-ink">{firstName ? `Hi, ${firstName}` : "Your resumes"}</h1>
          <p className="mt-1 text-muted">
            {resumes.length ? `You have ${resumes.length} resume${resumes.length === 1 ? "" : "s"}.` : "Let's create your first resume."}
          </p>
        </div>
        <div className="flex gap-2">
          <ImportPdfButton />
          <Link href="/templates" className={buttonClass("primary")}>
            <FilePlus2 className="size-4" /> New resume
          </Link>
        </div>
      </div>

      {resumes.length ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((r) => (
            <ResumeCard key={r.id} resume={r} />
          ))}
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Link href="/templates" className="group rounded-xl border border-dashed border-line-strong bg-surface p-8 transition-colors hover:border-accent">
            <FilePlus2 className="size-6 text-accent" />
            <h2 className="mt-4 font-display text-2xl text-ink">Start from a template</h2>
            <p className="mt-2 text-ink-soft">Pick a design, then fill in a guided, step-by-step form with AI help along the way.</p>
          </Link>
          <div className="rounded-xl border border-dashed border-line-strong bg-surface p-8">
            <h2 className="font-display text-2xl text-ink">Already have a resume?</h2>
            <p className="mt-2 text-ink-soft">Upload a PDF and we&apos;ll turn it into editable sections you can improve and re-export.</p>
            <div className="mt-5">
              <ImportPdfButton variant="subtle" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
