import { ResumeDataSchema, type ResumeData } from "./schema";

/**
 * Example content used for template previews and as the starting point for
 * new resumes, so people can see what a strong entry looks like before
 * replacing it with their own.
 */
export function sampleResume(): ResumeData {
  return ResumeDataSchema.parse({
    personal: {
      fullName: "John Doe",
      headline: "Senior Software Engineer",
      email: "john.doe@example.com",
      phone: "+91 98765 43210",
      location: "Bengaluru, India",
      website: "johndoe.dev",
      linkedin: "linkedin.com/in/johndoe",
      github: "github.com/johndoe",
    },
    summary:
      "Senior software engineer with 7+ years of experience building scalable web platforms in TypeScript, React and Node.js. Led teams of up to 6 engineers, cut infrastructure costs by 30% and shipped products used by 2M+ customers.",
    experience: [
      {
        role: "Senior Software Engineer",
        company: "Northwind Labs",
        location: "Bengaluru, India",
        startDate: "Mar 2021",
        endDate: "",
        current: true,
        bullets: [
          "Led migration of a monolithic checkout service to event-driven microservices, reducing p95 latency by 45%",
          "Architected a React design system adopted by 12 product teams, cutting UI development time by 30%",
          "Mentored 6 engineers and introduced code review guidelines that lowered production incidents by 25%",
        ],
      },
      {
        role: "Software Engineer",
        company: "Contoso Retail",
        location: "Pune, India",
        startDate: "Jun 2018",
        endDate: "Feb 2021",
        current: false,
        bullets: [
          "Built REST and GraphQL APIs in Node.js serving 40K requests per minute",
          "Automated CI/CD pipelines with GitHub Actions and Docker, shrinking release cycles from 2 weeks to 2 days",
          "Optimized PostgreSQL queries, improving report generation speed by 3x",
        ],
      },
    ],
    education: [
      {
        institution: "National Institute of Technology Karnataka",
        degree: "B.Tech",
        field: "Computer Science and Engineering",
        location: "Surathkal, India",
        startDate: "2014",
        endDate: "2018",
        gpa: "8.6/10",
        details: "",
      },
    ],
    skills: [
      { name: "Languages", items: ["TypeScript", "JavaScript", "Python", "SQL", "Go"] },
      { name: "Frameworks", items: ["React", "Next.js", "Node.js", "Express", "GraphQL"] },
      { name: "Cloud & Tools", items: ["AWS", "Docker", "Kubernetes", "PostgreSQL", "Redis", "CI/CD"] },
    ],
    projects: [
      {
        name: "OpenMetrics Dashboard",
        link: "github.com/johndoe/openmetrics",
        description: "Open-source observability dashboard for small teams.",
        bullets: ["Grew to 1,200+ GitHub stars and 40 contributors", "Implemented real-time charts with WebSockets"],
      },
    ],
    certifications: [{ name: "AWS Certified Solutions Architect – Associate", issuer: "Amazon Web Services", date: "2022" }],
    design: { pageSize: "A4" },
  });
}
