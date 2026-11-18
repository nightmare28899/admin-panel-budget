import { ApiError } from "@/lib/api";
import { userApi } from "@/lib/userApi";
import { getUserToken } from "@/lib/userSession";
import { importErrorResponse, isSameOrigin } from "@/features/nutrition/nutrition.http";
import {
  MAX_IMPORT_BODY_SIZE,
  classifyImportFiles,
  parseImportResponse,
} from "@/features/nutrition/nutrition.import";
import { readBoundedForm } from "@/features/nutrition/nutrition.storage";

const NO_STORE = { "Cache-Control": "private, no-store" };

// The AI extraction can take a minute; allow the platform to wait for it.
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0 || length > MAX_IMPORT_BODY_SIZE)
    return importErrorResponse(413);
  const token = await getUserToken();
  if (!token) return importErrorResponse(401);
  try {
    const form = await readBoundedForm(request, MAX_IMPORT_BODY_SIZE);
    const files = form.getAll("files").filter((value): value is File => value instanceof File);
    if (classifyImportFiles(files)) return importErrorResponse(400);
    const data = parseImportResponse(await userApi.importNutritionDiet(token, files));
    if (!data) return importErrorResponse(502);
    return Response.json(data, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof RangeError) return importErrorResponse(413);
    if (error instanceof ApiError) return importErrorResponse(error.status);
    return importErrorResponse(400);
  }
}
