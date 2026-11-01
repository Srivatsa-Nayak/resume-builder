import { jsonError } from "@/lib/api";
import { getTemplatePreview, imageResponse, previewWidth } from "@/lib/resume/render-image";
import { isTemplateId } from "@/lib/resume/templates";

// Preview image of a template with the example content (public: used on the
// landing page and sign-up pages as well as the gallery).

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isTemplateId(id)) return jsonError("Unknown template", 404);
  const width = previewWidth(new URL(request.url).searchParams.get("w"));
  try {
    const body = await getTemplatePreview(id, width);
    return imageResponse(body, process.env.NODE_ENV === "production" ? "public, max-age=3600, stale-while-revalidate=86400" : "no-store");
  } catch (err) {
    console.error(`[preview:${id}]`, err);
    return jsonError("Could not render the preview", 500);
  }
}
