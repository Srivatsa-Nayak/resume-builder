import { apiUser, jsonError } from "@/lib/api";
import { LruCache, imageResponse, previewWidth, renderResumeImage } from "@/lib/resume/render-image";
import { findUserResume, toRecord } from "@/lib/resume/service";

// Preview image of one of the user's own resumes (dashboard cards). The URL
// carries ?v=<updatedAt>, so each version can be cached by the browser.

const cache = new LruCache<Promise<Buffer>>(150);

// Allow time for slow work on serverless hosts (Vercel's default limit can be shorter): rendering a PDF page to an image.
export const maxDuration = 30;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await apiUser();
  if (error) return error;
  const row = await findUserResume(user.id, (await params).id);
  if (!row) return jsonError("Resume not found", 404);

  const width = previewWidth(new URL(request.url).searchParams.get("w"), 600);
  const record = toRecord(row);
  const key = `${row.id}:${record.updatedAt}:${record.template}:${width}`;
  let image = cache.get(key);
  if (!image) {
    image = renderResumeImage(record.data, record.template, width);
    cache.set(key, image);
    image.catch(() => cache.delete(key));
  }
  try {
    return imageResponse(await image, "private, max-age=31536000, immutable");
  } catch (err) {
    console.error(`[resume-preview:${row.id}]`, err);
    return jsonError("Could not render the preview", 500);
  }
}
