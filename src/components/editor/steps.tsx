"use client";

import { Check, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, Field, IconButton, Input, Textarea } from "@/components/ui";
import { educationTitle, experienceDates, formatDateRange } from "@/lib/resume/format";
import {
  newCertification,
  newEducation,
  newExperience,
  newProject,
  newSkillGroup,
  type Personal,
  type ResumeData,
} from "@/lib/resume/schema";
import { BulletEditor } from "./BulletEditor";
import { EntryList } from "./EntryList";
import { TagInput } from "./TagInput";
import { useAi } from "./useAi";

export type SetData = (fn: (data: ResumeData) => ResumeData) => void;

interface StepProps {
  data: ResumeData;
  setData: SetData;
}

function StepIntro({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

// --- Personal ---------------------------------------------------------------

const PERSONAL_FIELDS: { key: keyof Personal; label: string; placeholder: string; type?: string; autoComplete?: string }[] = [
  { key: "fullName", label: "Full name", placeholder: "Priya Sharma", autoComplete: "name" },
  { key: "headline", label: "Professional title", placeholder: "Senior Software Engineer" },
  { key: "email", label: "Email", placeholder: "priya.sharma@example.com", type: "email", autoComplete: "email" },
  { key: "phone", label: "Phone", placeholder: "+91 98765 43210", type: "tel", autoComplete: "tel" },
  { key: "location", label: "Location", placeholder: "Bengaluru, India" },
  { key: "website", label: "Website / portfolio", placeholder: "priyasharma.dev", type: "url" },
  { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/priyasharma" },
  { key: "github", label: "GitHub", placeholder: "github.com/priyasharma" },
];

export function PersonalStep({ data, setData }: StepProps) {
  return (
    <div>
      <StepIntro title="Personal details">Recruiters and ATS systems look for your name, contact details and location at the top.</StepIntro>
      <div className="grid gap-4 sm:grid-cols-2">
        {PERSONAL_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`personal-${f.key}`}>
            <Input
              id={`personal-${f.key}`}
              type={f.type === "url" ? "text" : (f.type ?? "text")}
              inputMode={f.type === "url" ? "url" : undefined}
              autoComplete={f.autoComplete}
              placeholder={f.placeholder}
              value={data.personal[f.key]}
              onChange={(e) => setData((d) => ({ ...d, personal: { ...d.personal, [f.key]: e.target.value } }))}
            />
          </Field>
        ))}
      </div>
    </div>
  );
}

// --- Summary ----------------------------------------------------------------

export function SummaryStep({ data, setData }: StepProps) {
  const { run, pending } = useAi();
  const [targetRole, setTargetRole] = useState("");
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const words = data.summary.split(/\s+/).filter(Boolean).length;

  async function generate() {
    const result = await run("summary", { type: "summary", resume: data, targetRole });
    if (result) setSuggestion(result.summary);
  }

  return (
    <div>
      <StepIntro title="Professional summary">
        Two to four sentences on who you are, what you&apos;re great at, and a standout result. Tip: fill in your experience first for a better AI
        draft.
      </StepIntro>
      <Field label="Summary" htmlFor="summary" hint={`${words} words${words > 100 ? ": consider trimming to under 100" : words && words < 20 ? ": aim for 40–80" : ""}`}>
        <Textarea
          id="summary"
          rows={6}
          value={data.summary}
          placeholder="Senior software engineer with 7+ years of experience…"
          onChange={(e) => setData((d) => ({ ...d, summary: e.target.value }))}
        />
      </Field>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <Field label="Target role (optional)" htmlFor="target-role" className="min-w-[14rem] flex-1">
          <Input id="target-role" placeholder="e.g. Engineering Manager" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
        </Field>
        <Button variant="subtle" onClick={generate} loading={pending === "summary"}>
          {pending === "summary" ? null : <Sparkles className="size-4" />}
          {data.summary.trim() ? "Rewrite with AI" : "Write with AI"}
        </Button>
      </div>
      {suggestion ? (
        <div className="mt-4 rounded-md border border-accent/30 bg-accent-soft p-4">
          <p className="text-sm font-medium text-accent-strong">AI draft</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{suggestion}</p>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setData((d) => ({ ...d, summary: suggestion }));
                setSuggestion(null);
              }}
            >
              <Check className="size-3.5" /> Use this
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSuggestion(null)}>
              <X className="size-3.5" /> Discard
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// --- Experience -------------------------------------------------------------

export function ExperienceStep({ data, setData }: StepProps) {
  return (
    <div>
      <StepIntro title="Work experience">
        List your most recent position first. Focus each bullet on a result, not a duty. Use the wand to strengthen a bullet.
      </StepIntro>
      <EntryList
        items={data.experience}
        onChange={(experience) => setData((d) => ({ ...d, experience }))}
        create={newExperience}
        title={(e) => e.role || e.company}
        subtitle={(e) => [e.role ? e.company : "", experienceDates(e)].filter(Boolean).join(", ")}
        addLabel="Add position"
        emptyText="No positions yet. Add your most recent job to get started."
      >
        {(item, patch) => (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Job title" htmlFor={`role-${item.id}`}>
                <Input id={`role-${item.id}`} value={item.role} placeholder="Product Designer" onChange={(e) => patch({ role: e.target.value })} />
              </Field>
              <Field label="Company" htmlFor={`company-${item.id}`}>
                <Input id={`company-${item.id}`} value={item.company} placeholder="Infosys" onChange={(e) => patch({ company: e.target.value })} />
              </Field>
              <Field label="Location" htmlFor={`loc-${item.id}`}>
                <Input id={`loc-${item.id}`} value={item.location} placeholder="Bengaluru, India" onChange={(e) => patch({ location: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start" htmlFor={`start-${item.id}`}>
                  <Input id={`start-${item.id}`} value={item.startDate} placeholder="Jan 2022" onChange={(e) => patch({ startDate: e.target.value })} />
                </Field>
                <Field label="End" htmlFor={`end-${item.id}`}>
                  <Input
                    id={`end-${item.id}`}
                    value={item.current ? "Present" : item.endDate}
                    disabled={item.current}
                    placeholder="Mar 2024"
                    onChange={(e) => patch({ endDate: e.target.value })}
                  />
                </Field>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" className="size-4 accent-[var(--color-accent)]" checked={item.current} onChange={(e) => patch({ current: e.target.checked })} />
              I currently work here
            </label>
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-soft">Achievements</p>
              <BulletEditor
                aiKey={`exp-${item.id}`}
                bullets={item.bullets}
                onChange={(bullets) => patch({ bullets })}
                role={item.role}
                company={item.company}
                current={item.current}
              />
            </div>
          </div>
        )}
      </EntryList>
    </div>
  );
}

// --- Education --------------------------------------------------------------

export function EducationStep({ data, setData }: StepProps) {
  return (
    <div>
      <StepIntro title="Education">Add degrees, diplomas or bootcamps. Include your CGPA only if it&apos;s strong (around 8/10 or higher) or the employer asks for it.</StepIntro>
      <EntryList
        items={data.education}
        onChange={(education) => setData((d) => ({ ...d, education }))}
        create={newEducation}
        title={(e) => educationTitle(e) || e.institution}
        subtitle={(e) => [educationTitle(e) ? e.institution : "", formatDateRange(e.startDate, e.endDate)].filter(Boolean).join(", ")}
        addLabel="Add education"
        emptyText="No education added yet."
      >
        {(item, patch) => (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="School" htmlFor={`inst-${item.id}`} className="sm:col-span-2">
              <Input id={`inst-${item.id}`} value={item.institution} placeholder="Indian Institute of Technology Bombay" onChange={(e) => patch({ institution: e.target.value })} />
            </Field>
            <Field label="Degree" htmlFor={`deg-${item.id}`}>
              <Input id={`deg-${item.id}`} value={item.degree} placeholder="B.Tech" onChange={(e) => patch({ degree: e.target.value })} />
            </Field>
            <Field label="Field of study" htmlFor={`field-${item.id}`}>
              <Input id={`field-${item.id}`} value={item.field} placeholder="Computer Science" onChange={(e) => patch({ field: e.target.value })} />
            </Field>
            <Field label="Location" htmlFor={`eloc-${item.id}`}>
              <Input id={`eloc-${item.id}`} value={item.location} placeholder="Mumbai, India" onChange={(e) => patch({ location: e.target.value })} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Start" htmlFor={`es-${item.id}`}>
                <Input id={`es-${item.id}`} value={item.startDate} placeholder="2014" onChange={(e) => patch({ startDate: e.target.value })} />
              </Field>
              <Field label="End" htmlFor={`ee-${item.id}`}>
                <Input id={`ee-${item.id}`} value={item.endDate} placeholder="2018" onChange={(e) => patch({ endDate: e.target.value })} />
              </Field>
              <Field label="CGPA / GPA" htmlFor={`gpa-${item.id}`}>
                <Input id={`gpa-${item.id}`} value={item.gpa} placeholder="8.6/10" onChange={(e) => patch({ gpa: e.target.value })} />
              </Field>
            </div>
            <Field label="Details (optional)" htmlFor={`det-${item.id}`} className="sm:col-span-2" hint="Honors, relevant coursework, thesis…">
              <Textarea id={`det-${item.id}`} rows={2} value={item.details} onChange={(e) => patch({ details: e.target.value })} />
            </Field>
          </div>
        )}
      </EntryList>
    </div>
  );
}

// --- Skills -----------------------------------------------------------------

const GROUP_PRESETS = ["Languages", "Frameworks", "Tools", "Cloud", "Design", "Soft skills"];

export function SkillsStep({ data, setData }: StepProps) {
  const groups = data.skills;
  const setGroups = (skills: ResumeData["skills"]) => setData((d) => ({ ...d, skills }));
  const unusedPresets = GROUP_PRESETS.filter((p) => !groups.some((g) => g.name.toLowerCase() === p.toLowerCase()));

  return (
    <div>
      <StepIntro title="Skills">
        Group related skills. Use the exact wording from job postings (for example “PostgreSQL” rather than “Postgres DB”) so ATS keyword searches
        match.
      </StepIntro>
      <div className="flex flex-col gap-4">
        {groups.map((g, i) => (
          <div key={g.id} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex items-end gap-2">
              <Field label="Group name" htmlFor={`grp-${g.id}`} className="flex-1">
                <Input
                  id={`grp-${g.id}`}
                  value={g.name}
                  placeholder="e.g. Languages (optional)"
                  onChange={(e) => setGroups(groups.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                />
              </Field>
              <IconButton label="Remove group" onClick={() => setGroups(groups.filter((_, j) => j !== i))} className="mb-0.5 hover:text-danger">
                <Trash2 className="size-4" />
              </IconButton>
            </div>
            <div className="mt-3">
              <TagInput
                id={`tags-${g.id}`}
                values={g.items}
                placeholder="Type a skill and press Enter"
                onChange={(items) => setGroups(groups.map((x, j) => (j === i ? { ...x, items } : x)))}
              />
            </div>
          </div>
        ))}
        {groups.length === 0 ? <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-sm text-muted">No skills yet.</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setGroups([...groups, newSkillGroup()])}>
            <Plus className="size-4" /> Add group
          </Button>
          {unusedPresets.slice(0, 4).map((p) => (
            <Button key={p} variant="ghost" size="sm" onClick={() => setGroups([...groups, newSkillGroup(p)])}>
              + {p}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Projects ---------------------------------------------------------------

export function ProjectsStep({ data, setData }: StepProps) {
  return (
    <div>
      <StepIntro title="Projects">Optional, but great for showing initiative: side projects, open source, or notable work projects.</StepIntro>
      <EntryList
        items={data.projects}
        onChange={(projects) => setData((d) => ({ ...d, projects }))}
        create={newProject}
        title={(p) => p.name}
        subtitle={(p) => p.link}
        addLabel="Add project"
        emptyText="No projects yet."
      >
        {(item, patch) => (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project name" htmlFor={`pname-${item.id}`}>
                <Input id={`pname-${item.id}`} value={item.name} placeholder="OpenMetrics Dashboard" onChange={(e) => patch({ name: e.target.value })} />
              </Field>
              <Field label="Link" htmlFor={`plink-${item.id}`}>
                <Input id={`plink-${item.id}`} value={item.link} placeholder="github.com/you/project" onChange={(e) => patch({ link: e.target.value })} />
              </Field>
            </div>
            <Field label="One-line description" htmlFor={`pdesc-${item.id}`}>
              <Input id={`pdesc-${item.id}`} value={item.description} onChange={(e) => patch({ description: e.target.value })} />
            </Field>
            <BulletEditor
              aiKey={`proj-${item.id}`}
              bullets={item.bullets}
              onChange={(bullets) => patch({ bullets })}
              kind="project"
              role={item.name}
              context={item.description}
            />
          </div>
        )}
      </EntryList>
    </div>
  );
}

// --- Certifications -----------------------------------------------------------

export function CertificationsStep({ data, setData }: StepProps) {
  return (
    <div>
      <StepIntro title="Certifications & awards">Licenses, certifications and notable awards. Spell certification names exactly as issued.</StepIntro>
      <EntryList
        items={data.certifications}
        onChange={(certifications) => setData((d) => ({ ...d, certifications }))}
        create={newCertification}
        title={(c) => c.name}
        subtitle={(c) => [c.issuer, c.date].filter(Boolean).join(", ")}
        addLabel="Add certification"
        emptyText="No certifications yet."
      >
        {(item, patch) => (
          <div className="grid gap-4 sm:grid-cols-[2fr_1.5fr_1fr]">
            <Field label="Name" htmlFor={`cname-${item.id}`}>
              <Input id={`cname-${item.id}`} value={item.name} placeholder="AWS Certified Solutions Architect" onChange={(e) => patch({ name: e.target.value })} />
            </Field>
            <Field label="Issuer" htmlFor={`cissuer-${item.id}`}>
              <Input id={`cissuer-${item.id}`} value={item.issuer} placeholder="Amazon Web Services" onChange={(e) => patch({ issuer: e.target.value })} />
            </Field>
            <Field label="Date" htmlFor={`cdate-${item.id}`}>
              <Input id={`cdate-${item.id}`} value={item.date} placeholder="2023" onChange={(e) => patch({ date: e.target.value })} />
            </Field>
          </div>
        )}
      </EntryList>
    </div>
  );
}
