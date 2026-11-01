import { describe, expect, it } from "vitest";
import { emptyResume } from "@/lib/resume/schema";
import { sampleResume } from "@/lib/resume/sample";
import { buildTextIndex, extractJobKeywords, stem, textHasKeyword } from "./keywords";
import { findWeakPhrase, scoreResume, startsWithActionVerb } from "./scorer";

const JD = `Senior Backend Engineer

About the role
We're looking for a senior backend engineer to scale our payments platform.

Requirements:
- 5+ years of experience with Node.js and TypeScript
- Strong experience with PostgreSQL and Redis
- Experience running services on AWS with Docker and Kubernetes
- Familiarity with Terraform and CI/CD pipelines
- Experience designing REST APIs and microservices

Nice to have:
- GraphQL
- Experience with Kafka

Benefits:
- Unlimited PTO, health insurance, 401k matching`;

describe("stem", () => {
  it("normalizes common inflections the same way", () => {
    expect(stem("managing")).toBe(stem("managed"));
    expect(stem("services")).toBe(stem("service"));
    expect(stem("technologies")).toBe(stem("technology"));
    expect(stem("analysis")).toBe("analysis");
  });
});

describe("extractJobKeywords", () => {
  const keywords = extractJobKeywords(JD);
  const names = keywords.map((k) => k.display);

  it("finds technical skills in the requirements", () => {
    expect(names).toEqual(expect.arrayContaining(["Node.js", "TypeScript", "PostgreSQL", "Redis", "AWS", "Docker", "Kubernetes", "Terraform", "CI/CD", "Microservices"]));
  });

  it("ignores filler words and benefits", () => {
    const lower = names.map((n) => n.toLowerCase());
    for (const filler of ["experience", "years", "strong", "team", "role", "pto", "insurance"]) expect(lower).not.toContain(filler);
  });

  it("weights required skills above nice-to-haves", () => {
    const k8s = keywords.find((k) => k.display === "Kubernetes")!;
    const kafka = keywords.find((k) => k.display === "Kafka")!;
    expect(k8s).toBeDefined();
    expect(kafka).toBeDefined();
    expect(["high", "medium"]).toContain(k8s.importance);
    expect(keywords.indexOf(k8s)).toBeLessThan(keywords.indexOf(kafka));
  });

  it("only treats ambiguous words as skills when capitalized", () => {
    const words = extractJobKeywords("You will go above and beyond. Take a rest when needed. We use Go and REST.").map((k) => k.display);
    expect(words).toContain("Go");
    expect(words.filter((w) => w === "Go")).toHaveLength(1);
  });
});

describe("textHasKeyword", () => {
  it("matches through aliases and inflections", () => {
    const index = buildTextIndex("Deployed services to k8s clusters, tuned Postgres and built Node APIs.");
    const [k8s, pg, node] = extractJobKeywords("Kubernetes, PostgreSQL and Node.js required. Kubernetes. PostgreSQL. Node.js.");
    expect([k8s, pg, node].map((k) => k.display)).toEqual(["Kubernetes", "PostgreSQL", "Node.js"]);
    expect(textHasKeyword(index, k8s)).toBe(true);
    expect(textHasKeyword(index, pg)).toBe(true);
    expect(textHasKeyword(index, node)).toBe(true);
  });
});

describe("action verbs", () => {
  it("recognizes strong openers in past and present tense", () => {
    expect(startsWithActionVerb("Led a team of 5")).toBe(true);
    expect(startsWithActionVerb("Build data pipelines")).toBe(true);
    expect(startsWithActionVerb("Architected the platform")).toBe(true);
    expect(startsWithActionVerb("Responsible for onboarding")).toBe(false);
  });

  it("detects weak phrases", () => {
    expect(findWeakPhrase("Responsible for managing payroll")).toBe("responsible for");
    expect(findWeakPhrase("Worked on the checkout flow")).toBe("worked on");
    expect(findWeakPhrase("Reduced costs by 20%")).toBeNull();
  });
});

describe("scoreResume", () => {
  it("rates a complete resume well without a job description", () => {
    const report = scoreResume(sampleResume());
    expect(report.hasJobDescription).toBe(false);
    expect(report.score).toBeGreaterThanOrEqual(75);
    expect(report.categories.map((c) => c.id)).toEqual(["impact", "completeness", "formatting"]);
  });

  it("rates an empty resume poorly", () => {
    const report = scoreResume(emptyResume());
    expect(report.score).toBeLessThan(25);
    expect(report.checks.find((c) => c.id === "name")?.passed).toBe(false);
  });

  it("reports matched and missing job keywords", () => {
    const report = scoreResume(sampleResume(), JD);
    expect(report.hasJobDescription).toBe(true);
    expect(report.categories[0].id).toBe("keywords");
    const matched = report.matchedKeywords.map((k) => k.display);
    const missing = report.missingKeywords.map((k) => k.display);
    expect(matched).toEqual(expect.arrayContaining(["Node.js", "TypeScript", "PostgreSQL", "Kubernetes", "CI/CD"]));
    expect(missing).toEqual(expect.arrayContaining(["Terraform", "Kafka"]));
    expect(report.suggestions[0]).toMatch(/Terraform/);
  });

  it("scores higher once missing keywords are added", () => {
    const resume = sampleResume();
    const before = scoreResume(resume, JD).score;
    resume.skills[2].items.push("Terraform", "Kafka", "Microservices", "REST APIs");
    expect(scoreResume(resume, JD).score).toBeGreaterThan(before);
  });

  it("flags weak bullets, missing numbers and first-person pronouns", () => {
    const resume = sampleResume();
    resume.experience[0].bullets = ["Responsible for the deployment process", "I helped my team with testing"];
    const report = scoreResume(resume);
    expect(report.weakBullets.length).toBeGreaterThanOrEqual(2);
    expect(report.checks.find((c) => c.id === "pronouns")?.passed).toBe(false);
  });

  it("checks date format consistency", () => {
    const resume = sampleResume();
    resume.experience[1].startDate = "06/2018";
    expect(scoreResume(resume).checks.find((c) => c.id === "date-format")?.passed).toBe(false);
  });

  it("always returns a score between 0 and 100", () => {
    for (const jd of ["", "short", JD, JD.repeat(5)]) {
      const { score } = scoreResume(sampleResume(), jd);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
