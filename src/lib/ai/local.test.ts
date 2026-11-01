import { describe, expect, it } from "vitest";
import { sampleResume } from "@/lib/resume/sample";
import { improveBulletLocally, runLocalTask } from "./local";
import { AiTaskSchema } from "./tasks";

const task = (input: unknown) => AiTaskSchema.parse(input);

describe("improveBulletLocally", () => {
  it("replaces weak openers and converts gerunds to past tense", () => {
    expect(improveBulletLocally("Responsible for managing a team of 4 engineers")).toBe("Managed a team of 4 engineers");
    expect(improveBulletLocally("worked on the checkout redesign.")).toMatch(/^Developed the checkout redesign, resulting in \[/);
    expect(improveBulletLocally("Leading weekly planning for 3 squads")).toBe("Led weekly planning for 3 squads");
  });

  it("removes first-person pronouns and bullet symbols", () => {
    expect(improveBulletLocally("• I built my first API with 99% uptime")).toBe("Built first API with 99% uptime");
  });

  it("prompts for a metric when none is present", () => {
    expect(improveBulletLocally("Created onboarding documentation")).toContain("[quantified impact");
  });
});

describe("runLocalTask", () => {
  it("generates role-appropriate bullets and skips existing ones", () => {
    const first = runLocalTask(task({ type: "bullets", role: "Software Engineer" }));
    expect(first.type).toBe("bullets");
    if (first.type !== "bullets") return;
    expect(first.bullets).toHaveLength(4);
    const again = runLocalTask(task({ type: "bullets", role: "Software Engineer", existing: [first.bullets[0]] }));
    if (again.type !== "bullets") return;
    expect(again.bullets).not.toContain(first.bullets[0]);
  });

  it("writes a summary from the resume content", () => {
    const result = runLocalTask(task({ type: "summary", resume: sampleResume(), targetRole: "Staff Engineer" }));
    if (result.type !== "summary") throw new Error("wrong type");
    expect(result.summary).toMatch(/Senior Software Engineer with \d+\+ years/);
    expect(result.summary).toContain("TypeScript");
    expect(result.summary).toContain("Staff Engineer");
  });

  it("gives tailoring tips that mention missing keywords", () => {
    const jd = "Platform Engineer\nRequirements: Terraform, Kubernetes, AWS. Terraform experience required. Strong Terraform and Ansible skills.";
    const result = runLocalTask(task({ type: "tailor", resume: sampleResume(), jobDescription: jd }));
    if (result.type !== "tailor") throw new Error("wrong type");
    expect(result.suggestions.join(" ")).toMatch(/Terraform/);
  });
});
