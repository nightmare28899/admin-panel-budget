import { cache } from "react";
import { ApiError } from "@/lib/api";
import { userApi } from "@/lib/userApi";
import { getUserToken } from "@/lib/userSession";
import { stateSchema } from "./nutrition.schemas";
import type { Json, NutritionState } from "./nutrition.types";

/** No user session (missing or rejected token): callers redirect to the login page. */
export class NutritionSessionError extends Error {
  constructor() {
    super("Sign in to continue.");
    this.name = "NutritionSessionError";
  }
}

const isUnauthorized = (error: unknown) => error instanceof ApiError && error.status === 401;

export async function requireNutritionSession(): Promise<string> {
  const token = await getUserToken();
  if (!token) throw new NutritionSessionError();
  return token;
}

export async function loadNutritionState(): Promise<NutritionState> {
  const token = await requireNutritionSession();
  let data: unknown;
  try {
    data = await userApi.nutritionState(token);
  } catch (error) {
    if (isUnauthorized(error)) throw new NutritionSessionError();
    throw new Error("Nutrition data is unavailable. Try again in a moment.");
  }
  const parsed = stateSchema.safeParse(data);
  if (!parsed.success)
    throw new Error("Nutrition data needs verification. The service returned an unexpected shape.");
  return parsed.data;
}

/**
 * Render-time loader: the protected layout and the page both need the state in the
 * same server render, so share one backend request per render pass. Server actions
 * must keep calling loadNutritionState (uncached): they read, mutate, then re-render.
 */
export const loadNutritionStateOnce = cache(loadNutritionState);

export async function nutritionCommand(command: string, payload: Json = {}): Promise<void> {
  const token = await requireNutritionSession();
  try {
    await userApi.nutritionCommand(token, command, payload);
  } catch (error) {
    if (isUnauthorized(error)) throw new NutritionSessionError();
    throw new Error(
      "This change could not be saved. Refresh and verify the selected diet, recipe and permissions.",
    );
  }
}
