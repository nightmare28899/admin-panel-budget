import { z } from "zod";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api";
import { userApi } from "@/lib/userApi";
import { getUserToken } from "@/lib/userSession";
import { isSameOrigin, uploadErrorResponse } from "@/features/nutrition/nutrition.http";
import {
  MAX_ORIGINAL_SIZE,
  readOriginalForm,
  validateOriginal,
} from "@/features/nutrition/nutrition.storage";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0 || length > MAX_ORIGINAL_SIZE + 65536)
    return Response.json(
      { error: "Upload exceeds the 5 MiB limit or is missing its bounded content length." },
      { status: 413 },
    );
  const token = await getUserToken();
  if (!token) return uploadErrorResponse(401);
  try {
    const form = await readOriginalForm(request);
    const dietId = z.uuid().parse(form.get("dietId"));
    const file = form.get("file");
    if (!(file instanceof File))
      return Response.json({ error: "Choose an original file." }, { status: 400 });
    validateOriginal({ name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
    // Only the file is forwarded; the diet id travels in the path.
    await userApi.uploadNutritionOriginal(token, dietId, file);
    revalidatePath("/nutrition", "layout");
    return Response.json({ success: true }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof RangeError) return uploadErrorResponse(413);
    if (error instanceof ApiError) return uploadErrorResponse(error.status);
    return uploadErrorResponse(400);
  }
}
