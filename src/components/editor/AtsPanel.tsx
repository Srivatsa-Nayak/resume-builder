"use client";

import { CircleCheck, CircleX, Lightbulb, Plus, Sparkles } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Badge, Button, Card, Field, Textarea, cn } from "@/components/ui";
import type { JobKeyword } from "@/lib/ats/keywords";
import { scoreResume, type AtsReport } from "@/lib/ats/scorer";
import type { ResumeData } from "@/lib/resume/schema";
import { ScoreRing } from "./ScoreRing";
import { useAi } from "./useAi";

function verdict(report: AtsReport): { title: string; body: string } {
  if (report.score >= 80) return { title: "Strong", body: "Your resume should parse well and rank competitively." };
  if (report.score >= 60) return { title: "Good, with room to improve", body: "A few targeted changes will lift your ranking." };
  return { title: "Needs work", body: "Fix the items below before you apply." };
}

const IMPORTANCE_STYLE: Record<JobKeyword["importance"], string> = {
  high: "border-danger/30 bg-danger-soft text-danger",
  medium: "border-warn/30 bg-warn-soft text-warn",
  low: "border-line bg-paper text-ink-soft",
};

export function AtsPanel({
  data,
  jobDescription,
  onJobDescriptionChange,
  onAddSkill,
}: {
  data: ResumeData;
  jobDescription: string;
  onJobDescriptionChange: (value: string) => void;
  onAddSkill: (skill: string) => void;
}) {
  const deferredData = useDeferredValue(data);
  const deferredJd = useDeferredValue(jobDescription);
  const report = useMemo(() => scoreResume(deferredData, deferredJd), [deferredData, deferredJd]);
  const { run, pending } = useAi();
  const [tips, setTips] = useState<string[] | null>(null);
  const v = verdict(report);
  const failed = report.checks.filter((c) => !c.passed);
  const passed = report.checks.filter((c) => c.passed);

  async function tailor() {
    const result = await run("tailor", { type: "tailor", resume: data, jobDescription });
    if (result) setTips(result.suggestions);
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <div className="flex items-center gap-5">
          <ScoreRing score={report.score} />
          <div className="min-w-0">
            <p className="text-sm text-muted">{report.hasJobDescription ? "Job match score" : "Resume health score"}</p>
            <h2 className="mt-1 font-display text-2xl text-ink">{v.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">{v.body}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3">
          {report.categories.map((c) => (
            <div key={c.id}>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">
                  {c.label} <span className="text-xs text-muted">({c.weight}%)</span>
                </span>
                <span className="font-medium text-ink">{c.score}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                <div
                  className={cn("h-full rounded-full transition-all", c.score >= 75 ? "bg-good" : c.score >= 50 ? "bg-warn" : "bg-danger")}
                  style={{ width: `${c.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <Field
          label="Target job description"
          htmlFor="jd"
          hint={report.hasJobDescription ? `${report.matchedKeywords.length + report.missingKeywords.length} keywords extracted.` : "Paste the full job posting to see how well you match and which keywords you're missing."}
        >
          <Textarea id="jd" rows={7} value={jobDescription} placeholder="Paste the job description here…" onChange={(e) => onJobDescriptionChange(e.target.value)} />
        </Field>
        {jobDescription.trim() && !report.hasJobDescription ? <p className="mt-2 text-xs text-warn">Paste more of the posting to extract keywords.</p> : null}
      </Card>

      {report.hasJobDescription ? (
        <Card className="p-5">
          <h3 className="font-medium text-ink">Missing keywords ({report.missingKeywords.length})</h3>
          <p className="mt-1 text-xs text-muted">Only add keywords that truthfully describe your experience. Skills can be added with one click.</p>
          {report.missingKeywords.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {report.missingKeywords.map((k) => (
                <span key={k.key} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[13px]", IMPORTANCE_STYLE[k.importance])} title={`${k.importance} importance, mentioned ${k.count}×`}>
                  {k.display}
                  {k.isSkill ? (
                    <button type="button" aria-label={`Add ${k.display} to skills`} onClick={() => onAddSkill(k.display)} className="-mr-1 rounded-full p-0.5 hover:bg-ink/10">
                      <Plus className="size-3" />
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-accent">You cover every keyword we found. Nice work.</p>
          )}
          <div className="mt-3 flex gap-3 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-danger" /> High
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-warn" /> Medium
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-line-strong" /> Low
            </span>
          </div>
          {report.matchedKeywords.length ? (
            <>
              <h3 className="mt-5 font-medium text-ink">Found in your resume ({report.matchedKeywords.length})</h3>
              <p className="mt-1 text-xs text-muted">Highlighted in the preview.</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {report.matchedKeywords.map((k) => (
                  <Badge key={k.key} tone="mark">
                    {k.display}
                  </Badge>
                ))}
              </div>
            </>
          ) : null}
          <div className="mt-5 border-t border-line pt-4">
            <Button variant="subtle" onClick={tailor} loading={pending === "tailor"} disabled={jobDescription.trim().length < 50}>
              {pending === "tailor" ? null : <Sparkles className="size-4" />} Get AI tailoring tips
            </Button>
            {tips ? (
              <ul className="mt-3 flex flex-col gap-2">
                {tips.map((t, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink-soft">
                    <Lightbulb className="mt-0.5 size-4 shrink-0 text-accent" />
                    {t}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Card>
      ) : null}

      {report.suggestions.length ? (
        <Card className="p-5">
          <h3 className="font-medium text-ink">Top fixes</h3>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm text-ink-soft marker:text-muted">
            {report.suggestions.slice(0, 6).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </Card>
      ) : null}

      {report.weakBullets.length ? (
        <Card className="p-5">
          <h3 className="font-medium text-ink">Bullets to strengthen ({report.weakBullets.length})</h3>
          <p className="mt-1 text-xs text-muted">Open the bullet in Content and use the wand button to rewrite it.</p>
          <ul className="mt-3 flex flex-col gap-3">
            {report.weakBullets.slice(0, 5).map((w, i) => (
              <li key={i} className="text-sm">
                <p className="text-ink">“{w.bullet}”</p>
                <p className="mt-0.5 text-xs text-warn">{w.reason}</p>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="p-5">
        <h3 className="font-medium text-ink">
          ATS checklist ({passed.length}/{report.checks.length})
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {[...failed, ...passed].map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              {c.passed ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-accent" /> : <CircleX className="mt-0.5 size-4 shrink-0 text-danger" />}
              <span className={c.passed ? "text-muted" : "text-ink"}>{c.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          {report.stats.wordCount} words, {report.stats.bulletCount} bullets, {report.stats.quantifiedBullets} with numbers, {report.stats.strongVerbBullets} starting with
          action verbs
        </p>
      </Card>
    </div>
  );
}
