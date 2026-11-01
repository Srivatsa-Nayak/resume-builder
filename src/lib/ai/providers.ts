// Thin fetch-based clients for each supported AI provider. Keeping these
// dependency-free makes it easy to add providers or swap models.

export const PROVIDERS = ["openrouter", "anthropic", "openai", "gemini"] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openrouter: "OpenRouter",
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && (PROVIDERS as readonly string[]).includes(value);
}

export function defaultModel(provider: ProviderId): string {
  switch (provider) {
    case "openrouter":
      return process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-5.5";
    case "anthropic":
      return process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
    case "openai":
      return process.env.OPENAI_MODEL || "gpt-5-mini";
    case "gemini":
      return process.env.GEMINI_MODEL || "gemini-2.5-flash";
  }
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly provider: ProviderId,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export interface CompletionRequest {
  provider: ProviderId;
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  maxTokens?: number;
}

const TIMEOUT_MS = 60_000;

async function post(provider: ProviderId, url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timed out" : "could not be reached";
    throw new AiProviderError(`${PROVIDER_LABELS[provider]} ${reason}.`, 504, provider);
  }
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } | string } | null;
  if (!res.ok) {
    const detail = typeof json?.error === "string" ? json.error : json?.error?.message;
    const hint =
      res.status === 401 || res.status === 403
        ? "The API key was rejected."
        : res.status === 429
          ? "Rate limit or quota exceeded."
          : res.status === 404
            ? "The model was not found. Check the model name."
            : "The request failed.";
    // Provider error messages never contain the key itself, but trim them to be safe.
    throw new AiProviderError(`${PROVIDER_LABELS[provider]}: ${hint}${detail ? ` (${String(detail).slice(0, 200)})` : ""}`, res.status, provider);
  }
  return json;
}

async function anthropic(req: CompletionRequest): Promise<string> {
  const json = (await post(
    "anthropic",
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": req.apiKey, "anthropic-version": "2023-06-01" },
    {
      model: req.model,
      max_tokens: req.maxTokens ?? 2048,
      system: req.system,
      messages: [{ role: "user", content: req.prompt }],
    },
  )) as { content?: { type: string; text?: string }[] };
  return (json.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
}

async function openai(req: CompletionRequest): Promise<string> {
  // Optional sampling/token parameters are omitted: newer reasoning models reject them.
  const json = (await post(
    "openai",
    "https://api.openai.com/v1/chat/completions",
    { Authorization: `Bearer ${req.apiKey}` },
    {
      model: req.model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.prompt },
      ],
    },
  )) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

/** OpenRouter: one OpenAI-compatible API in front of many models ("anthropic/claude-sonnet-5.5", "openai/gpt-6-luna", …). */
async function openrouter(req: CompletionRequest): Promise<string> {
  const json = (await post(
    "openrouter",
    "https://openrouter.ai/api/v1/chat/completions",
    {
      Authorization: `Bearer ${req.apiKey}`,
      // Optional attribution headers shown on the OpenRouter dashboard.
      "HTTP-Referer": process.env.APP_URL || "http://localhost:3000",
      "X-Title": "Resume Builder",
    },
    {
      model: req.model,
      max_tokens: req.maxTokens ?? 2048,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.prompt },
      ],
    },
  )) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? "";
}

async function gemini(req: CompletionRequest): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent`;
  const json = (await post(
    "gemini",
    url,
    { "x-goog-api-key": req.apiKey },
    {
      systemInstruction: { parts: [{ text: req.system }] },
      // maxOutputTokens is left at the model default: thinking models count
      // reasoning tokens against it, and a low cap truncates the answer.
      contents: [{ role: "user", parts: [{ text: req.prompt }] }],
    },
  )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
}

export async function complete(req: CompletionRequest): Promise<string> {
  const text = await { openrouter, anthropic, openai, gemini }[req.provider](req);
  if (!text.trim()) throw new AiProviderError(`${PROVIDER_LABELS[req.provider]} returned an empty response.`, 502, req.provider);
  return text.trim();
}
