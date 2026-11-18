import { z } from "zod";
import type { MessageKey } from "@/i18n/messages";
import { recipeMatchesOption } from "./domain/recipe";
import { recipeSchema } from "./nutrition.schemas";
import type { DietOption, Recipe } from "./nutrition.types";

export const MAX_SUGGESTION_PREFERENCES = 300;

/** Body the proxy route accepts from the browser. */
export const suggestionRequestSchema = z.object({
  optionId: z.uuid(),
  count: z.number().int().min(1).max(3).optional(),
  preferences: z.string().trim().max(MAX_SUGGESTION_PREFERENCES).optional(),
});
export type SuggestionRequest = z.infer<typeof suggestionRequestSchema>;

const draftSchema = recipeSchema.omit({ favorite: true, cookCount: true, lastCookedAt: true });
const responseSchema = z.object({
  suggestions: z.array(z.unknown()),
  warnings: z.array(z.string()).default([]),
});
export type SuggestionsResult = { suggestions: Recipe[]; warnings: string[] };

/**
 * Validates the proxy response. Each draft must be a valid recipe AND match the
 * chosen option's exact portions; anything else is silently dropped.
 */
export function parseSuggestionsResponse(
  data: unknown,
  option: DietOption,
): SuggestionsResult | null {
  const parsed = responseSchema.safeParse(data);
  if (!parsed.success) return null;
  const suggestions: Recipe[] = [];
  for (const item of parsed.data.suggestions) {
    const draft = draftSchema.safeParse(item);
    if (!draft.success) continue;
    const recipe: Recipe = { ...draft.data, favorite: false, cookCount: 0, lastCookedAt: null };
    if (recipeMatchesOption(recipe, option)) suggestions.push(recipe);
  }
  return { suggestions, warnings: parsed.data.warnings };
}

/** Localization key for a failed suggestion request, by proxy HTTP status. */
export function suggestionsErrorKey(status: number): MessageKey {
  switch (status) {
    case 400:
      return "nutSuggestErrorInvalid";
    case 401:
      return "nutImportErrorSession";
    case 404:
      return "nutSuggestErrorOption";
    case 422:
      return "nutSuggestErrorUnreadable";
    case 429:
      return "nutSuggestErrorBusy";
    case 503:
      return "nutSuggestErrorUnavailable";
    default:
      return "nutSuggestErrorFailed";
  }
}
