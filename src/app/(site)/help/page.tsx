import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Download, FileUp, LayoutTemplate, Lightbulb, Sparkles, Target } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { TEMPLATE_CATEGORIES, TEMPLATE_LIST } from "@/lib/resume/templates";

export const metadata: Metadata = {
  title: "Help",
  description: "How to use Resume Builder: choose a template, import a PDF, write with AI, match a job posting and download your resume.",
};

const SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "account", title: "Creating an account" },
  { id: "templates", title: "Choosing a template" },
  { id: "import", title: "Importing a PDF" },
  { id: "editing", title: "Editing your resume" },
  { id: "ai", title: "Writing with AI" },
  { id: "ats", title: "Matching a job posting" },
  { id: "design", title: "Changing the design" },
  { id: "download", title: "Downloading your PDF" },
  { id: "manage", title: "Managing your resumes" },
  { id: "settings", title: "Account and settings" },
  { id: "faq", title: "Common questions" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const QUICK_START = [
  { icon: LayoutTemplate, title: "Pick a template", body: "Browse the gallery and preview any design, no account needed.", href: "#templates" },
  { icon: FileUp, title: "Or import a PDF", body: "Upload the resume you have and edit it here.", href: "#import" },
  { icon: Sparkles, title: "Write with AI", body: "Draft a summary, generate bullets and sharpen weak ones.", href: "#ai" },
  { icon: Target, title: "Match the job", body: "Paste a posting to see your score and missing keywords.", href: "#ats" },
  { icon: Download, title: "Download the PDF", body: "Clean, selectable text that ATS software can read.", href: "#download" },
];

function Section({ id, children }: { id: SectionId; children: ReactNode }) {
  const title = SECTIONS.find((s) => s.id === id)?.title;
  return (
    // scroll-mt clears the sticky navigation bar when jumping to a section.
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-line pt-10 first:border-t-0 first:pt-0">
      <h2 id={`${id}-title`} className="font-display text-3xl text-ink">
        {title}
      </h2>
      <div className="mt-4 flex flex-col gap-4 leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="flex list-decimal flex-col gap-2.5 pl-6 marker:font-medium marker:text-accent">{children}</ol>;
}

function Bullets({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2.5 pl-6 marker:text-muted">{children}</ul>;
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-3 rounded-xl bg-accent-soft px-4 py-3 text-[15px] text-accent-strong">
      <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** A label as it appears in the app, so people can find the button or tab. */
function Ui({ children }: { children: ReactNode }) {
  return <strong className="font-medium text-ink">{children}</strong>;
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line-strong bg-surface px-1.5 py-0.5 font-sans text-[13px] text-ink">{children}</kbd>;
}

function Question({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-line bg-surface px-5 py-4 open:pb-5">
      <summary className="cursor-pointer list-none font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-4">
          {q}
          <span aria-hidden className="text-xl leading-none text-muted transition-transform group-open:rotate-45">
            +
          </span>
        </span>
      </summary>
      <div className="mt-3 leading-relaxed text-ink-soft">{children}</div>
    </details>
  );
}

export default async function HelpPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-6xl">
      <header className="max-w-2xl">
        <p className="font-display text-sm text-accent">Help &amp; guide</p>
        <h1 className="mt-1 font-display text-4xl text-ink sm:text-5xl">How to use Resume Builder</h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-soft">
          Everything from picking a template to downloading a PDF that applicant tracking systems can read. New here? Start with the five steps
          below.
        </p>
      </header>

      <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {QUICK_START.map((s, i) => (
          <li key={s.title}>
            <a
              href={s.href}
              className="flex h-full flex-col rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-md"
            >
              <span className="flex items-center justify-between">
                <s.icon className="size-5 text-accent" aria-hidden />
                <span className="font-display text-sm text-muted">{i + 1}</span>
              </span>
              <span className="mt-4 font-medium text-ink">{s.title}</span>
              <span className="mt-1 text-sm leading-relaxed text-ink-soft">{s.body}</span>
            </a>
          </li>
        ))}
      </ol>

      <div className="mt-14 grid gap-12 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="hidden lg:block">
          <div className="sticky top-24">
            <p className="text-sm font-medium text-ink">On this page</p>
            <ul className="mt-3 flex flex-col gap-0.5 border-l border-line">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1 pl-4 text-sm text-muted hover:border-ink hover:text-ink">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="flex max-w-3xl flex-col gap-10">
          <Section id="getting-started">
            <p>Building a resume takes four steps, and you can come back to any of them later:</p>
            <Steps>
              <li>
                <Ui>Start</Ui> from one of {TEMPLATE_LIST.length} templates, or import a PDF of the resume you already have.
              </li>
              <li>
                <Ui>Fill in</Ui> each section of the step-by-step builder, with AI help for your summary and bullet points.
              </li>
              <li>
                <Ui>Check</Ui> your resume against a job posting to find missing keywords and weak spots.
              </li>
              <li>
                <Ui>Download</Ui> a PDF and apply.
              </li>
            </Steps>
            <Tip>
              You can browse and preview every template without an account. When you click <Ui>Use this template</Ui>, we&apos;ll ask you to sign in
              or create an account, then take you straight into that design.
            </Tip>
          </Section>

          <Section id="account">
            <Steps>
              <li>
                Click <Ui>Create account</Ui> in the top right corner.
              </li>
              <li>Enter your name, email and a password of at least 8 characters. If Google or GitHub buttons are shown, you can use those instead.</li>
              <li>You&apos;ll land on your dashboard, where your resumes live.</li>
            </Steps>
            <p>Your name and email are filled into every new resume automatically, so you don&apos;t have to type them each time.</p>
          </Section>

          <Section id="templates">
            <Steps>
              <li>
                Open <Ui>Templates</Ui> from the navigation bar.
              </li>
              <li>
                Search by style, layout or font (try &ldquo;sidebar&rdquo;, &ldquo;serif&rdquo;, &ldquo;timeline&rdquo; or &ldquo;Poppins&rdquo;), or
                filter by category: {TEMPLATE_CATEGORIES.join(", ")}.
              </li>
              <li>
                Click a template to preview it full size with example content. Try the color swatches and check its ATS friendliness rating.
              </li>
              <li>
                Click <Ui>Use this template</Ui>. A new resume opens in that design and color, filled with example content you replace with your own.
              </li>
            </Steps>
            <Tip>
              Applying to large companies with strict screening software? Templates rated <Ui>Excellent</Ui> use a single column and standard
              headings, which every ATS reads cleanly. You can switch templates later without losing anything you&apos;ve written.
            </Tip>
            <p>
              Shortcuts in the gallery: press <Kbd>/</Kbd> to jump to search, <Kbd>←</Kbd> and <Kbd>→</Kbd> to flip between templates in the
              preview, and <Kbd>Esc</Kbd> to close it.
            </p>
          </Section>

          <Section id="import">
            <Steps>
              <li>
                On your dashboard, click <Ui>Import PDF</Ui> and choose your file (up to 5 MB; the first 10 pages are read).
              </li>
              <li>We read the text, detect your sections and fill in the builder for you.</li>
              <li>Review each step. A note at the top of the editor says how the file was read and flags anything worth checking.</li>
            </Steps>
            <p>
              Scanned resumes, and some files saved with a browser&apos;s &ldquo;Print to PDF&rdquo;, store text as images. For those we run text
              recognition, which adds a few seconds and can occasionally misread a character, so give the result a careful read.
            </p>
          </Section>

          <Section id="editing">
            <p>The builder walks through your resume one section at a time:</p>
            <p className="flex flex-wrap gap-1.5">
              {["Personal", "Summary", "Experience", "Education", "Skills", "Projects", "Certifications", "Finish"].map((s) => (
                <span key={s} className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-ink">
                  {s}
                </span>
              ))}
            </p>
            <Bullets>
              <li>Jump to any section from the row of step buttons. Projects and Certifications are optional.</li>
              <li>Changes save automatically as you type; the indicator next to the title shows when they&apos;re saved.</li>
              <li>
                The live preview beside the form shows exactly what you&apos;ll download, with dashed lines where pages break. On a phone, switch
                between <Ui>Edit</Ui> and <Ui>Preview</Ui> at the top.
              </li>
              <li>Rename a resume by clicking its title at the top of the editor.</li>
              <li>Use the arrows next to a bullet point to reorder it. Strong bullets follow a pattern: action, what you did, and a measurable result.</li>
              <li>
                The <Ui>Finish</Ui> step lists every section and flags the ones that still need attention.
              </li>
            </Bullets>
          </Section>

          <Section id="ai">
            <Bullets>
              <li>
                <Ui>Summary:</Ui> click <Ui>Write with AI</Ui> (or <Ui>Rewrite with AI</Ui>) for a draft based on your experience. Add a target role
                to focus it. Fill in your experience first for a better result.
              </li>
              <li>
                <Ui>Experience:</Ui> <Ui>Generate bullets</Ui> adds bullet points for the job title below the ones you have; edit or remove any
                you don&apos;t want. The sparkle button next to a bullet, <Ui>Improve with AI</Ui>, suggests a stronger rewrite.
              </li>
              <li>
                <Ui>ATS check:</Ui> once you&apos;ve pasted a job posting, <Ui>Get AI tailoring tips</Ui> suggests how to tailor your resume to it.
              </li>
            </Bullets>
            <p>AI never overwrites what you&apos;ve written: a rewritten summary or bullet appears as a suggestion, and you choose to use it or discard it.</p>
            <p>
              <Ui>Which AI answers?</Ui> If you&apos;ve added your own API key in <Ui>Settings → AI providers</Ui>, your requests use it with no daily
              limit. Otherwise the site&apos;s shared AI is used when it&apos;s available, up to a daily allowance. If neither is available, a
              built-in writing assistant still gives suggestions, so AI features always work.
            </p>
          </Section>

          <Section id="ats">
            <p>
              Many employers use an applicant tracking system (ATS) that searches resumes for the job&apos;s keywords before a person reads them.
              The ATS check shows you what it would find.
            </p>
            <Steps>
              <li>
                In the editor, open the <Ui>ATS check</Ui> tab and paste the job description. It&apos;s saved with that resume.
              </li>
              <li>
                Read your <Ui>job match score</Ui> (out of 100), broken down into keyword match, impact and action verbs, completeness, and formatting
                and length.
              </li>
              <li>
                Check <Ui>Missing keywords</Ui>. Next to a missing skill, click <Ui>+</Ui> to add it to your skills section; only add skills you
                really have.
              </li>
              <li>
                Work through <Ui>Top fixes</Ui> and <Ui>Bullets to strengthen</Ui>, then watch the score update as you edit.
              </li>
            </Steps>
            <p>Without a job description, you get a resume health score based on completeness, impact and formatting.</p>
            <Tip>Applying to several jobs? Duplicate your resume from the dashboard and tailor one copy per posting.</Tip>
          </Section>

          <Section id="design">
            <p>
              Open the <Ui>Design</Ui> tab in the editor to:
            </p>
            <Bullets>
              <li>switch to another template (everything you&apos;ve written carries over),</li>
              <li>
                choose an accent color, or click <Ui>Custom</Ui> to pick any color,
              </li>
              <li>set the page size to A4 or US Letter.</li>
            </Bullets>
          </Section>

          <Section id="download">
            <p>
              Click <Ui>Download PDF</Ui> at the top of the editor or on the Finish step. The PDF uses real, selectable text with the fonts embedded,
              so applicant tracking systems can read every word.
            </p>
            <p>Page breaks in the live preview are close but approximate; the downloaded PDF is the final version.</p>
          </Section>

          <Section id="manage">
            <Bullets>
              <li>Your dashboard shows every resume with a thumbnail and its latest ATS score. Click one to keep editing.</li>
              <li>
                <Ui>Duplicate</Ui> makes a copy, handy for tailoring to different jobs. <Ui>Delete</Ui> removes a resume permanently.
              </li>
              <li>
                <Ui>New resume</Ui> opens the template gallery.
              </li>
            </Bullets>
          </Section>

          <Section id="settings">
            <Bullets>
              <li>
                <Ui>AI providers:</Ui> add an OpenRouter, OpenAI, Anthropic or Gemini API key. It&apos;s tested when you save, encrypted before
                it&apos;s stored, and never shown again (only its last 4 characters). You can also choose a specific model, and a preferred provider
                if you add more than one key.
              </li>
              <li>
                <Ui>Account:</Ui> change your display name, and change your password (or set one if you signed up with Google or GitHub). Changing
                your password signs you out on your other devices.
              </li>
              <li>
                <Ui>Delete account:</Ui> permanently removes your account, all your resumes and any saved API keys.
              </li>
            </Bullets>
          </Section>

          <Section id="faq">
            <div className="flex flex-col gap-3">
              <Question q="Do I need an account to look around?">
                No. You can browse and preview every template without one. You only need an account to create and save a resume.
              </Question>
              <Question q="Do I need an API key to use the AI features?">
                No. AI features work without one. Adding your own key lets you use the model you prefer with no daily limit.
              </Question>
              <Question q="Which template is safest for applicant tracking systems?">
                Templates rated Excellent: a single column with standard headings. Two-column designs read well in most modern systems, but a
                single column is the safest choice for very strict ones.
              </Question>
              <Question q="My imported resume doesn't look right. What can I do?">
                Unusual layouts don&apos;t always import cleanly. Go through each step and move anything that landed in the wrong place. Imports are
                most accurate when AI is available, so adding your own API key in Settings can help.
              </Question>
              <Question q="Why does my resume look different from the example?">
                New resumes start with example content so you can see the design filled in. Replace each section with your own details; the layout
                adapts as you go.
              </Question>
              <Question q="Who can see my resumes?">
                Only you. Your resumes are tied to your account, and other people can&apos;t open them.
              </Question>
            </div>
          </Section>

          <div className="rounded-2xl bg-ink p-8 text-white">
            <h2 className="font-display text-2xl">Ready to start?</h2>
            <p className="mt-2 text-white/75">Pick a design you like and replace the example content with your own.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/templates" className={buttonClass("primary", "lg")}>
                Browse templates
              </Link>
              <Link
                href={user ? "/dashboard" : "/signup"}
                className={buttonClass("secondary", "lg", "border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/15")}
              >
                {user ? "Go to dashboard" : "Create an account"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
