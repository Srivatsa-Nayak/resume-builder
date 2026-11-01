// Runs once when the server starts. In production, render the template
// gallery previews in the background so the first visitor doesn't wait.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  setTimeout(async () => {
    const { getTemplatePreview } = await import("@/lib/resume/render-image");
    const { TEMPLATE_LIST } = await import("@/lib/resume/templates");
    // The sizes the gallery and design tab usually request; others render on demand.
    for (const width of [600, 800, 1000] as const) {
      await Promise.allSettled(TEMPLATE_LIST.map((t) => getTemplatePreview(t.id, width)));
    }
  }, 1000);
}
