import { describe, expect, it } from "vitest";
import { reconcileWithTextLayer, restoreDotSeparators, similarity } from "./ocr";

describe("reconcileWithTextLayer", () => {
  it("prefers the exact text-layer line to fix OCR misreads", () => {
    const ocr = ["jane.doel5@mail.com\t+1 555 010 2030\tlinkedin.com/in/janedoe", "Built REST APL."];
    const text = ["jane.doe15@mail.com | +1 555 010 2030 | linkedin.com/in/janedoe", "Built REST API."];
    expect(reconcileWithTextLayer(ocr, text)).toEqual(text);
  });

  it("keeps OCR when the text layer is missing words drawn as shapes", () => {
    const ocr = ["• Improved throughput by 35%."];
    expect(reconcileWithTextLayer(ocr, ["Improved throughput by ."])).toEqual(ocr);
  });

  it("keeps bullets and leaves unmatched lines alone", () => {
    expect(reconcileWithTextLayer(["• Led a team of 4", "EXPERIENCE"], ["Led a team of 4"])).toEqual(["• Led a team of 4", "EXPERIENCE"]);
  });

  it("scores similar strings highly and different strings low", () => {
    expect(similarity("Spring Boot, Node.js", "Spring Boot,Node.js")).toBe(1);
    expect(similarity("Software Engineer", "Mentored six engineers")).toBeLessThan(0.5);
  });
});

describe("restoreDotSeparators", () => {
  it("turns OCR'd middle dots back into separators", () => {
    expect(restoreDotSeparators("Software Developer - Java + Spring Boot + Cloud-Native Microservices")).toBe(
      "Software Developer · Java · Spring Boot · Cloud-Native Microservices",
    );
  });

  it("leaves a genuine plus sign alone", () => {
    expect(restoreDotSeparators("Built a tool (ReactJS + Spring Boot)")).toBe("Built a tool (ReactJS + Spring Boot)");
  });
});
