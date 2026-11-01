import type { Metadata } from "next";
import { AccountSettings } from "@/components/settings/AccountSettings";
import { ApiKeySettings } from "@/components/settings/ApiKeySettings";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser("/settings");
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-4xl text-ink">Settings</h1>
      <div className="mt-8 flex flex-col gap-8">
        <ApiKeySettings />
        <AccountSettings name={user.name ?? ""} email={user.email} hasPassword={user.hasPassword} />
      </div>
    </div>
  );
}
