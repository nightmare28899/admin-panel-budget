"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "antd";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { useLocale } from "@/i18n/LocaleProvider";
import { chooseRecipeAction, completeMealAction, generatePlanAction } from "./nutrition.actions";
import {
  localDate,
  resolveDailyMeals,
  transitionMeal,
  type OptimisticMeals,
} from "./domain/dailyPlan";
import { progress } from "./domain/progress";
import { recipeMatchesOption } from "./domain/recipe";
import { mealTypes, type DailyMeal, type NutritionState } from "./nutrition.types";
import {
  FeedbackBanner,
  Icon,
  PageContainer,
  PageHeader,
  icons,
  useFeedback,
  useMealLabel,
  useStatusLabel,
} from "./NutritionUi";
import { Field } from "./NutritionFields";
import { formatQuantity } from "./domain/format";
import { selectValue } from "./domain/select";

const STATUS_VARIANT: Record<DailyMeal["status"], BadgeVariant> = {
  pending: "neutral",
  completed: "success",
  skipped: "warning",
};

export default function TodayView({ state }: { state: NutritionState }) {
  const router = useRouter();
  const { t, formatDate } = useLocale();
  const mealLabel = useMealLabel();
  const statusLabel = useStatusLabel();
  const { feedback, clear, success, fail } = useFeedback();
  const date = localDate(state.profile.timezone);
  const plan = state.plans.find((candidate) => candidate.date === date);
  const [optimistic, setOptimistic] = useState<OptimisticMeals | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const meals = resolveDailyMeals(plan, optimistic);
  const summary = progress([{ meals }]);

  const updateMeals = (update: (current: DailyMeal[]) => DailyMeal[]) => {
    setOptimistic((current) => ({
      source: plan,
      meals: update(resolveDailyMeals(plan, current)),
    }));
  };

  const transition = async (meal: DailyMeal, status: DailyMeal["status"]) => {
    if (pending.includes(meal.id)) return;
    clear();
    setPending((values) => [...values, meal.id]);
    updateMeals((values) =>
      values.map((value) => (value.id === meal.id ? transitionMeal(value, status) : value)),
    );
    try {
      const result = await completeMealAction(meal.id, status);
      if (!result.success) {
        updateMeals((values) => values.map((value) => (value.id === meal.id ? meal : value)));
        fail(result.error);
      } else {
        success(status === "completed" ? t("nutMealCompleteMsg") : t("nutMealUpdatedMsg"));
        router.refresh();
      }
    } catch {
      updateMeals((values) => values.map((value) => (value.id === meal.id ? meal : value)));
      fail(t("nutSaveFailedRestored"));
    } finally {
      setPending((values) => values.filter((id) => id !== meal.id));
    }
  };

  const generate = async () => {
    clear();
    setPending(["generate"]);
    try {
      const result = await generatePlanAction();
      if (!result.success) fail(result.error);
      else router.refresh();
    } catch {
      fail(t("nutPlanGenerateFailed"));
    } finally {
      setPending([]);
    }
  };

  const chooseRecipe = async (meal: DailyMeal, recipeId: string) => {
    if (!recipeId) return;
    clear();
    setPending((values) => [...values, meal.id]);
    try {
      const result = await chooseRecipeAction(meal.id, recipeId);
      if (result.success) {
        success(t("nutRecipeSelected"));
        router.refresh();
      } else fail(result.error);
    } catch {
      fail(t("nutRecipeSelectFailed"));
    } finally {
      setPending((values) => values.filter((id) => id !== meal.id));
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("nutTodayTitle")}
        description={t("nutTodayDescription", {
          date: formatDate(`${date}T12:00:00`, {
            weekday: "long",
            month: "long",
            day: "numeric",
          }),
          timezone: state.profile.timezone,
        })}
      />
      <FeedbackBanner feedback={feedback} onDismiss={clear} />

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard
          tone="emerald"
          icon={<Icon>{icons.check}</Icon>}
          label={t("nutMealsCompleted")}
          value={t("nutMealsCount", { completed: summary.completed, planned: summary.planned })}
        />
        <StatCard
          tone="info"
          icon={<Icon>{icons.pie}</Icon>}
          label={t("nutProgress")}
          value={`${summary.percent}%`}
          extraPlacement="below"
          extra={
            <>
              <div
                role="progressbar"
                aria-label={t("nutDailyCompletion")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={summary.percent}
                className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-3)]"
              >
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-[width] motion-reduce:transition-none"
                  style={{ width: `${summary.percent}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-3)]">
                {summary.planned
                  ? t("nutProgressSummary", { percent: summary.percent })
                  : t("nutProgressNoPlan")}
              </p>
            </>
          }
        />
        <StatCard
          tone="gold"
          icon={<Icon>{icons.skip}</Icon>}
          label={t("nutMealsSkipped")}
          value={String(summary.skipped)}
        />
      </div>

      {!plan && (
        <Card className="mb-4">
          <div className="flex flex-col gap-3">
            <h2 className="font-serif text-lg font-semibold text-[var(--text-1)]">
              {t("nutGenerateTitle")}
            </h2>
            <p className="text-sm text-[var(--text-2)]">{t("nutGenerateDescription")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                loading={pending.includes("generate")}
                onClick={() => void generate()}
              >
                {t("nutGeneratePlan")}
              </Button>
              <Link
                href="/nutrition/diet"
                className="rounded-full px-3 py-2 text-sm font-medium text-[var(--accent-text)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                {t("nutReviewDiet")}
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {mealTypes.map((type) => {
          const meal = meals.find((candidate) => candidate.type === type);
          const busy = !!meal && pending.includes(meal.id);
          const matching = meal
            ? state.recipes.filter(
                (recipe) =>
                  recipe.type === meal.type &&
                  recipeMatchesOption(recipe, {
                    id: meal.snapshot.optionId,
                    title: meal.snapshot.title,
                    portions: meal.snapshot.ingredients,
                    notes: meal.snapshot.notes,
                    recipeId: null,
                  }),
              )
            : [];
          return (
            <Card key={type}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent-text)]">
                    <Icon>{icons.utensils}</Icon>
                  </span>
                  <h2 className="min-w-0 flex-1 font-serif text-lg font-semibold text-[var(--text-1)]">
                    {mealLabel(type)}
                  </h2>
                  {meal && (
                    <Badge variant={STATUS_VARIANT[meal.status]}>{statusLabel(meal.status)}</Badge>
                  )}
                </div>
                {meal ? (
                  <>
                    <div>
                      <h3 className="text-[15px] font-medium text-[var(--text-1)]">
                        {meal.snapshot.title}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[var(--text-3)]">
                        <Icon size={15}>{icons.clock}</Icon>
                        {meal.completedAt
                          ? t("nutCompletedAt").replace(
                              "{time}",
                              new Date(meal.completedAt).toLocaleTimeString(undefined, {
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: state.profile.timezone,
                              }),
                            )
                          : t("nutFlexibleTime")}
                      </p>
                    </div>
                    <ul className="m-0 list-disc space-y-1 pl-5 text-sm text-[var(--text-2)]">
                      {meal.snapshot.ingredients.map((portion) => (
                        <li key={portion.id}>
                          {portion.foodName} ·{" "}
                          {portion.free
                            ? t("nutFreeFoodAllowed")
                            : `${formatQuantity(portion.quantity) ?? t("nutQuantityNotVerified")} ${portion.unit}`}{" "}
                          {portion.preparation}
                        </li>
                      ))}
                    </ul>
                    {meal.snapshot.notes && (
                      <p className="text-sm text-[var(--text-3)]">{meal.snapshot.notes}</p>
                    )}
                    {meal.snapshot.steps.length > 0 && (
                      <details className="text-sm text-[var(--text-2)]">
                        <summary className="cursor-pointer font-medium text-[var(--text-1)]">
                          {t("nutSavedPreparation")}
                        </summary>
                        <ol className="mt-2 list-decimal space-y-1 pl-5">
                          {meal.snapshot.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </details>
                    )}
                    {meal.snapshot.recipeId &&
                      state.recipes.some((recipe) => recipe.id === meal.snapshot.recipeId) && (
                        <Link
                          href={`/nutrition/recipes/${meal.snapshot.recipeId}`}
                          className="text-sm font-medium text-[var(--accent-text)] hover:underline"
                        >
                          {t("nutViewRecipe")}
                        </Link>
                      )}
                    <Field label={t("nutChooseRecipe")}>
                      {(id) => (
                        <Select
                          id={id}
                          style={{ width: "100%" }}
                          disabled={meal.status !== "pending" || busy}
                          placeholder={t("nutSelectPlaceholder")}
                          value={selectValue(meal.snapshot.recipeId)}
                          onChange={(value) => void chooseRecipe(meal, value)}
                          options={[
                            { value: "", label: t("nutUseSavedOption") },
                            ...matching.map((recipe) => ({
                              value: recipe.id,
                              label: recipe.title,
                            })),
                          ]}
                        />
                      )}
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/nutrition/recipes?option=${meal.snapshot.optionId}#ai-dishes`}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--accent-text)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                      >
                        <Icon size={15}>{icons.leaf}</Icon>
                        {t("nutSuggestIdeas")}
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          void transition(meal, meal.status === "completed" ? "pending" : "completed")
                        }
                      >
                        <Icon size={15}>{icons.check}</Icon>
                        {meal.status === "completed" ? t("nutUnmark") : t("nutComplete")}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() =>
                          void transition(meal, meal.status === "skipped" ? "pending" : "skipped")
                        }
                      >
                        {meal.status === "skipped" ? t("nutRestore") : t("nutSkip")}
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--text-3)]">{t("nutWaitingPlan")}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </PageContainer>
  );
}
