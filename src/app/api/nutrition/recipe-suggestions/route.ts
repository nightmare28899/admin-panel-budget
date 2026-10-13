import { ApiError } from "@/lib/api";
import { userApi } from "@/lib/userApi";
import { getUserToken } from "@/lib/userSession";
import { isSameOrigin, suggestionsErrorResponse } from "@/features/nutrition/nutrition.http";
import { suggestionRequestSchema } from "@/features/nutrition/nutrition.suggestions";

const NO_STORE = { "Cache-Control": "private, no-store" };
const MAX_BODY_SIZE = 4096;

// The AI generation can take a minute; allow the platform to wait for it.
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!isSameOrigin(request))
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_SIZE) return suggestionsErrorResponse(400);
  const token = await getUserToken();
  if (!token) return suggestionsErrorResponse(401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return suggestionsErrorResponse(400);
  }
  const parsed = suggestionRequestSchema.safeParse(body);
  if (!parsed.success) return suggestionsErrorResponse(400);
  try {
    const data = await userApi.suggestNutritionRecipes(token, parsed.data);
    return Response.json(data, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof ApiError) return suggestionsErrorResponse(error.status);
    return suggestionsErrorResponse(502);
  }
}
