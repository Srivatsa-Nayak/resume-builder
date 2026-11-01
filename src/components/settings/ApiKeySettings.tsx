"use client";

import { CircleCheck, CircleAlert, KeyRound, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toaster";
import { Badge, Button, Card, Field, Input, Spinner, cn } from "@/components/ui";
import { PROVIDERS, PROVIDER_LABELS, type ProviderId } from "@/lib/ai/providers";

interface KeyInfo {
  provider: ProviderId;
  last4: string;
  model: string | null;
}

interface KeysResponse {
  keys: KeyInfo[];
  preferredProvider: ProviderId | null;
  defaults: Record<ProviderId, string>;
  platform: { available: boolean; provider: ProviderId | null; used: number; limit: number };
}

const KEY_HELP: Record<ProviderId, { url: string; prefix: string }> = {
  openrouter: { url: "https://openrouter.ai/settings/keys", prefix: "sk-or-" },
  anthropic: { url: "https://console.anthropic.com/settings/keys", prefix: "sk-ant-" },
  openai: { url: "https://platform.openai.com/api-keys", prefix: "sk-" },
  gemini: { url: "https://aistudio.google.com/app/apikey", prefix: "AIza" },
};

type TestState = { status: "idle" | "testing" | "ok" | "error"; message?: string };

function ProviderRow({
  provider,
  info,
  defaultModel,
  onChanged,
}: {
  provider: ProviderId;
  info?: KeyInfo;
  defaultModel: string;
  onChanged: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(info?.model ?? "");
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<TestState>({ status: "idle" });

  async function runTest() {
    setTest({ status: "testing" });
    const res = await fetch("/api/settings/keys/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const body = await res.json().catch(() => ({}));
    setTest(body.ok ? { status: "ok" } : { status: "error", message: body.error ?? "Test failed" });
  }

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings/keys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey: apiKey.trim() || undefined, model: model.trim() }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast({ tone: "error", title: "Couldn't save key", description: body.error });
    setApiKey("");
    toast({ tone: "success", title: `${PROVIDER_LABELS[provider]} settings saved` });
    onChanged();
    void runTest();
  }

  async function remove() {
    const ok = await confirm({
      title: `Remove your ${PROVIDER_LABELS[provider]} key?`,
      description: "AI requests will stop using this key. You can add it again at any time.",
      confirmLabel: "Remove key",
      tone: "danger",
    });
    if (!ok) return;
    await fetch(`/api/settings/keys?provider=${provider}`, { method: "DELETE" });
    setTest({ status: "idle" });
    setModel("");
    toast({ tone: "success", title: "Key removed" });
    onChanged();
  }

  const help = KEY_HELP[provider];
  return (
    <div className="border-t border-line p-5 first:border-t-0">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium text-ink">{PROVIDER_LABELS[provider]}</h3>
        {info ? <Badge tone="good">Key saved ••••{info.last4}</Badge> : <Badge>Not configured</Badge>}
        {test.status === "testing" ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Spinner className="size-3" /> Testing…
          </span>
        ) : null}
        {test.status === "ok" ? (
          <span className="inline-flex items-center gap-1 text-xs text-accent">
            <CircleCheck className="size-3.5" /> Working
          </span>
        ) : null}
      </div>
      {test.status === "error" ? (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-danger-soft px-3 py-2 text-xs text-danger">
          <CircleAlert className="mt-px size-3.5 shrink-0" /> {test.message}
        </p>
      ) : null}
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_200px]">
        <Field
          label={info ? "Replace key" : "API key"}
          htmlFor={`key-${provider}`}
          hint={
            <>
              Starts with <code>{help.prefix}</code>.{" "}
              <a href={help.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                Get a key
              </a>
            </>
          }
        >
          <Input
            id={`key-${provider}`}
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={info ? `••••••••${info.last4}` : `${help.prefix}…`}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </Field>
        <Field label="Model (optional)" htmlFor={`model-${provider}`} hint={`Default: ${defaultModel}`}>
          <Input id={`model-${provider}`} placeholder={defaultModel} value={model} onChange={(e) => setModel(e.target.value)} spellCheck={false} />
        </Field>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={save} loading={saving} disabled={!apiKey.trim() && (!info || model === (info.model ?? ""))}>
          {info ? "Save changes" : "Save key"}
        </Button>
        {info ? (
          <>
            <Button size="sm" variant="secondary" onClick={runTest} disabled={test.status === "testing"}>
              Test key
            </Button>
            <Button size="sm" variant="ghost" onClick={remove} className="text-danger hover:bg-danger-soft">
              Remove
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function ApiKeySettings() {
  const toast = useToast();
  const [data, setData] = useState<KeysResponse | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/keys");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setPreferred(value: string) {
    const preferredProvider = value || null;
    const res = await fetch("/api/settings/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredProvider }),
    });
    if (res.ok) {
      toast({ tone: "success", title: "Preferred provider updated" });
      void load();
    }
  }

  const configured = data?.keys ?? [];
  const usagePct = data ? Math.min(100, (data.platform.used / Math.max(1, data.platform.limit)) * 100) : 0;

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-accent" />
          <h2 className="font-display text-2xl text-ink">AI providers</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Add your own API key to use your preferred model with no daily limit. When a key is saved, all AI requests go through it instead of the
          platform&apos;s shared AI.
        </p>
        <p className="mt-3 flex items-start gap-2 rounded-md bg-accent-soft px-3 py-2 text-xs text-accent-strong">
          <ShieldCheck className="mt-px size-4 shrink-0" />
          Keys are encrypted with AES-256-GCM before they are stored, are only decrypted on the server to make requests, and are never sent back
          to your browser.
        </p>

        {data ? (
          <div className="mt-4 rounded-lg border border-line p-4">
            {configured.length ? (
              <p className="text-sm text-ink-soft">
                <span className="font-medium text-ink">Using your own key.</span> Platform limits don&apos;t apply.
              </p>
            ) : data.platform.available ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-soft">Platform AI used today</span>
                  <span className="font-medium text-ink">
                    {data.platform.used} / {data.platform.limit}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
                  <div className={cn("h-full rounded-full", usagePct >= 90 ? "bg-danger" : "bg-accent")} style={{ width: `${usagePct}%` }} />
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-soft">
                <span className="font-medium text-ink">No platform AI is configured on this server.</span> Without a key, the built-in offline
                assistant writes suggestions from proven templates and rules.
              </p>
            )}
            {configured.length > 1 ? (
              <div className="mt-4 max-w-xs">
                <Field label="Preferred provider" htmlFor="preferred">
                  <select
                    id="preferred"
                    className="h-9 rounded-md border border-line-strong bg-surface px-2 text-sm"
                    value={data.preferredProvider ?? ""}
                    onChange={(e) => setPreferred(e.target.value)}
                  >
                    <option value="">Automatic</option>
                    {configured.map((k) => (
                      <option key={k.provider} value={k.provider}>
                        {PROVIDER_LABELS[k.provider]}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {data ? (
        <div className="border-t border-line">
          {PROVIDERS.map((p) => (
            <ProviderRow
              key={p + (configured.find((k) => k.provider === p)?.last4 ?? "")}
              provider={p}
              info={configured.find((k) => k.provider === p)}
              defaultModel={data.defaults[p]}
              onChanged={load}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 border-t border-line p-5 text-sm text-muted">
          <Spinner /> Loading…
        </div>
      )}
    </Card>
  );
}
