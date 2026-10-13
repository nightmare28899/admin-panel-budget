"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useLocale } from "@/i18n/LocaleProvider";
import {
  cookRecipeAction,
  deleteRecipeAction,
  duplicateRecipeAction,
} from "./nutrition.actions";
import type { Recipe } from "./nutrition.types";
import { RecipeEditor } from "./RecipeEditor";
import { FavoriteButton } from "./FavoriteButton";
import {
  Banner,
  FeedbackBanner,
  Icon,
  PageContainer,
  PageHeader,
  SectionTitle,
  icons,
  useFeedback,
  useMealLabel,
} from "./NutritionUi";
import { formatQuantity } from "./domain/format";
import { youtubeSearchUrl } from "./domain/youtube";

export default function RecipeDetailView({ recipe }: { recipe: Recipe }) {
  const router = useRouter();
  const { t, formatDate } = useLocale();
  const mealLabel = useMealLabel();
  const { feedback, clear, success, fail } = useFeedback();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const run = async (operation: () => ReturnType<typeof cookRecipeAction>, deleted = false) => {
    setBusy(true);
    clear();
    try {
      const result = await operation();
      if (result.success) {
        success(t("nutSavedMsg"));
        if (deleted) router.push("/nutrition/recipes");
        else router.refresh();
      } else fail(result.error);
    } catch {
      fail(t("nutChangeFailed"));
    } finally {
      setBusy(false);
      setConfirmDelete(false);
    }
  };

  const cookedSummary =
    recipe.cookCount > 0 && recipe.lastCookedAt
      ? t(recipe.cookCount === 1 ? "nutCookedOnce" : "nutCookedTimes", {
          count: recipe.cookCount,
          date: formatDate(recipe.lastCookedAt, { dateStyle: "medium" }),
        })
      : t("nutNeverCooked");

  const required = recipe.ingredients.filter((portion) => !portion.free);
  const free = recipe.ingredients.filter((portion) => portion.free);

  return (
    <PageContainer>
      <Link
        href="/nutrition/recipes"
        className="mb-3 inline-block text-sm font-medium text-[var(--accent-text)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
      >
        ← {t("nutBackToRecipes")}
      </Link>
      <PageHeader
        title={recipe.title}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => cookRecipeAction(recipe.id))}
            >
              <Icon size={16}>{icons.check}</Icon>
              {t("nutMarkCooked")}
            </Button>
            <FavoriteButton
              recipeId={recipe.id}
              favorite={recipe.favorite}
              activeLabel={t("nutRemoveFavorite")}
              inactiveLabel={t("nutFavorite")}
              errorMessage={t("nutChangeFailed")}
              onError={fail}
            />
          </div>
        }
      />
      <FeedbackBanner feedback={feedback} onDismiss={clear} />
      {recipe.demo && <Banner tone="warning">{t("nutDemoWarning")}</Banner>}

      {editing ? (
        <RecipeEditor
          recipe={recipe}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
        />
      ) : (
        <>
          <Card className="mb-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="info">{mealLabel(recipe.type)}</Badge>
                <span className="flex items-center gap-1.5 text-sm text-[var(--text-3)]">
                  <Icon size={16}>{icons.clock}</Icon>
                  {recipe.duration
                    ? t("nutMinutes", { count: recipe.duration })
                    : t("nutDurationNotProvided")}
                </span>
                <span className="text-sm text-[var(--text-3)]">{cookedSummary}</span>
              </div>
              {recipe.imageUrl && (
                <a
                  href={recipe.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="text-sm font-medium text-[var(--accent-text)] hover:underline"
                >
                  {t("nutOpenImage")}
                </a>
              )}
              <a
                href={youtubeSearchUrl(recipe.title)}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="text-sm font-medium text-[var(--accent-text)] hover:underline"
              >
                {t("nutWatchOnYoutube")}
              </a>
              <SectionTitle>{t("nutRequiredPortions")}</SectionTitle>
              <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-[var(--text-2)]">
                {required.map((portion) => (
                  <li key={portion.id}>
                    {portion.foodName} ·{" "}
                    {portion.quantity === null
                      ? t("nutQuantityNotVerified")
                      : `${formatQuantity(portion.quantity)} ${portion.unit}`}{" "}
                    {portion.preparation}
                    <small className="text-[var(--text-3)]"> · {portion.foodId}</small>
                  </li>
                ))}
              </ul>
              {free.length > 0 && (
                <>
                  <SectionTitle>{t("nutFreeIngredients")}</SectionTitle>
                  <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-[var(--text-2)]">
                    {free.map((portion) => (
                      <li key={portion.id}>
                        {portion.foodName} · {portion.preparation}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <SectionTitle>{t("nutPreparation")}</SectionTitle>
              <ol className="m-0 list-decimal space-y-1 pl-5 text-sm text-[var(--text-2)]">
                {recipe.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
              {recipe.notes && (
                <>
                  <SectionTitle>{t("nutNotes")}</SectionTitle>
                  <p className="text-sm text-[var(--text-2)]">{recipe.notes}</p>
                </>
              )}
            </div>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={busy} onClick={() => setEditing(true)}>
              {t("edit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => duplicateRecipeAction(recipe.id))}
            >
              {t("nutDuplicate")}
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
            >
              {t("delete")}
            </Button>
          </div>
        </>
      )}

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => run(() => deleteRecipeAction(recipe.id), true)}
        title={t("nutDeleteRecipeTitle")}
        description={t("nutDeleteRecipeDescription")}
        confirmLabel={t("nutConfirmDeletion")}
        confirmingLabel={t("working")}
        cancelLabel={t("nutKeepRecipe")}
        loading={busy}
      />
    </PageContainer>
  );
}
