"use client";

import Link from "next/link";
import {
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  Award,
  Briefcase,
  CircleAlert,
  CircleCheck,
  CloudUpload,
  Download,
  Flag,
  FolderGit2,
  GraduationCap,
  Info,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { IMPORT_NOTICE_KEY } from "@/components/dashboard/ImportPdfButton";
import { EXAMPLE_NOTICE_KEY } from "@/components/dashboard/UseTemplateButtons";
import { useToast } from "@/components/Toaster";
import { Badge, Button, Card, Spinner, cn, scoreTone } from "@/components/ui";
import { scoreResume } from "@/lib/ats/scorer";
import { nonEmpty } from "@/lib/resume/format";
import { newSkillGroup, type ResumeData } from "@/lib/resume/schema";
import type { ResumeRecord } from "@/lib/resume/service";
import type { TemplateId } from "@/lib/resume/templates";
import { AtsPanel } from "./AtsPanel";
import { DesignPanel } from "./DesignPanel";
import { LivePreview } from "./LivePreview";
import { CertificationsStep, EducationStep, ExperienceStep, PersonalStep, ProjectsStep, SkillsStep, SummaryStep, type SetData } from "./steps";

type StepId = "personal" | "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "finish";

const STEPS: { id: StepId; label: string; icon: ComponentType<{ className?: string }>; done: (d: ResumeData) => boolean }[] = [
  { id: "personal", label: "Personal", icon: UserRound, done: (d) => !!(d.personal.fullName && d.personal.email) },
  { id: "summary", label: "Summary", icon: AlignLeft, done: (d) => d.summary.trim().split(/\s+/).length >= 15 },
  { id: "experience", label: "Experience", icon: Briefcase, done: (d) => d.experience.some((e) => e.role && nonEmpty(e.bullets).length) },
  { id: "education", label: "Education", icon: GraduationCap, done: (d) => d.education.some((e) => e.institution) },
  { id: "skills", label: "Skills", icon: Wrench, done: (d) => d.skills.some((g) => nonEmpty(g.items).length) },
  { id: "projects", label: "Projects", icon: FolderGit2, done: (d) => d.projects.some((p) => p.name) },
  { id: "certifications", label: "Certifications", icon: Award, done: (d) => d.certifications.some((c) => c.name) },
  { id: "finish", label: "Finish", icon: Flag, done: () => false },
];

type Tab = "content" | "design" | "ats";
type SaveStatus = "saved" | "pending" | "saving" | "error";

interface EditorState {
  title: string;
  template: TemplateId;
  data: ResumeData;
  jobDescription: string;
}

interface ImportNotice {
  method: "ai" | "heuristic";
  engine?: string;
  warnings: string[];
}

const serialize = (state: EditorState) => JSON.stringify({ ...state, title: state.title.trim() || "Untitled resume" });

function useAutosave(id: string, state: EditorState) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const lastSaved = useRef<string | null>(null);
  const version = useRef(0);
  const chain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const body = serialize(state);
    lastSaved.current ??= body; // the initial state is already stored
    if (body === lastSaved.current) {
      setStatus((s) => (s === "error" ? s : "saved"));
      return;
    }
    const current = ++version.current;
    setStatus("pending");
    const timer = setTimeout(() => {
      // Saves run one after another so an older request can never overwrite a newer one.
      chain.current = chain.current.then(async () => {
        if (current !== version.current) return; // a newer edit will save itself
        setStatus("saving");
        try {
          const res = await fetch(`/api/resumes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body });
          if (!res.ok) throw new Error();
          lastSaved.current = body;
          if (current === version.current) setStatus("saved");
        } catch {
          setStatus("error");
        }
      });
    }, 700);
    return () => clearTimeout(timer);
  }, [id, state]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (status !== "saved") e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  return status;
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "saved")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted">
        <CircleCheck className="size-3.5" /> Saved
      </span>
    );
  if (status === "error")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-danger">
        <CircleAlert className="size-3.5" /> Not saved, retrying on next edit
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      {status === "saving" ? <Spinner className="size-3.5" /> : <CloudUpload className="size-3.5" />} Saving…
    </span>
  );
}

export function ResumeEditor({ resume }: { resume: ResumeRecord }) {
  const toast = useToast();
  const [state, setState] = useState<EditorState>({
    title: resume.title,
    template: resume.template,
    data: resume.data,
    jobDescription: resume.jobDescription,
  });
  const [tab, setTab] = useState<Tab>("content");
  const [step, setStep] = useState<StepId>("personal");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [downloading, setDownloading] = useState(false);
  const [notice, setNotice] = useState<ImportNotice | null>(null);
  const [exampleNotice, setExampleNotice] = useState(false);
  const status = useAutosave(resume.id, state);
  const scrollArea = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(IMPORT_NOTICE_KEY(resume.id));
      if (raw) {
        setNotice(JSON.parse(raw));
        sessionStorage.removeItem(IMPORT_NOTICE_KEY(resume.id));
      }
      if (sessionStorage.getItem(EXAMPLE_NOTICE_KEY(resume.id))) {
        setExampleNotice(true);
        sessionStorage.removeItem(EXAMPLE_NOTICE_KEY(resume.id));
      }
    } catch {
      // Ignore unavailable storage.
    }
  }, [resume.id]);

  const setData: SetData = useCallback((fn) => setState((s) => ({ ...s, data: fn(s.data) })), []);
  const changeTemplate = useCallback((template: TemplateId) => setState((s) => ({ ...s, template })), []);
  const report = useMemo(() => scoreResume(state.data, state.jobDescription), [state.data, state.jobDescription]);
  const score = report.score;
  // On the ATS tab, the preview marks the job keywords the resume already contains.
  const highlight = useMemo(() => (tab === "ats" ? report.matchedKeywords.map((k) => k.display) : undefined), [tab, report]);

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const goTo = (id: StepId) => {
    setStep(id);
    scrollArea.current?.scrollTo({ top: 0 });
  };

  async function downloadPdf() {
    setDownloading(true);
    try {
      const { renderResumePdf } = await import("@/components/pdf/ResumePdf");
      const blob = await renderResumePdf(state.data, state.template);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const base = state.data.personal.fullName || state.title || "resume";
      link.href = url;
      link.download = `${base.replace(/[^\p{L}\p{N} _-]+/gu, "").trim().replace(/\s+/g, "_") || "resume"}_Resume.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error(err);
      toast({ tone: "error", title: "Couldn't create the PDF", description: "Please try again." });
    } finally {
      setDownloading(false);
    }
  }

  function addSkill(skill: string) {
    setData((d) => {
      const skills = d.skills.length ? [...d.skills] : [newSkillGroup("Skills")];
      const target = skills.findIndex((g) => /^(skills|additional skills)$/i.test(g.name));
      const index = target >= 0 ? target : skills.length - 1;
      if (skills[index].items.some((i) => i.toLowerCase() === skill.toLowerCase())) return d;
      skills[index] = { ...skills[index], items: [...skills[index].items, skill] };
      return { ...d, skills };
    });
    toast({ tone: "success", title: `Added “${skill}” to your skills` });
  }

  const stepProps = { data: state.data, setData };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted hover:bg-ink/5 hover:text-ink">
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Dashboard</span>
        </Link>
        <input
          aria-label="Resume title"
          value={state.title}
          onChange={(e) => setState((s) => ({ ...s, title: e.target.value.slice(0, 120) }))}
          className="min-w-0 max-w-xs flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 font-medium text-ink hover:border-line focus:border-accent focus:outline-none"
        />
        <SaveIndicator status={status} />
        <div className="ml-auto flex items-center gap-2">
          <div className="inline-flex rounded-md border border-line p-0.5 lg:hidden">
            {(["edit", "preview"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setMobileView(v)} className={cn("rounded px-2.5 py-1 text-sm capitalize", mobileView === v ? "bg-ink text-white" : "text-ink-soft")}>
                {v}
              </button>
            ))}
          </div>
          <Button onClick={downloadPdf} loading={downloading}>
            {downloading ? null : <Download className="size-4" />} <span className="hidden sm:inline">Download PDF</span>
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className={cn("flex min-h-0 flex-col border-r border-line bg-paper", mobileView === "preview" && "hidden lg:flex")}>
          <div role="tablist" className="flex shrink-0 gap-1 border-b border-line px-4 pt-2">
            {(
              [
                ["content", "Content"],
                ["design", "Design"],
                ["ats", "ATS check"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium",
                  tab === id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
                )}
              >
                {label}
                {id === "ats" ? <Badge tone={scoreTone(score)}>{score}</Badge> : null}
              </button>
            ))}
          </div>

          <div ref={scrollArea} className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl px-5 py-6">
              {exampleNotice ? (
                <div className="mb-5 flex gap-3 rounded-lg border border-accent/30 bg-accent-soft p-4 text-sm">
                  <Info className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div className="flex-1">
                    <p className="font-medium text-ink">This resume starts with example content.</p>
                    <p className="mt-0.5 text-ink-soft">
                      Use it as a guide for tone and structure, then replace each section with your own details. Your name and email are
                      already filled in.
                    </p>
                  </div>
                  <button type="button" aria-label="Dismiss" onClick={() => setExampleNotice(false)} className="self-start text-muted hover:text-ink">
                    <X className="size-4" />
                  </button>
                </div>
              ) : null}
              {notice ? (
                <div className="mb-5 flex gap-3 rounded-lg border border-accent/30 bg-accent-soft p-4 text-sm">
                  <Info className="mt-0.5 size-4 shrink-0 text-accent" />
                  <div className="flex-1">
                    <p className="font-medium text-ink">
                      Imported from your PDF{notice.method === "ai" ? ` (${notice.engine ?? "parsed with AI"})` : " with the built-in parser"}.
                    </p>
                    <p className="mt-0.5 text-ink-soft">Review each step to make sure everything landed in the right place.</p>
                    {notice.warnings.length ? (
                      <ul className="mt-2 list-disc pl-5 text-warn">
                        {notice.warnings.map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                  <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)} className="self-start text-muted hover:text-ink">
                    <X className="size-4" />
                  </button>
                </div>
              ) : null}

              {tab === "content" ? (
                <>
                  <nav aria-label="Resume sections" className="mb-6 flex flex-wrap gap-1.5">
                    {STEPS.map((s, i) => {
                      const Icon = s.icon;
                      const done = s.done(state.data);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => goTo(s.id)}
                          aria-current={step === s.id ? "step" : undefined}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] transition-colors",
                            step === s.id ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-soft hover:border-line-strong",
                          )}
                        >
                          {done && step !== s.id ? <CircleCheck className="size-3.5 text-accent" /> : <Icon className="size-3.5" />}
                          <span className="sr-only">Step {i + 1}:</span> {s.label}
                        </button>
                      );
                    })}
                  </nav>

                  {step === "personal" ? <PersonalStep {...stepProps} /> : null}
                  {step === "summary" ? <SummaryStep {...stepProps} /> : null}
                  {step === "experience" ? <ExperienceStep {...stepProps} /> : null}
                  {step === "education" ? <EducationStep {...stepProps} /> : null}
                  {step === "skills" ? <SkillsStep {...stepProps} /> : null}
                  {step === "projects" ? <ProjectsStep {...stepProps} /> : null}
                  {step === "certifications" ? <CertificationsStep {...stepProps} /> : null}
                  {step === "finish" ? (
                    <div>
                      <h2 className="font-display text-2xl text-ink">You&apos;re nearly there</h2>
                      <p className="mt-1 text-sm text-muted">Check your ATS score against a real job posting, then download your PDF.</p>
                      <Card className="mt-5 divide-y divide-line">
                        {STEPS.filter((s) => s.id !== "finish").map((s) => {
                          const done = s.done(state.data);
                          const optional = s.id === "projects" || s.id === "certifications";
                          return (
                            <button key={s.id} type="button" onClick={() => goTo(s.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-paper">
                              {done ? <CircleCheck className="size-4 text-accent" /> : <CircleAlert className={cn("size-4", optional ? "text-muted" : "text-warn")} />}
                              <span className="flex-1 text-ink">{s.label}</span>
                              <span className="text-xs text-muted">{done ? "Done" : optional ? "Optional" : "Needs attention"}</span>
                            </button>
                          );
                        })}
                      </Card>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => setTab("ats")}>
                          Check ATS score ({score})
                        </Button>
                        <Button variant="secondary" onClick={() => setTab("design")}>
                          Adjust design
                        </Button>
                        <Button onClick={downloadPdf} loading={downloading}>
                          {downloading ? null : <Download className="size-4" />} Download PDF
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-8 flex justify-between border-t border-line pt-5">
                    <Button variant="ghost" onClick={() => goTo(STEPS[stepIndex - 1].id)} disabled={stepIndex === 0}>
                      <ArrowLeft className="size-4" /> Back
                    </Button>
                    {stepIndex < STEPS.length - 1 ? (
                      <Button onClick={() => goTo(STEPS[stepIndex + 1].id)}>
                        Next: {STEPS[stepIndex + 1].label} <ArrowRight className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : null}

              {tab === "design" ? (
                <DesignPanel
                  data={state.data}
                  template={state.template}
                  onTemplateChange={changeTemplate}
                  onDesignChange={(design) => setData((d) => ({ ...d, design: { ...d.design, ...design } }))}
                />
              ) : null}

              {tab === "ats" ? (
                <AtsPanel
                  data={state.data}
                  jobDescription={state.jobDescription}
                  onJobDescriptionChange={(jobDescription) => setState((s) => ({ ...s, jobDescription: jobDescription.slice(0, 20000) }))}
                  onAddSkill={addSkill}
                />
              ) : null}
            </div>
          </div>
        </section>

        <section className={cn("min-h-0 overflow-y-auto bg-[#e7eaf0] px-6 py-8", mobileView === "edit" && "hidden lg:block")} aria-label="Live preview">
          <LivePreview data={state.data} templateId={state.template} highlight={highlight} />
        </section>
      </div>
    </div>
  );
}
