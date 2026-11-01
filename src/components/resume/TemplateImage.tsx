import { cn } from "@/components/ui";
import { getTemplate } from "@/lib/resume/templates";

// Example content is A4, so previews share its proportions.
export const PREVIEW_ASPECT = "595.28 / 841.89";

function srcSet(base: string) {
  return [400, 600, 800, 1000, 1300].map((w) => `${base}?w=${w} ${w}w`).join(", ");
}

/** A sharp, server-rendered image of a template filled with the example content. */
export function TemplateImage({
  templateId,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  eager = false,
  className,
}: {
  templateId: string;
  /** Rendered width hint so the browser picks the right resolution. */
  sizes?: string;
  eager?: boolean;
  className?: string;
}) {
  const base = `/api/templates/${templateId}/preview`;
  return (
    <img
      src={`${base}?w=800`}
      srcSet={srcSet(base)}
      sizes={sizes}
      alt={`${getTemplate(templateId).name} resume template`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      // White placeholder while loading, unless the caller supplies its own background.
      className={cn("block w-full", className ?? "bg-white")}
      style={{ aspectRatio: PREVIEW_ASPECT }}
    />
  );
}

/** A sharp image of one of the user's own resumes. `version` busts the cache when it changes. */
export function ResumeImage({ resumeId, version, title, sizes = "320px", className }: { resumeId: string; version: string; title: string; sizes?: string; className?: string }) {
  const base = `/api/resumes/${resumeId}/preview`;
  const v = encodeURIComponent(version);
  return (
    <img
      src={`${base}?w=600&v=${v}`}
      srcSet={[400, 600, 800, 1000].map((w) => `${base}?w=${w}&v=${v} ${w}w`).join(", ")}
      sizes={sizes}
      alt={`Preview of ${title}`}
      loading="lazy"
      decoding="async"
      className={cn("block w-full bg-white", className)}
    />
  );
}
