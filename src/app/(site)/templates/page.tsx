import type { Metadata } from "next";
import { TemplateGallery } from "@/components/dashboard/TemplateGallery";
import { getCurrentUser } from "@/lib/auth/session";
import { isTemplateId } from "@/lib/resume/templates";

export const metadata: Metadata = { title: "Templates" };

// Public: visitors can browse and preview; "Use this template" asks them to sign in.
export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ template?: string; color?: string }> }) {
  const [user, { template, color }] = await Promise.all([getCurrentUser(), searchParams]);
  return (
    // Wider than other pages so the previews are large.
    <div className="mx-auto -mt-8 max-w-[1480px]">
      <TemplateGallery
        signedIn={!!user}
        initialTemplateId={isTemplateId(template) ? template : undefined}
        initialAccent={color && /^[0-9a-f]{6}$/i.test(color) ? `#${color.toLowerCase()}` : undefined}
      />
    </div>
  );
}
