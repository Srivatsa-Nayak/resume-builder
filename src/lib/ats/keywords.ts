import { ALIASES, SKILL_TERMS, STOPWORDS } from "./lexicon";

export interface Token {
  /** Original text as written. */
  surface: string;
  /** Lowercased, normalized form. */
  key: string;
  /** Light stem of the key, used for matching. */
  stem: string;
}

export type KeywordImportance = "high" | "medium" | "low";

export interface JobKeyword {
  /** Stemmed phrase used for matching. */
  key: string;
  /** Human-readable form. */
  display: string;
  importance: KeywordImportance;
  /** Number of mentions in the job description. */
  count: number;
  /** Whether the term comes from the known skills dictionary. */
  isSkill: boolean;
}

const TOKEN_RE = /[A-Za-z0-9][A-Za-z0-9+#./&'’]*/g;
const KEEP_SLASH = new Set(["ci/cd", "ui/ux", "tcp/ip", "a/b", "i/o", "b2b/b2c"]);
// Short or ambiguous terms that only count as skills when written capitalized (e.g. "Go", "REST").
const AMBIGUOUS = new Set(["go", "r", "rest", "lean", "spring", "express", "swift", "rail", "spark", "growth", "ui", "lambda", "sale", "operation", "security"]);

/** Very light stemmer applied identically to job descriptions and resumes. */
export function stem(word: string): string {
  let w = word;
  if (/[^a-z]/.test(w) || w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) w = w.slice(0, -3) + "y";
  else if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) w = w.slice(0, -1);
  if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("ed") && w.length > 4) w = w.slice(0, -2);
  if (w.endsWith("e") && w.length > 4) w = w.slice(0, -1);
  return w;
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const normalized = text.replace(/[‐-―]/g, "-").replace(/-/g, " ");
  for (const match of normalized.matchAll(TOKEN_RE)) {
    let surface = match[0].replace(/['’]s$/i, "").replace(/[./&'’]+$/, "");
    if (!surface) continue;
    const lower = surface.toLowerCase();
    const parts = lower.includes("/") && !KEEP_SLASH.has(lower) ? surface.split("/") : [surface];
    for (const part of parts) {
      if (!part) continue;
      surface = part;
      const key = part.toLowerCase();
      tokens.push({ surface, key, stem: stem(key) });
    }
  }
  return tokens;
}

export function stemPhrase(phrase: string): string {
  return tokenize(phrase)
    .map((t) => t.stem)
    .join(" ");
}

interface SkillEntry {
  display: string;
  aliases: string[];
}

/** Map of stemmed phrase -> skill entry (with stemmed aliases). */
const SKILL_INDEX: Map<string, SkillEntry> = (() => {
  const index = new Map<string, SkillEntry>();
  for (const display of SKILL_TERMS) {
    const key = stemPhrase(display);
    if (!key || index.has(key)) continue;
    const aliases = (ALIASES[display.toLowerCase()] ?? []).map(stemPhrase).filter(Boolean);
    index.set(key, { display, aliases });
  }
  return index;
})();

const MAX_PHRASE_TOKENS = 4;

function isContentWord(t: Token): boolean {
  if (STOPWORDS.has(t.key)) return false;
  if (/^\d+([.,]\d+)?%?$/.test(t.key)) return false; // bare numbers
  if (t.key.length < 2) return false;
  return /[a-z]/.test(t.key);
}

function looksLikeProperNoun(t: Token, positionInChunk: number): boolean {
  const s = t.surface;
  if (/^[A-Z0-9+#.&]{2,}$/.test(s) && /[A-Z]/.test(s)) return true; // AWS, SQL, C++
  if (/[a-z][A-Z]/.test(s) || /^[a-z]+[A-Z]/.test(s)) return true; // GraphQL, iOS
  return positionInChunk > 0 && /^[A-Z][a-z]/.test(s);
}

type SectionMode = "normal" | "required" | "preferred" | "ignore";

const MODE_WEIGHT: Record<SectionMode, number> = { normal: 1, required: 1.5, preferred: 0.75, ignore: 0.15 };

function detectMode(line: string): SectionMode | null {
  // Headings are short and never bullets: "Requirements:", "Nice to have", "Benefits".
  if (/^[-•*·▪●–—]/.test(line)) return null;
  const hasColon = line.includes(":");
  const head = line.split(":")[0].trim();
  const words = head.split(/\s+/).length;
  if (head.length > 60 || words > 7 || (!hasColon && words > 4)) return null;
  const h = head.toLowerCase();
  if (/(benefit|perk|about (us|the company)|who we are|compensation|salary|equal opportunity|eeo|our values|why join)/.test(h))
    return "ignore";
  if (/(preferred|nice[ -]to[ -]have|bonus|pluses|desired)/.test(h)) return "preferred";
  if (/(requirement|qualification|must[ -]have|what you('|’)ll (need|bring)|you have|you bring|skills|experience|what we('|’)re looking for|responsibilit|what you('|’)ll do)/.test(h))
    return "required";
  return null;
}

interface Candidate {
  key: string;
  display: string;
  score: number;
  count: number;
  isSkill: boolean;
  properNoun: boolean;
}

/** Extracts the most important keywords and phrases from a job description. */
export function extractJobKeywords(jobDescription: string, limit = 30): JobKeyword[] {
  const candidates = new Map<string, Candidate>();
  const bigrams = new Map<string, { display: string; score: number; count: number; parts: [string, string] }>();
  let mode: SectionMode = "normal";

  const add = (key: string, display: string, weight: number, isSkill: boolean, properNoun = false) => {
    const existing = candidates.get(key);
    if (existing) {
      existing.score += weight;
      existing.count += 1;
      existing.properNoun ||= properNoun;
    } else {
      candidates.set(key, { key, display, score: weight, count: 1, isSkill, properNoun });
    }
  };

  for (const raw of jobDescription.split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) continue;
    const detected = detectMode(line);
    if (detected) {
      mode = detected;
      const rest = line.includes(":") ? line.slice(line.indexOf(":") + 1).trim() : "";
      if (!rest) continue;
      line = rest;
    }
    const emphasis = /\b(required|must|essential)\b/i.test(line) ? 1.25 : 1;
    const weight = MODE_WEIGHT[mode] * emphasis;

    for (const chunk of line.split(/[,;:()|•·▪●•[\]{}!?"“”]|\.\s|\s-\s|\s–\s/)) {
      const toks = tokenize(chunk);
      let i = 0;
      while (i < toks.length) {
        let consumed = 0;
        for (let n = Math.min(MAX_PHRASE_TOKENS, toks.length - i); n >= 1; n--) {
          const slice = toks.slice(i, i + n);
          const key = slice.map((t) => t.stem).join(" ");
          const entry = SKILL_INDEX.get(key);
          if (!entry) continue;
          if (n === 1 && AMBIGUOUS.has(key) && !/[A-Z]/.test(slice[0].surface)) continue;
          add(key, entry.display, weight, true);
          consumed = n;
          break;
        }
        if (consumed) {
          i += consumed;
          continue;
        }
        const t = toks[i];
        if (isContentWord(t)) {
          add(t.stem, t.surface, weight, false, looksLikeProperNoun(t, i));
          const next = toks[i + 1];
          if (next && isContentWord(next) && !SKILL_INDEX.has(next.stem)) {
            const key = `${t.stem} ${next.stem}`;
            const b = bigrams.get(key);
            if (b) {
              b.score += weight;
              b.count += 1;
            } else {
              bigrams.set(key, { display: `${t.surface} ${next.surface}`, score: weight, count: 1, parts: [t.stem, next.stem] });
            }
          }
        }
        i += 1;
      }
    }
  }

  // Promote repeated two-word phrases and discount their component words.
  for (const [key, b] of bigrams) {
    if (b.count < 2) continue;
    candidates.set(key, { key, display: b.display.toLowerCase(), score: b.score, count: b.count, isSkill: false, properNoun: false });
    for (const part of b.parts) {
      const c = candidates.get(part);
      if (c && !c.isSkill) c.score -= b.score;
    }
  }

  const rank = (c: Candidate) => c.score * (c.isSkill ? 1.5 : c.properNoun ? 1.2 : 1);

  return [...candidates.values()]
    .filter((c) => c.score > 0 && (c.isSkill || c.score >= 2 || (c.properNoun && c.score >= 0.9)))
    .sort((a, b) => rank(b) - rank(a) || b.count - a.count)
    .slice(0, limit)
    .map((c) => {
      const r = rank(c);
      const importance: KeywordImportance = r >= 3 ? "high" : r >= 1.5 ? "medium" : "low";
      return {
        key: c.key,
        display: c.isSkill || c.properNoun ? c.display : c.display.toLowerCase(),
        importance,
        count: c.count,
        isSkill: c.isSkill,
      };
    });
}

export interface TextIndex {
  /** Space-padded string of stems for phrase lookups. */
  joined: string;
}

export function buildTextIndex(text: string): TextIndex {
  return { joined: ` ${tokenize(text).map((t) => t.stem).join(" ")} ` };
}

function containsPhrase(index: TextIndex, stemmedPhrase: string): boolean {
  return stemmedPhrase.length > 0 && index.joined.includes(` ${stemmedPhrase} `);
}

/** Whether the resume text mentions a keyword (directly or via a known alias). */
export function textHasKeyword(index: TextIndex, keyword: Pick<JobKeyword, "key">): boolean {
  if (containsPhrase(index, keyword.key)) return true;
  const entry = SKILL_INDEX.get(keyword.key);
  return entry ? entry.aliases.some((alias) => containsPhrase(index, alias)) : false;
}
