"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/i18n/LocaleProvider";
import { favoriteRecipeAction } from "./nutrition.actions";
import type { NutritionState } from "./nutrition.types";
import {
  EmptyState,
  FeedbackBanner,
  Icon,
  PageContainer,
  PageHeader,
  icons,
  useFeedback,
  useMealLabel,
} from "./NutritionUi";
import { favoriteRecipes } from "./domain/favorites";
import { youtubeSearchUrl } from "./domain/youtube";

export default function FavoritesView({ state }: { state: NutritionState }) {
  const router = useRouter();
  const { t } = useLocale();
  const mealLabel = useMealLabel();
  const { feedback, clear, fail } = useFeedback();
  const [pending, setPending] = useState("");

  const recipes = favoriteRecipes(state.recipes);

  const unfavorite = async (id: string) => {
    clear();
    setPending(id);
    try {
      const result = await favoriteRecipeAction(id, false);
      if (!result.success) fail(result.error);
      else router.refresh();
    } catch {
      fail(t("nutFavoriteFailed"));
    } finally {
      setPending("");
    }
  };

  return (
    <PageContainer>
      <PageHeader title={t("nutFavoritesTitle")} description={t("nutFavoritesDescription")} />
      <FeedbackBanner feedback={feedback} onDismiss={clear} />

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
                  {recipe.cookCount > 0 && (
                    <Badge variant="success">{t("nutCookedBadge", { count: recipe.cookCount })}</Badge>
                  )}
                </div>
                <p className="text-sm text-[var(--text-3)]">
                  {recipe.duration
                    ? t("nutMinutes", { count: recipe.duration })
                    : t("nutDurationNotProvided")}
                </p>
                <a
                  href={youtubeSearchUrl(recipe.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="text-sm font-medium text-[var(--accent-text)] hover:underline"
                >
                  {t("nutWatchOnYoutube")}
                </a>
                <div className="mt-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending === recipe.id}
                    onClick={() => void unfavorite(recipe.id)}
                  >
                    {t("nutRemoveFavorite")}
                  </Button>
                </div>
              </article>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mb-4">
          <EmptyState
            icon={<Icon size={22}>{icons.leaf}</Icon>}
            title={t("nutNoFavoritesTitle")}
            description={t("nutNoFavoritesDescription")}
          />
        </Card>
      )}
    </PageContainer>
  );
}
