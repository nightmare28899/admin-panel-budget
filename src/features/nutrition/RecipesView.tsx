"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "antd";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/i18n/LocaleProvider";
import { mealTypes, type NutritionState, type Recipe } from "./nutrition.types";
import { seedRecipesAction } from "./nutrition.actions";
import { FavoriteButton } from "./FavoriteButton";
import { emptyPortion } from "./PortionEditor";
import { RecipeEditor } from "./RecipeEditor";
import { RecipeSuggestionsCard } from "./RecipeSuggestionsCard";
import { SelectField, TextField } from "./NutritionFields";
import {
  EmptyState,
  FeedbackBanner,
  Icon,
  PageContainer,
  PageHeader,
  SectionTitle,
  icons,
  useFeedback,
  useMealLabel,
} from "./NutritionUi";
import { optionLabel } from "./domain/format";

function newRecipe(): Recipe {
  return {
    id: crypto.randomUUID(),
    title: "",
    type: "breakfast",
    ingredients: [emptyPortion()],
    steps: [""],
    duration: 0,
    notes: "",
    imageUrl: null,
    demo: false,
    seedKey: null,
    favorite: false,
    cookCount: 0,
    lastCookedAt: null,
  };
}

export default function RecipesView({
  state,
  initialOptionId,
  initialQuery = "",
}: {
  state: NutritionState;
  initialOptionId?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const mealLabel = useMealLabel();
  const { feedback, clear, success, fail } = useFeedback();
  const [query, setQuery] = useState(initialQuery);
  const [type, setType] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [draft, setDraft] = useState<Recipe | null>(null);
  const [pending, setPending] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (draft) editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [draft]);

  const recipes = state.recipes.filter(
    (recipe) =>
      (!query || recipe.title.toLowerCase().includes(query.toLowerCase())) &&
      (!type || recipe.type === type) &&
      (!favorites || recipe.favorite),
  );

  const dietOptions = state.diets.flatMap((diet) =>
    diet.meals.flatMap((meal) =>
      meal.options.map((option) => ({
        value: option.id,
        label: `${diet.title} · ${mealLabel(meal.type)} · ${optionLabel(option)}`,
        meal,
        option,
      })),
    ),
  );

  const seed = async () => {
    clear();
    setPending("seed");
    try {
      const result = await seedRecipesAction();
      if (result.success) {
        success(t("nutDemoAdded"));
        router.refresh();
      } else fail(result.error);
    } catch {
      fail(t("nutDemoFailed"));
    } finally {
      setPending("");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("nutRecipesTitle")}
        description={t("nutRecipesDescription")}
        actions={
          <Button type="button" onClick={() => setDraft(newRecipe())}>
            <Icon size={16}>{icons.plus}</Icon>
            {t("nutNewRecipe")}
          </Button>
        }
      />
      <FeedbackBanner feedback={feedback} onDismiss={clear} />

      <Card className="mb-4">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
          <TextField
            label={t("nutSearchRecipes")}
            type="search"
            allowClear
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("nutPhSearchRecipes")}
          />
          <SelectField
            label={t("nutMealFilter")}
            value={type}
            onChange={setType}
            options={[
              { value: "", label: t("nutAllMeals") },
              ...mealTypes.map((meal) => ({ value: meal, label: mealLabel(meal) })),
            ]}
          />
          <div className="pb-1.5">
            <Checkbox checked={favorites} onChange={(event) => setFavorites(event.target.checked)}>
              {t("nutFavoritesOnly")}
            </Checkbox>
          </div>
        </div>
      </Card>

      <RecipeSuggestionsCard
        key={initialOptionId ?? "none"}
        state={state}
        initialOptionId={initialOptionId}
        onEdit={setDraft}
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3">
          <SectionTitle>{t("nutStartFromDiet")}</SectionTitle>
          <SelectField
            label={t("nutCopyIngredients")}
            value=""
            options={dietOptions.map(({ value, label }) => ({ value, label }))}
            onChange={(value) => {
              const selection = dietOptions.find((candidate) => candidate.value === value);
              if (selection)
                setDraft({
                  ...newRecipe(),
                  title: selection.option.title,
                  type: selection.meal.type,
                  ingredients: selection.option.portions.map((portion) => ({
                    ...portion,
                    id: crypto.randomUUID(),
                  })),
                  notes: selection.option.notes,
                });
            }}
          />
          <p className="text-xs text-[var(--text-3)]">{t("nutCreateRecipeNote")}</p>
        </div>
      </Card>

      {draft && (
        <div className="mb-4" ref={editorRef}>
          <RecipeEditor
            key={draft.id}
            recipe={draft}
            onCancel={() => setDraft(null)}
            onSaved={() => {
              setDraft(null);
              router.refresh();
            }}
          />
        </div>
      )}

      {recipes.length ? (
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {recipes.map((recipe) => (
            <Card key={recipe.id}>
              <article className="flex h-full flex-col gap-3">
                <Link
                  href={`/nutrition/recipes/${recipe.id}`}
                  className="flex items-start gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent-text)]">
                    <Icon>{icons.leaf}</Icon>
                  </span>
                  <h2 className="min-w-0 break-words font-serif text-lg font-semibold text-[var(--text-1)]">
                    {recipe.title}
                  </h2>
                </Link>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="info">{mealLabel(recipe.type)}</Badge>
                  {recipe.demo && <Badge variant="warning">{t("nutDemoBadge")}</Badge>}
                  {recipe.cookCount > 0 && (
                    <Badge variant="success">{t("nutCookedBadge", { count: recipe.cookCount })}</Badge>
                  )}
                </div>
                <p className="text-sm text-[var(--text-3)]">
                  {recipe.duration
                    ? t("nutMinutes", { count: recipe.duration })
                    : t("nutDurationNotProvided")}{" "}
                  · {t("nutFoodsCount", { count: recipe.ingredients.length })}
                </p>
                <div className="mt-auto">
                  <FavoriteButton
                    recipeId={recipe.id}
                    favorite={recipe.favorite}
                    size="sm"
                    activeLabel={t("nutFavorited")}
                    inactiveLabel={t("nutFavorite")}
                    errorMessage={t("nutFavoriteFailed")}
                    onError={fail}
                  />
                </div>
              </article>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mb-4">
          <EmptyState
            icon={<Icon size={22}>{icons.leaf}</Icon>}
            title={t("nutNoRecipesTitle")}
            description={t("nutNoRecipesDescription")}
          />
        </Card>
      )}

      <Card>
        <div className="flex flex-col gap-3">
          <SectionTitle>{t("nutDemoInspirationTitle")}</SectionTitle>
          <p className="text-sm text-[var(--text-3)]">{t("nutDemoInspirationDescription")}</p>
          <div>
            <Button
              type="button"
              variant="outline"
              loading={pending === "seed"}
              onClick={() => void seed()}
            >
              {t("nutAddDemoRecipes")}
            </Button>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
