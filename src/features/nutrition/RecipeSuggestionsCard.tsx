"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/i18n/LocaleProvider";
import { saveRecipeAction } from "./nutrition.actions";
import {
  MAX_SUGGESTION_PREFERENCES,
  parseSuggestionsResponse,
  suggestionsErrorKey,
} from "./nutrition.suggestions";
import {
  mealTypes,
  type MealType,
  type NutritionState,
  type Portion,
  type Recipe,
} from "./nutrition.types";
import { SelectField, TextAreaField } from "./NutritionFields";
import {
  Banner,
  EmptyState,
  Icon,
  InsetPanel,
  SectionTitle,
  icons,
  useMealLabel,
} from "./NutritionUi";
import { formatQuantity, optionLabel } from "./domain/format";
import { youtubeSearchUrl } from "./domain/youtube";

type Results = { suggestions: Recipe[]; warnings: string[] };

/** Asks the backend (Gemini) for new dishes built from one active-diet option. */
export function RecipeSuggestionsCard({
  state,
  initialOptionId,
  onEdit,
}: {
  state: NutritionState;
  initialOptionId?: string;
  onEdit: (recipe: Recipe) => void;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const mealLabel = useMealLabel();

  const activeDiet = state.diets.find((diet) => diet.active);
  const initial = useMemo(() => {
    for (const meal of activeDiet?.meals ?? [])
      if (meal.options.some((option) => option.id === initialOptionId)) return meal.type;
    return null;
  }, [activeDiet, initialOptionId]);

  const [mealType, setMealType] = useState<MealType | "">(initial ?? "");
  const [optionId, setOptionId] = useState(initial ? (initialOptionId ?? "") : "");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [saving, setSaving] = useState("");
  const [saved, setSaved] = useState<string[]>([]);

  const meal = activeDiet?.meals.find((candidate) => candidate.type === mealType);
  const option = meal?.options.find((candidate) => candidate.id === optionId);

  const portionLabel = (portion: Portion) =>
    portion.free
      ? `${portion.foodName} · ${t("nutFreeFoodAllowed")}`
      : `${portion.foodName} · ${formatQuantity(portion.quantity) ?? t("nutQuantityNotVerified")} ${portion.unit}${
          portion.preparation ? ` ${portion.preparation}` : ""
        }`;

  const generate = async () => {
    if (!option || loading) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setSaved([]);
    try {
      const response = await fetch("/api/nutrition/recipe-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionId: option.id,
          preferences: preferences.trim() || undefined,
        }),
      });
      if (!response.ok) {
        setError(t(suggestionsErrorKey(response.status)));
        return;
      }
      const parsed = parseSuggestionsResponse(await response.json(), option);
      if (!parsed) setError(t("nutSuggestErrorFailed"));
      else setResults(parsed);
    } catch {
      setError(t("nutSuggestErrorFailed"));
    } finally {
      setLoading(false);
    }
  };

  const save = async (recipe: Recipe) => {
    setSaving(recipe.id);
    setError(null);
    try {
      const result = await saveRecipeAction(recipe);
      if (result.success) {
        setSaved((ids) => [...ids, recipe.id]);
        router.refresh();
      } else setError(result.error);
    } catch {
      setError(t("nutRecipeSaveFailed"));
    } finally {
      setSaving("");
    }
  };

  return (
    <Card className="mb-4" id="ai-dishes">
      <div className="flex flex-col gap-4">
        <div>
          <SectionTitle>{t("nutSuggestTitle")}</SectionTitle>
          <p className="mt-1 text-sm text-[var(--text-3)]">{t("nutSuggestDescription")}</p>
        </div>

        {!activeDiet ? (
          <Banner tone="info" className="">
            {t("nutSuggestNoActiveDiet")}{" "}
            <Link href="/nutrition/diet" className="font-medium underline">
              {t("nutSuggestGoToDiet")}
            </Link>
          </Banner>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField
                label={t("nutSuggestMeal")}
                value={mealType}
                disabled={loading}
                options={mealTypes
                  .filter((type) =>
                    activeDiet.meals.some((m) => m.type === type && m.options.length),
                  )
                  .map((type) => ({ value: type, label: mealLabel(type) }))}
                onChange={(value) => {
                  setMealType(value as MealType);
                  setOptionId("");
                }}
              />
              <SelectField
                label={t("nutSuggestOption")}
                value={optionId}
                disabled={loading || !meal}
                options={(meal?.options ?? []).map((candidate) => ({
                  value: candidate.id,
                  label: optionLabel(candidate),
                }))}
                onChange={setOptionId}
              />
            </div>
            {option && (
              <div className="flex flex-wrap gap-2">
                {option.portions.map((portion) => (
                  <Badge key={portion.id} ring>
                    {portionLabel(portion)}
                  </Badge>
                ))}
              </div>
            )}
            <TextAreaField
              label={t("nutSuggestPreferences")}
              value={preferences}
              onChange={setPreferences}
              rows={2}
              placeholder={t("nutPhPreferences")}
              maxLength={MAX_SUGGESTION_PREFERENCES}
            />
            <div>
              <Button
                type="button"
                loading={loading}
                disabled={!option}
                onClick={() => void generate()}
              >
                <Icon size={16}>{icons.leaf}</Icon>
                {loading ? t("nutSuggestRunning") : t("nutSuggestButton")}
              </Button>
            </div>
          </>
        )}

        {error && (
          <Banner tone="error" className="" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}
        {loading && (
          <Banner tone="info" className="">
            <strong>{t("nutSuggestRunning")}</strong> {t("nutSuggestRunningHint")}
          </Banner>
        )}

        {results && (
          <div className="flex flex-col gap-3">
            <SectionTitle>{t("nutSuggestResultsTitle")}</SectionTitle>
            <p className="text-xs text-[var(--text-3)]">{t("nutSuggestReviewNote")}</p>
            {results.warnings.length > 0 && (
              <Banner tone="warning" className="">
                <strong>{t("nutSuggestWarnings")}</strong>
                <ul className="m-0 mt-1 list-disc pl-5">
                  {results.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </Banner>
            )}
            {results.suggestions.length ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                {results.suggestions.map((recipe) => {
                  const done = saved.includes(recipe.id);
                  return (
                    <InsetPanel key={recipe.id} className="flex flex-col gap-3">
                      <h3 className="break-words font-serif text-base font-semibold text-[var(--text-1)]">
                        {recipe.title}
                      </h3>
                      <p className="flex items-center gap-1.5 text-sm text-[var(--text-3)]">
                        <Icon size={15}>{icons.clock}</Icon>
                        {t("nutMinutes", { count: recipe.duration })}
                      </p>
                      <div>
                        <p className="mb-1 text-xs font-medium text-[var(--text-2)]">
                          {t("nutSuggestPortions")}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {recipe.ingredients.map((portion) => (
                            <Badge key={portion.id} ring>
                              {portionLabel(portion)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {recipe.notes && (
                        <p className="text-sm text-[var(--text-2)]">{recipe.notes}</p>
                      )}
                      <div>
                        <p className="mb-1 text-xs font-medium text-[var(--text-2)]">
                          {t("nutSuggestSteps")}
                        </p>
                        <ol className="m-0 list-decimal space-y-1 pl-5 text-sm text-[var(--text-2)]">
                          {recipe.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                      <a
                        href={youtubeSearchUrl(recipe.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        referrerPolicy="no-referrer"
                        className="text-sm font-medium text-[var(--accent-text)] hover:underline"
                      >
                        {t("nutWatchOnYoutube")}
                      </a>
                      <div className="mt-auto flex flex-wrap items-center gap-2">
                        {done ? (
                          <>
                            <Badge variant="success">{t("nutSuggestSaved")}</Badge>
                            <Link
                              href={`/nutrition/recipes/${recipe.id}`}
                              className="text-sm font-medium text-[var(--accent-text)] hover:underline"
                            >
                              {t("nutSuggestViewRecipe")}
                            </Link>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              loading={saving === recipe.id}
                              disabled={!!saving}
                              onClick={() => void save(recipe)}
                            >
                              {t("nutSuggestSave")}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={!!saving}
                              onClick={() => onEdit(recipe)}
                            >
                              {t("nutSuggestEdit")}
                            </Button>
                          </>
                        )}
                      </div>
                    </InsetPanel>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={<Icon size={22}>{icons.leaf}</Icon>}
                title={t("nutSuggestNone")}
                description=""
              />
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
