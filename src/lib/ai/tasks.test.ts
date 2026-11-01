import { describe, expect, it } from "vitest";
import { AiTaskSchema, buildPrompt, cleanLine, extractJson, parseOutput, parseResumeJson } from "./tasks";

describe("extractJson", () => {
  it("handles fenced JSON and surrounding prose", () => {
    expect(extractJson('Here you go:\n```json\n{"bullets": ["a"]}\n```')).toEqual({ bullets: ["a"] });
    expect(extractJson('Sure! {"suggestions": ["x", "y"]} Hope that helps.')).toEqual({ suggestions: ["x", "y"] });
  });

  it("throws when there is no JSON", () => {
    expect(() => extractJson("no json here")).toThrow();
  });
});

describe("parseOutput", () => {
  const bullets = AiTaskSchema.parse({ type: "bullets", role: "Engineer" });
  const improve = AiTaskSchema.parse({ type: "improve", bullet: "did things" });

  it("cleans bullet text from model output", () => {
    const result = parseOutput(bullets, '{"bullets": ["• Led X", "- Built Y", "  "]}');
    expect(result).toEqual({ type: "bullets", bullets: ["Led X", "Built Y"] });
  });

  it("uses the first non-empty line for improved bullets", () => {
    expect(parseOutput(improve, '\n"Delivered things 2x faster"\nExplanation: ...')).toEqual({ type: "improve", bullet: "Delivered things 2x faster" });
  });

  it("strips quotes and symbols", () => {
    expect(cleanLine("“- Shipped it”")).toBe("Shipped it");
  });
});

describe("buildPrompt", () => {
  it("asks for project bullets differently from job bullets", () => {
    expect(buildPrompt(AiTaskSchema.parse({ type: "bullets", role: "OpenMetrics", kind: "project" }))).toContain('describing the project "OpenMetrics"');
    expect(buildPrompt(AiTaskSchema.parse({ type: "bullets", role: "Designer", company: "Acme" }))).toContain('for the role "Designer" at "Acme"');
  });
});

describe("parseResumeJson", () => {
  it("accepts nulls and missing fields from the model", () => {
    const data = parseResumeJson(
      JSON.stringify({
        personal: { fullName: "Sam Lee", email: null },
        experience: [{ role: "Analyst", company: "Contoso", bullets: ["Did a thing"], current: null }],
        skills: [{ name: "Skills", items: ["SQL"] }],
      }),
    );
    expect(data.personal.fullName).toBe("Sam Lee");
    expect(data.personal.email).toBe("");
    expect(data.experience[0]).toMatchObject({ role: "Analyst", current: false });
    expect(data.experience[0].id).toBeTruthy();
  });
});
