import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { beforeAll, describe, expect, it } from "vitest";
import { ResumePdf, registerResumeFonts } from "@/components/pdf/ResumePdf";
import { sampleResume } from "@/lib/resume/sample";
import { TEMPLATE_LIST, getTemplate } from "@/lib/resume/templates";
import { extractPdf } from "./extract";
import { parseResumeText } from "./parse-resume";

// Exports the sample resume with every template, then imports the PDF again
// and checks the parser recovers the structured data.

beforeAll(() => registerResumeFonts(path.resolve("public/fonts")));

describe.each(TEMPLATE_LIST.map((t) => t.id))("PDF export → import round trip (%s)", (templateId) => {
  it("recovers contact details, experience, education, skills, projects and certifications", async () => {
    const sample = sampleResume();
    const buffer = await renderToBuffer(<ResumePdf data={sample} templateId={templateId} />);
    const { lines, links } = await extractPdf(new Uint8Array(buffer));
    const { data, warnings } = parseResumeText(lines, links);

    expect(warnings).toEqual([]);
    expect(data.personal).toMatchObject({
      fullName: "John Doe",
      headline: "Senior Software Engineer",
      email: "john.doe@example.com",
      phone: "+91 98765 43210",
      location: "Bengaluru, India",
    });
    expect(data.personal.linkedin).toContain("linkedin.com/in/johndoe");
    expect(data.personal.github).toContain("github.com/johndoe");
    expect(data.summary).toBe(sample.summary);

    expect(data.experience).toHaveLength(2);
    expect(data.experience[0]).toMatchObject({
      role: "Senior Software Engineer",
      company: "Northwind Labs",
      location: "Bengaluru, India",
      startDate: "Mar 2021",
      current: true,
    });
    expect(data.experience[0].bullets).toEqual(sample.experience[0].bullets);
    expect(data.experience[1]).toMatchObject({
      role: "Software Engineer",
      company: "Contoso Retail",
      location: "Pune, India",
      startDate: "Jun 2018",
      endDate: "Feb 2021",
      current: false,
    });
    expect(data.experience[1].bullets).toEqual(sample.experience[1].bullets);

    expect(data.education[0]).toMatchObject({
      institution: "National Institute of Technology Karnataka",
      degree: "B.Tech",
      field: "Computer Science and Engineering",
      startDate: "2014",
      endDate: "2018",
      gpa: "8.6/10",
    });

    if (getTemplate(templateId).skills === "tags") {
      // Tag chips have no separators, so check every skill made it into the text (what ATS keyword search sees).
      const skillText = data.skills.flatMap((g) => [g.name, ...g.items]).join(" ");
      for (const item of sample.skills.flatMap((g) => g.items)) expect(skillText).toContain(item);
    } else {
      expect(data.skills.flatMap((g) => g.items)).toEqual(expect.arrayContaining(sample.skills.flatMap((g) => g.items)));
      expect(data.skills.map((g) => g.name)).toEqual(["Languages", "Frameworks", "Cloud & Tools"]);
    }

    expect(data.projects[0]).toMatchObject({ name: "OpenMetrics Dashboard", description: sample.projects[0].description });
    expect(data.projects[0].link).toContain("github.com/johndoe/openmetrics");
    expect(data.projects[0].bullets).toEqual(sample.projects[0].bullets);

    expect(data.certifications[0]).toMatchObject({
      name: "AWS Certified Solutions Architect – Associate",
      issuer: "Amazon Web Services",
      date: "2022",
    });
  });
});
