# Resume Builder

An AI-powered resume builder: write with an AI assistant, choose an ATS-friendly template, import an existing PDF, and score your resume against a job description.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma · @react-pdf/renderer · pdf.js (unpdf)**.

## Quick start

Requirements: **Node.js 20.9+** (tested on Node 24), npm, and a **PostgreSQL** database (a free Neon database works; see [Deploying to Vercel](#deploying-to-vercel)).

```bash
npm install        # installs dependencies and generates the Prisma client
npm run setup      # creates .env with fresh secrets (edit DATABASE_URL / DATABASE_URL_UNPOOLED first), then creates the tables
npm run dev        # http://localhost:3000
```

Open http://localhost:3000, create an account and you're in. **No API keys are required**: without one, the built-in offline writing assistant handles AI features.

### Turning on AI

Pick one or both:

- **Platform AI (for every user):** set one of `OPENROUTER_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `GEMINI_API_KEY` in `.env` (and `PLATFORM_AI_PROVIDER`), then restart the server. Each user gets `PLATFORM_AI_DAILY_LIMIT` requests per day. With OpenRouter, pick any model via `OPENROUTER_MODEL` (default `anthropic/claude-sonnet-5.5`; see https://openrouter.ai/models).
- **Bring your own key (per user):** in the app go to **Settings → AI providers**, paste a key and click **Save key**. It's tested automatically, and from then on that user's requests go through their key with no daily limit.

### Optional: Google / GitHub sign-in

Create OAuth apps and add the client ID and secret to `.env`. Callback URLs:

- Google: `{APP_URL}/api/auth/oauth/google/callback`
- GitHub: `{APP_URL}/api/auth/oauth/github/callback`

The buttons appear on the sign-in page automatically once configured.

### Production

```bash
npm run build
npm start
```

Set `APP_URL` to your public URL and serve over HTTPS (session cookies are `Secure` in production).

### Deploying to Vercel

1. **Push the repo to GitHub and import it in Vercel** (Add New → Project). The defaults are correct: Next.js preset, `npm install`, `next build`.
2. **Create the database:** in the Vercel project, go to **Storage → Create Database → Neon (Postgres)** and connect it to the project. This adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically.
3. **Add environment variables** (Settings → Environment Variables), for Production and Preview:
   - `AUTH_SECRET` and `ENCRYPTION_KEY`: generate each with `openssl rand -base64 32`. **Never change `ENCRYPTION_KEY` afterwards**: users' saved API keys are encrypted with it.
   - `APP_URL`: your site URL, e.g. `https://your-app.vercel.app`.
   - `PLATFORM_AI_PROVIDER=openrouter`, `OPENROUTER_API_KEY`, optionally `OPENROUTER_MODEL` and `PLATFORM_AI_DAILY_LIMIT`.
   - Optional OAuth: `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET` (callback URLs use `APP_URL`).
4. **Create the tables** once, from your machine, using the database's connection strings (copy them from Storage → your database → `.env.local` tab into your local `.env`):
   ```bash
   npx prisma db push
   ```
   Repeat this whenever `prisma/schema.prisma` changes.
5. **Deploy** (or redeploy so the new variables apply), then check: sign up, open a template, download a PDF, and import a PDF (including a browser-printed one, which uses OCR).

Notes for serverless hosting:
- Slow routes declare `maxDuration` (60s for imports/AI, 30s for previews). If your plan allows less, imports with OCR may time out; Pro plans allow longer.
- Template preview images are cached by Vercel's CDN (`s-maxage`), so each is rendered once per deployment.
- Login/AI rate limits are kept in memory per instance, so they are looser on serverless. For strict limits, back `src/lib/rate-limit.ts` with Upstash Redis (available in the Vercel Marketplace).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run setup` | Create `.env` (never overwrites existing values) and sync the database |
| `npm test` | Run the test suite (Vitest) |
| `npm run typecheck` | TypeScript check |
| `npm run db:studio` | Browse the database with Prisma Studio |

## Features

| Area | What's included |
| --- | --- |
| **Auth** | Email/password (bcrypt), optional Google/GitHub OAuth, signed JWT session cookie (httpOnly, SameSite=Lax), session revocation on password change, login rate limiting |
| **Public pages** | Landing page, template gallery and a help guide (`/help`) are open to visitors, with a shared navigation bar (menu on phones). Visitors can browse and preview every template; **Use this template** asks them to sign in or create an account, then creates the resume in the template and color they picked and opens the editor |
| **Dashboard** | Resume cards with live thumbnails and ATS score, duplicate, delete, PDF import |
| **Builder** | Step-by-step wizard (Personal → Summary → Experience → Education → Skills → Projects → Certifications → Finish), autosave, live side-by-side preview with page-break guides |
| **Templates** | 28 templates across Professional, Modern, Creative, Minimalist and Simple: header bands, colored, dark and tinted sidebars, timelines, skill tags and 17 embedded Google Fonts. New resumes start from example content to edit. Accent colors; A4 (default) or US Letter |
| **Template gallery** | Canva-style grid, most distinctive designs first, with search (name, category, font or design feature such as "sidebar" or "timeline") and category filters. Grid images are rendered on the server from the real PDF as lossless PNGs (400–1300px, cached in memory, pre-rendered at startup in production via `src/instrumentation.ts`). Clicking a template opens a full-size preview rendered as real text (always sharp) with color choices, design details, ATS guidance and similar templates; ← and → move between templates |
| **PDF export** | Generated in the browser with `@react-pdf/renderer`. Fonts are embedded and subset, so text stays selectable and ATS-readable. No hyphenation or letter-spacing that would break parsing |
| **PDF import** | Text extraction with pdf.js, line reconstruction, two-column detection, then AI structuring (when available) or a heuristic parser. OCR fallback (Tesseract) for scanned PDFs and for browser "Print to PDF" files where some text is drawn as shapes. Rows the text layer captured fully keep their exact text, and users are warned that ATS systems can't read the missing text |
| **AI assistant** | Generate bullets from a job title, improve a bullet (shown as a suggestion you accept or dismiss), write a summary, and job-tailoring tips |
| **BYOK** | Per-user OpenRouter / OpenAI / Anthropic / Gemini keys, encrypted with AES-256-GCM (bound to the user), never returned to the browser; optional model override and preferred provider |
| **ATS scoring** | Keyword extraction from the job description (skills dictionary, aliases like k8s → Kubernetes, required vs. nice-to-have weighting), action-verb and quantification analysis, 17 structural checks, missing-keyword chips with one-click "add to skills" |

### How AI requests are routed (`src/lib/ai/router.ts`)

1. **User's own key** if one is saved (their preferred provider first). If it fails, the user sees the error; the app doesn't silently spend platform credits.
2. **Platform key** from `.env`, if the user is under the daily quota.
3. **Offline assistant**: a rule-based fallback that's always available.

Every response tells the UI which engine was used.

## Project structure

```
prisma/schema.prisma        Users, OAuth accounts, resumes, encrypted API keys, AI usage
src/proxy.ts                Route protection + cross-origin mutation blocking
src/app/                    Pages (landing, auth, dashboard, templates, help, settings, editor) and API routes; `(site)` holds the public pages
src/components/editor/      Wizard steps, bullet editor, ATS panel, design panel, live preview
src/components/resume/      Resume layout, written once and shared by the preview and the PDF (ResumeLayout.tsx), plus the HTML preview
src/components/pdf/         PDF export (react-pdf primitives, font registration)
src/lib/resume/templates.ts Template definitions: each one combines a layout, header style, fonts, headings and colors
public/fonts/               Embedded template fonts (OFL licensed); refresh with `node scripts/fetch-fonts.mjs`
src/lib/ai/                 Provider clients, prompts, routing, offline assistant
src/lib/ats/                Keyword extraction, lexicons and the scoring engine
src/lib/pdf/                PDF text extraction and the heuristic resume parser
src/lib/resume/             Resume schema (zod), templates, theme tokens, sample data
```

## Database

PostgreSQL via Prisma (`prisma/schema.prisma`). Any Postgres works (Neon, Supabase, local Docker): set `DATABASE_URL` (pooled, used by the app) and `DATABASE_URL_UNPOOLED` (direct, used for schema changes; can be the same URL if your database has no pooler), then run `npx prisma db push`. To move to versioned migrations later, use `npx prisma migrate dev --name init`.

## Testing

`npm test` runs 86 tests, including a **PDF round trip** for all 28 templates: export the sample resume to PDF, re-import it with the parser, and assert that contact details, jobs, bullets, education, skills, projects and certifications all come back intact. Other suites cover ATS scoring, the job-description keyword extractor, the parser on varied real-world layouts, the offline assistant, AI output parsing, encryption and redirect safety.

## Security notes

- API keys: AES-256-GCM with a random IV and the `userId:provider` as associated data, so ciphertext copied into another user's row won't decrypt. Only the last 4 characters are ever sent to the client. Rotating `ENCRYPTION_KEY` makes stored keys unreadable, and users are asked to re-enter them.
- Every resume query is scoped to the signed-in user; other users get a 404.
- Mutating API requests with a foreign `Origin` are rejected (in addition to SameSite cookies).
- Rate limits: login, sign-up, AI requests, key tests and imports. They're in-memory, so use Redis if you run multiple instances.
- Uploads: 5 MB limit, PDF magic-byte check, first 10 pages only.

## Known limitations

- OCR runs only when the text layer looks incomplete. It covers the first 3 pages and adds roughly 5–15 seconds to an import. OCR-only text can contain occasional misread characters.
- The heuristic parser handles common layouts well, but unusual designs import best with an AI key configured.
- Preview page breaks are approximate; the downloaded PDF is authoritative.
