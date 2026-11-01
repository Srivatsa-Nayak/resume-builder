// Word lists used by the ATS scorer. Kept as plain data so they are easy to extend.

/** Common English stopwords plus filler words that show up in most job descriptions. */
export const STOPWORDS = new Set(
  `a about above across after again against all almost along already also although always am among an and another any
anyone anything are around as at away back be became because become becomes been before being below best better between
both but by can cannot could did do does doing done down during each either else enough etc even ever every few for from
further get gets getting give given go goes going good got great had has have having he her here hers him his how however
i if in including into is it its itself just keep know known least less let like likely made make makes making many may
me might more most much must my need needed needs new no nor not now of off often on once one only onto or other others
our ours out over own part per please plus put quite rather really same see seem should show since so some something
such take than that the their them then there these they thing things this those though through throughout thus to
together too toward towards under until up upon us use used uses using very via want was way ways we well were what
whatever when where whether which while who whom whose why will with within without would yet you your yours yourself
able ability abilities across work working works worked job jobs role roles position positions candidate candidates
team teams company companies opportunity opportunities experience experiences experienced year years month months day
days time strong excellent proven demonstrated solid deep high highly level levels plus preferred required requirements
requirement require requires responsibilities responsibility responsible qualifications qualification skill skills
including include includes join joining looking seeking ideal ideally etc e.g i.e eg ie environment environments
fast-paced fast paced dynamic passionate passion motivated self-starter self starter detail-oriented oriented
understanding knowledge familiarity familiar comfortable proficient proficiency hands-on hands related relevant
equivalent degree bachelor bachelors bachelor's master masters master's field fields minimum least across day-to-day
help helping ensure ensuring support supporting provide providing build building develop developing create creating
across based within around world-class best-in-class industry leading closely partner partners other others plus
benefits benefit salary compensation equal employer gender race religion disability veteran status applicants
apply application location remote hybrid office onsite full-time part-time time full company's we're you're you'll
we'll they're it's what's who's day week weekly daily new strong stronger great greater good better ideal
range wide variety multiple various several key core main primary across overall end end-to-end
senior junior mid entry self starter detail about description summary overview`
    .split(/\s+/)
    .filter(Boolean),
);

/**
 * Known skills and multi-word phrases, written in their preferred display form.
 * Matching is case-insensitive.
 */
export const SKILL_TERMS: string[] = [
  // Languages
  "JavaScript", "TypeScript", "Python", "Java", "Kotlin", "Swift", "Objective-C", "Go", "Golang", "Rust", "Ruby", "PHP",
  "C++", "C#", "Scala", "Elixir", "Haskell", "Perl", "R", "MATLAB", "SQL", "NoSQL", "Bash", "PowerShell", "HTML", "CSS",
  "Sass", "Dart", "Solidity", "COBOL", "Fortran", "VBA",
  // Frameworks & libraries
  "React", "React Native", "Next.js", "Vue", "Vue.js", "Nuxt", "Angular", "Svelte", "Redux", "Node.js", "Express",
  "NestJS", "Django", "Flask", "FastAPI", "Spring", "Spring Boot", "Rails", "Ruby on Rails", "Laravel", ".NET",
  "ASP.NET", "Flutter", "jQuery", "Tailwind CSS", "Bootstrap", "GraphQL", "REST", "REST API", "RESTful APIs", "gRPC",
  "WebSockets", "TensorFlow", "PyTorch", "Keras", "scikit-learn", "Pandas", "NumPy", "Spark", "Apache Spark", "Hadoop",
  "Kafka", "Airflow", "dbt", "LangChain", "OpenAI", "Hugging Face",
  // Data & infra
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB", "Cassandra", "Snowflake", "BigQuery",
  "Redshift", "Oracle", "SQL Server", "SQLite", "Firebase", "Supabase", "AWS", "Azure", "GCP", "Google Cloud",
  "Docker", "Kubernetes", "Terraform", "Ansible", "Jenkins", "GitHub Actions", "GitLab CI", "CircleCI", "CI/CD",
  "Linux", "Unix", "Nginx", "Serverless", "Lambda", "EC2", "S3", "CloudFormation", "Prometheus", "Grafana", "Datadog",
  "Splunk", "New Relic", "Git", "GitHub", "GitLab", "Jira", "Confluence", "Microservices", "Distributed Systems",
  "System Design", "Cloud Computing", "Infrastructure as Code", "DevOps", "SRE", "Site Reliability Engineering",
  "Networking", "TCP/IP", "DNS", "Security", "Cybersecurity", "OAuth", "SSO", "Penetration Testing", "SIEM",
  // AI / data science
  "Machine Learning", "Deep Learning", "Artificial Intelligence", "Natural Language Processing", "NLP",
  "Computer Vision", "Generative AI", "LLM", "LLMs", "Large Language Models", "Prompt Engineering", "Data Science",
  "Data Analysis", "Data Analytics", "Data Engineering", "Data Visualization", "Data Modeling", "Data Warehousing",
  "ETL", "Statistics", "Statistical Analysis", "A/B Testing", "Experimentation", "Predictive Modeling",
  "Business Intelligence", "Tableau", "Power BI", "Looker", "Excel", "Google Analytics", "SAS", "SPSS",
  // Engineering practice
  "Agile", "Scrum", "Kanban", "Test-Driven Development", "TDD", "Unit Testing", "Integration Testing",
  "Automated Testing", "Test Automation", "QA", "Quality Assurance", "Selenium", "Cypress", "Playwright", "Jest",
  "Code Review", "Object-Oriented Programming", "OOP", "Functional Programming", "Design Patterns", "API Design",
  "Performance Optimization", "Scalability", "Accessibility", "WCAG", "Responsive Design", "Mobile Development",
  "Web Development", "Frontend", "Front-End", "Backend", "Back-End", "Full-Stack", "Full Stack", "Embedded Systems",
  "iOS", "Android",
  // Design
  "Figma", "Sketch", "Adobe XD", "Photoshop", "Illustrator", "InDesign", "Adobe Creative Suite", "UX", "UI",
  "UI/UX", "User Experience", "User Interface", "User Research", "Usability Testing", "Wireframing", "Prototyping",
  "Interaction Design", "Visual Design", "Design Systems", "Information Architecture",
  // Business & product
  "Product Management", "Product Strategy", "Roadmapping", "Product Roadmap", "Go-to-Market", "Market Research",
  "Competitive Analysis", "Project Management", "Program Management", "Stakeholder Management", "PMP",
  "Change Management", "Risk Management", "Budgeting", "Forecasting", "Financial Modeling", "Financial Analysis",
  "Accounting", "GAAP", "Auditing", "Compliance", "Operations", "Supply Chain", "Logistics", "Procurement",
  "Vendor Management", "Process Improvement", "Lean", "Six Sigma", "KPIs", "OKRs", "P&L",
  "Strategic Planning", "Business Development", "Sales", "B2B", "B2C", "SaaS", "CRM", "Salesforce", "HubSpot",
  "Lead Generation", "Account Management", "Customer Success", "Customer Service", "Customer Experience",
  "Negotiation", "Marketing", "Digital Marketing", "Content Marketing", "Email Marketing", "SEO", "SEM", "PPC",
  "Social Media", "Brand Strategy", "Copywriting", "Marketing Automation", "Growth", "E-commerce",
  "Recruiting", "Talent Acquisition", "Onboarding", "Employee Relations", "HRIS", "Payroll",
  "Leadership", "People Management", "Mentoring", "Coaching", "Cross-Functional", "Communication",
  "Public Speaking", "Presentation", "Problem Solving", "Critical Thinking", "Collaboration", "Time Management",
  "Healthcare", "HIPAA", "EHR", "Patient Care", "Clinical Research", "GDPR", "SOX", "ISO 27001", "SOC 2",
];

/** Aliases that should count as a match for a canonical term (all lowercase). */
export const ALIASES: Record<string, string[]> = {
  javascript: ["js", "ecmascript", "es6"],
  typescript: ["ts"],
  kubernetes: ["k8s"],
  aws: ["amazon web services"],
  gcp: ["google cloud", "google cloud platform"],
  "google cloud": ["gcp"],
  postgresql: ["postgres", "psql"],
  "machine learning": ["ml"],
  "artificial intelligence": ["ai"],
  "natural language processing": ["nlp"],
  nlp: ["natural language processing"],
  "ci/cd": ["continuous integration", "continuous delivery", "continuous deployment", "cicd"],
  "user experience": ["ux"],
  ux: ["user experience"],
  "user interface": ["ui"],
  "node.js": ["node", "nodejs"],
  react: ["react.js", "reactjs"],
  "next.js": ["nextjs"],
  "vue.js": ["vue", "vuejs"],
  vue: ["vue.js", "vuejs"],
  go: ["golang"],
  golang: ["go"],
  "c#": ["csharp"],
  ".net": ["dotnet", ".net core"],
  "rest api": ["rest", "restful", "restful apis", "rest apis"],
  rest: ["restful", "rest api"],
  "restful apis": ["rest", "rest api", "restful"],
  "test-driven development": ["tdd"],
  tdd: ["test-driven development"],
  "large language models": ["llm", "llms"],
  llm: ["llms", "large language models"],
  llms: ["llm", "large language models"],
  "full-stack": ["full stack", "fullstack"],
  "full stack": ["full-stack", "fullstack"],
  "front-end": ["frontend", "front end"],
  frontend: ["front-end", "front end"],
  "back-end": ["backend", "back end"],
  backend: ["back-end", "back end"],
  "site reliability engineering": ["sre"],
  sre: ["site reliability engineering"],
  "quality assurance": ["qa"],
  qa: ["quality assurance"],
  "object-oriented programming": ["oop", "object oriented"],
  kpis: ["kpi"],
  okrs: ["okr"],
  "people management": ["managed a team", "team management", "managing a team"],
  "ruby on rails": ["rails"],
};

/** Strong action verbs (past and present forms) that should open a bullet point. */
export const ACTION_VERBS = new Set(
  `accelerated accomplished achieved acquired adapted administered advanced advised advocated allocated analyzed
anticipated applied appointed appraised approved architected arranged assembled assessed audited augmented authored
automated balanced boosted briefed budgeted built calculated campaigned captured catalyzed centralized chaired
championed clarified coached collaborated combined commissioned communicated compiled completed composed computed
conceived conceptualized conducted consolidated constructed consulted contracted contributed controlled converted
convinced coordinated corrected counseled crafted created cultivated cut debugged decreased defined delegated delivered
demonstrated deployed designed detected determined developed devised diagnosed directed discovered dispatched
documented doubled drafted drove earned edited educated effected eliminated enabled encouraged engineered enhanced
enlarged established evaluated examined exceeded executed expanded expedited experimented explored extended
fabricated facilitated finalized fixed forecasted forged formalized formed formulated fostered founded generated
grew guided halved handled headed identified implemented improved increased influenced informed initiated innovated
inspected inspired installed instituted instructed integrated interpreted interviewed introduced invented
investigated launched lectured led leveraged lifted maintained managed mapped marketed maximized measured mediated
mentored merged migrated minimized mobilized modeled modernized monitored motivated navigated negotiated
normalized optimized orchestrated organized originated outperformed overhauled oversaw partnered performed persuaded
piloted pioneered planned prepared presented prioritized produced programmed projected promoted proposed prototyped
provided published raised ran rebuilt received recommended reconciled recruited redesigned reduced refactored
refined regulated rehabilitated reinforced remodeled reorganized repaired replaced reported represented researched
resolved restructured revamped reviewed revised revitalized saved scaled scheduled scoped screened secured
selected served shaped simplified slashed solved spearheaded specified sped standardized steered streamlined
strengthened structured succeeded summarized supervised supported surpassed surveyed sustained systematized
tackled targeted taught tested tracked trained transformed translated tripled troubleshot uncovered unified
upgraded validated verified visualized won wrote
lead build drive run grow write make sell teach win cut oversee spearhead own architect ship shipped own owned`
    .split(/\s+/)
    .filter(Boolean),
);

/** Phrases that weaken bullet points. */
export const WEAK_PHRASES = [
  "responsible for",
  "duties included",
  "duties include",
  "tasked with",
  "in charge of",
  "worked on",
  "helped",
  "helped with",
  "assisted",
  "assisted with",
  "involved in",
  "participated in",
  "handled various",
  "various tasks",
  "worked with",
];

/** Suggested stronger replacements for weak openers. */
export const WEAK_REPLACEMENTS: Record<string, string> = {
  "responsible for": "Managed",
  "duties included": "Delivered",
  "duties include": "Delivered",
  "tasked with": "Executed",
  "in charge of": "Led",
  "worked on": "Developed",
  "helped with": "Contributed to",
  helped: "Supported",
  "assisted with": "Supported",
  assisted: "Supported",
  "involved in": "Contributed to",
  "participated in": "Contributed to",
  "worked with": "Collaborated with",
};

export const FIRST_PERSON = /\b(i|me|my|mine|myself)\b/i;
