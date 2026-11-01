import Link from "next/link";
import { FileUp } from "lucide-react";
import { ScoreRing } from "@/components/editor/ScoreRing";
import { SiteFooter } from "@/components/SiteFooter";
import { FluidThumbnail } from "@/components/resume/FluidThumbnail";
import { SiteNav } from "@/components/site/SiteNav";
import { buttonClass } from "@/components/ui";
import { scoreResume } from "@/lib/ats/scorer";
import { getCurrentUser } from "@/lib/auth/session";
import { sampleResume } from "@/lib/resume/sample";

// The hero runs a real ATS match: the sample resume against this posting.
const SAMPLE_JOB = `Senior Backend Engineer
Requirements:
- Node.js and TypeScript in production
- PostgreSQL and Redis
- Docker, Kubernetes and AWS
- CI/CD and microservices experience
- Terraform and Kafka are a plus
- GraphQL APIs`;

const STEPS = [
  { title: "Start anywhere", body: "Pick a template, or upload the PDF you already have and we'll turn it into editable sections." },
  { title: "Write with AI", body: "Generate bullets from a job title, turn duties into measurable results, and draft a summary." },
  { title: "Match the job", body: "Paste a posting to see your score, the keywords you're missing, and what to fix first." },
  { title: "Download a clean PDF", body: "Real, selectable text in every template, so applicant tracking systems read every word." },
];

export default async function Home() {
  const user = await getCurrentUser();
  const sample = sampleResume();
  const report = scoreResume(sample, SAMPLE_JOB);
  const matched = report.matchedKeywords.map((k) => k.display);
  const total = report.matchedKeywords.length + report.missingKeywords.length;

  return (
    <div className="min-h-screen">
      <SiteNav signedIn={!!user} />

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-16 lg:grid-cols-[1fr_minmax(0,520px)]">
          <div className="max-w-xl">
            <h1 className="font-display text-[44px] leading-[1.02] text-ink sm:text-[64px]">Get past the resume filter. Then impress a person.</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">
              Applicant tracking systems scan your resume for the job&apos;s keywords before anyone reads it. See exactly what they find, fix what
              they miss, and write it all with an AI assistant.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/templates" className={buttonClass("primary", "lg")}>
                Build your resume
              </Link>
              <Link href={user ? "/dashboard" : "/signup"} className={buttonClass("secondary", "lg")}>
                <FileUp className="size-4" /> Import a PDF
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted">Your resumes and data stay in your account.</p>
          </div>

          <figure className="relative mx-auto w-full max-w-[520px]">
            <div className="mark-sweep overflow-hidden rounded-md bg-white shadow-[var(--shadow-sheet)] ring-1 ring-ink/5">
              <FluidThumbnail data={sample} templateId="harbor" highlight={matched} maxWidth={520} />
            </div>
            <figcaption className="absolute -bottom-10 left-2 right-2 flex sm:right-auto items-center gap-4 rounded-2xl bg-ink py-3 pl-3 pr-5 text-white shadow-xl sm:-left-10">
              <div className="rounded-full bg-white p-1">
                <ScoreRing score={report.score} size={64} />
              </div>
              <div className="text-sm">
                <p className="font-medium">Match for “{SAMPLE_JOB.split("\n")[0]}”</p>
                <p className="text-white/70">
                  <span className="mark text-mark-ink">{report.matchedKeywords.length} keywords found</span>, {total - report.matchedKeywords.length}{" "}
                  missing
                </p>
              </div>
            </figcaption>
          </figure>
        </section>

        <section className="border-y border-line bg-surface">
          <ol className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="font-display text-sm text-accent">Step {i + 1}</span>
                <h2 className="mt-1 font-display text-xl text-ink">{s.title}</h2>
                <p className="mt-2 leading-relaxed text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-ink text-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2 md:items-center">
            <h2 className="font-display text-3xl">Use the built-in AI, or bring your own key.</h2>
            <p className="leading-relaxed text-white/75">
              AI writing works out of the box. Add an OpenRouter, OpenAI, Anthropic or Gemini key in Settings for unlimited use with the model you
              prefer. Keys are encrypted before they&apos;re stored and never sent back to your browser.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
