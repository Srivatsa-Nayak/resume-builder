"use client";

import { useRouter } from "next/navigation";
import { UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toaster";
import { Button, Card, Field, Input } from "@/components/ui";

async function patchAccount(body: Record<string, string>) {
  const res = await fetch("/api/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, error: json.error as string | undefined };
}

export function AccountSettings({ name, email, hasPassword }: { name: string; email: string; hasPassword: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<"name" | "password" | "delete" | null>(null);

  async function saveName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("name");
    const result = await patchAccount({ name: String(new FormData(e.currentTarget).get("name")) });
    setBusy(null);
    if (!result.ok) return toast({ tone: "error", title: "Couldn't update name", description: result.error });
    toast({ tone: "success", title: "Name updated" });
    router.refresh();
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy("password");
    const result = await patchAccount({
      currentPassword: String(data.get("currentPassword") ?? ""),
      newPassword: String(data.get("newPassword")),
    });
    setBusy(null);
    if (!result.ok) return toast({ tone: "error", title: "Couldn't change password", description: result.error });
    form.reset();
    toast({ tone: "success", title: "Password changed", description: "Other devices have been signed out." });
  }

  async function deleteAccount() {
    const ok = await confirm({
      title: "Delete your account?",
      description: "This permanently deletes your account, all your resumes and any saved API keys. This can't be undone.",
      confirmLabel: "Delete my account",
      tone: "danger",
      requireText: email,
    });
    if (!ok) return;
    setBusy("delete");
    // The dialog only confirms once the typed email matches.
    const res = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmEmail: email }) });
    const body = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return toast({ tone: "error", title: "Account not deleted", description: body.error });
    router.replace("/");
    router.refresh();
  }

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <UserRound className="size-5 text-accent" />
          <h2 className="font-display text-2xl text-ink">Account</h2>
        </div>
        <p className="mt-1 text-sm text-muted">Signed in as {email}</p>
        <form onSubmit={saveName} className="mt-4 flex items-end gap-2">
          <Field label="Display name" htmlFor="account-name" className="flex-1">
            <Input id="account-name" name="name" defaultValue={name} required maxLength={100} />
          </Field>
          <Button type="submit" variant="secondary" loading={busy === "name"}>
            Save
          </Button>
        </form>
      </div>

      <form onSubmit={savePassword} className="border-t border-line p-5">
        <h3 className="font-medium text-ink">{hasPassword ? "Change password" : "Set a password"}</h3>
        {!hasPassword ? <p className="mt-1 text-sm text-muted">You signed up with Google or GitHub. Add a password to also sign in with email.</p> : null}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {hasPassword ? (
            <Field label="Current password" htmlFor="currentPassword">
              <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
            </Field>
          ) : null}
          <Field label="New password" htmlFor="newPassword" hint="At least 8 characters.">
            <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
          </Field>
        </div>
        <Button type="submit" variant="secondary" className="mt-3" loading={busy === "password"}>
          Update password
        </Button>
      </form>

      <div className="border-t border-line p-5">
        <h3 className="font-medium text-danger">Delete account</h3>
        <p className="mt-1 text-sm text-muted">Permanently remove your account, all resumes and saved API keys.</p>
        <Button variant="ghost" className="mt-3 text-danger hover:bg-danger-soft" onClick={deleteAccount} loading={busy === "delete"}>
          Delete my account
        </Button>
      </div>
    </Card>
  );
}
