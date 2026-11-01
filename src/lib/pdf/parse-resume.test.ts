import { describe, expect, it } from "vitest";
import { detectHeading, looksLikeMissingText, parseResumeText } from "./parse-resume";

const lines = (text: string) => text.trim().split("\n").map((l) => l.trim());

describe("detectHeading", () => {
  it("recognizes common section names and variants", () => {
    expect(detectHeading("PROFESSIONAL EXPERIENCE")).toBe("experience");
    expect(detectHeading("Work History")).toBe("experience");
    expect(detectHeading("Skills & Tools")).toBe("skills");
    expect(detectHeading("Licenses & Certifications")).toBe("certifications");
    expect(detectHeading("S U M M A RY")).toBe("summary");
    expect(detectHeading("W O R K E X P E R I E N C E")).toBe("experience");
  });

  it("does not treat sentences as headings", () => {
    expect(detectHeading("Experience with distributed systems at scale")).toBeNull();
    expect(detectHeading("Led the skills program")).toBeNull();
  });
});

describe("looksLikeMissingText", () => {
  it("spots gaps left by text drawn as shapes", () => {
    expect(looksLikeMissingText(["processing and improving throughput by .", "cutting manual migration effort by and accelerating", "memory —\t, and comparisons"])).toBe(true);
  });

  it("does not flag normal text", () => {
    expect(
      looksLikeMissingText(["Improved throughput by 35%.", "Senior Engineer\tJan 2020 – Present", "Optimal Flight Navigation\tgithub.com/me", "SQL Visualizer\tgithub.com/me"]),
    ).toBe(false);
  });
});

describe("parseResumeText", () => {
  it("parses a company-first layout with 'to' date ranges and numeric dates", () => {
    const { data } = parseResumeText(
      lines(`
        JORDAN LEE
        Data Analyst
        jordan.lee@mail.com • +1 415 555 0199 • San Francisco, CA
        linkedin.com/in/jordanlee
        Summary:
        Analyst who turns messy data into decisions.
        Employment History
        Globex Corporation\tSan Francisco, CA
        Senior Data Analyst\t01/2021 to Present
        - Built Tableau dashboards used by 300 sales reps
        - Automated weekly reporting with Python, saving 6 hours per week
        Initech LLC
        Data Analyst\t06/2018 to 12/2020
        - Cleaned and modeled 2M+ rows of CRM data
        Education
        Bachelor of Science in Statistics, University of Washington\t2014 - 2018
        Technical Skills
        SQL, Python, Tableau, Excel
        dbt; Snowflake
      `),
    );
    expect(data.personal).toMatchObject({
      fullName: "Jordan Lee",
      headline: "Data Analyst",
      email: "jordan.lee@mail.com",
      phone: "+1 415 555 0199",
      location: "San Francisco, CA",
    });
    expect(data.summary).toBe("Analyst who turns messy data into decisions.");
    expect(data.experience).toHaveLength(2);
    expect(data.experience[0]).toMatchObject({ company: "Globex Corporation", role: "Senior Data Analyst", startDate: "01/2021", current: true });
    expect(data.experience[0].bullets).toHaveLength(2);
    expect(data.experience[1]).toMatchObject({ company: "Initech LLC", role: "Data Analyst", startDate: "06/2018", endDate: "12/2020" });
    expect(data.education[0]).toMatchObject({
      institution: "University of Washington",
      degree: "Bachelor of Science",
      field: "Statistics",
      startDate: "2014",
      endDate: "2018",
    });
    expect(data.skills[0].items).toEqual(["SQL", "Python", "Tableau", "Excel", "dbt", "Snowflake"]);
  });

  it("handles 'Role at Company' headers, wrapped bullets and missing bullet glyphs", () => {
    const { data } = parseResumeText(
      lines(`
        Priya Shah
        priya@shah.dev
        Experience
        Product Designer at Figma\tMar 2020 – Present
        • Redesigned the onboarding flow, increasing activation
        by 18% across 40K new users
        Interaction Designer at Canva\tJan 2017 – Feb 2020
        Designed the template marketplace browsing experience used by millions of people every month
      `),
    );
    expect(data.experience).toHaveLength(2);
    expect(data.experience[0]).toMatchObject({ role: "Product Designer", company: "Figma", current: true });
    expect(data.experience[0].bullets).toEqual(["Redesigned the onboarding flow, increasing activation by 18% across 40K new users"]);
    expect(data.experience[1]).toMatchObject({ role: "Interaction Designer", company: "Canva", endDate: "Feb 2020" });
    expect(data.experience[1].bullets[0]).toMatch(/^Designed the template marketplace/);
  });

  it("maps awards, volunteering and languages into supported sections", () => {
    const { data } = parseResumeText(
      lines(`
        Chris Doe
        chris@doe.io
        Experience
        Engineer at Acme\t2019 – 2022
        • Built things
        Volunteer Experience
        Mentor at Code Club\t2020 – Present
        • Taught Python to 30 students
        Awards
        Employee of the Year - Acme, 2021
        Languages
        English, Spanish
      `),
    );
    expect(data.experience.map((e) => e.company)).toEqual(["Acme", "Code Club"]);
    expect(data.certifications[0]).toMatchObject({ name: "Employee of the Year", issuer: "Acme", date: "2021" });
    expect(data.skills.find((g) => g.name === "Languages")?.items).toEqual(["English", "Spanish"]);
  });

  it("handles a company header with several roles, tabbed skills, CGPA and paragraph projects", () => {
    // Same structure as a browser-printed resume read through OCR.
    const { data } = parseResumeText(
      lines(`
        Jane Doe
        Backend Developer · Java · Spring Boot
        jane@doe.dev | +91 98765 43210 | linkedin.com/in/janedoe | github.com/janedoe
        EXPERIENCE
        Acme Inc.\tJan 2022 - Present - Pune, MH
        Software Engineer\tJul 2022 - Present
        • Built a streaming pipeline that cut processing time by 40% and removed nightly batch
        jobs entirely across all regions.
        • Designed a GB-
        scale cache layer.
        Software Engineer Intern\tJan 2022 — Jun 2022
        • Automated release notes generation for 12 services.
        SKILLS
        Languages\tJava, Python
        Cloud & CI\tDocker, Kubernetes, Jenkins
        PROJECTS
        Route Planner — Finalist, City Hackathon\tgithub.com
        Plans delivery routes under traffic uncertainty with robust heuristics and
        fallbacks. React, Node.js.
        Schema Viewer\tgithub.com
        Renders SQL schemas in the browser. Next.js, Spring Boot.
        EDUCATION
        BE, Computer Science — Example Institute of Technology - CGPA 8.9/10\tAug 2018 — May 2022
      `),
      ["https://www.linkedin.com/in/janedoe", "https://github.com/janedoe", "https://github.com/janedoe/route-planner", "https://github.com/janedoe/schema-viewer"],
    );
    expect(data.personal).toMatchObject({ fullName: "Jane Doe", headline: "Backend Developer · Java · Spring Boot", phone: "+91 98765 43210" });
    expect(data.experience).toHaveLength(2);
    expect(data.experience[0]).toMatchObject({ role: "Software Engineer", company: "Acme Inc.", location: "Pune, MH", startDate: "Jul 2022", current: true });
    expect(data.experience[0].bullets).toEqual([
      "Built a streaming pipeline that cut processing time by 40% and removed nightly batch jobs entirely across all regions.",
      "Designed a GB-scale cache layer.",
    ]);
    expect(data.experience[1]).toMatchObject({ role: "Software Engineer Intern", company: "Acme Inc.", startDate: "Jan 2022", endDate: "Jun 2022" });
    expect(data.skills.map((g) => [g.name, g.items])).toEqual([
      ["Languages", ["Java", "Python"]],
      ["Cloud & CI", ["Docker", "Kubernetes", "Jenkins"]],
    ]);
    expect(data.projects.map((p) => [p.name, p.link])).toEqual([
      ["Route Planner — Finalist, City Hackathon", "https://github.com/janedoe/route-planner"],
      ["Schema Viewer", "https://github.com/janedoe/schema-viewer"],
    ]);
    expect(data.projects[0].description).toMatch(/^Plans delivery routes .* React, Node\.js\.$/);
    expect(data.education[0]).toMatchObject({
      degree: "BE",
      field: "Computer Science",
      institution: "Example Institute of Technology",
      gpa: "8.9/10",
      startDate: "Aug 2018",
      endDate: "May 2022",
    });
  });

  it("splits 'Role, Company' headers and strips icon-font glyphs", () => {
    const { data } = parseResumeText(
      lines(`
        Sam Lee
        sam@lee.dev
        Experience
        Software Engineer, Contoso Ltd.\tJuly 2023 – Present
        • Shipped the billing service
        Projects
        Route Planner – github.com/samlee 
        • Planned 10K routes per day
      `),
      ["https://github.com/samlee", "https://github.com/samlee/route-planner"],
    );
    expect(data.experience[0]).toMatchObject({ role: "Software Engineer", company: "Contoso Ltd.", startDate: "July 2023", current: true });
    expect(data.projects[0]).toMatchObject({ name: "Route Planner", link: "https://github.com/samlee/route-planner" });
  });

  it("warns when no sections can be found", () => {
    const { data, warnings } = parseResumeText(["Taylor Swift", "taylor@example.com", "Some text without any headings at all."]);
    expect(data.personal.fullName).toBe("Taylor Swift");
    expect(warnings.some((w) => w.includes("No standard section headings"))).toBe(true);
  });

  it("uses link annotations for LinkedIn and GitHub when the text omits them", () => {
    const { data } = parseResumeText(["Sam Rivera", "sam@rivera.me", "Skills", "Go, Rust"], ["https://www.linkedin.com/in/samrivera", "https://github.com/samr"]);
    expect(data.personal.linkedin).toContain("linkedin.com/in/samrivera");
    expect(data.personal.github).toContain("github.com/samr");
  });
});
