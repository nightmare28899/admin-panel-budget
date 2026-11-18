"use client";

import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";
import { DietOptionCard } from "./DietOptionCard";
import { emptyPortion } from "./PortionEditor";
import { Icon, icons, useMealLabel } from "./NutritionUi";
import { mealTabStatus, rememberExpandedDefaults } from "./domain/dietForm";
import type { DietMeal, Recipe } from "./nutrition.types";

/** One tab per meal; only the active meal's options render, each collapsible. */
export function DietMealTabs({
  meals,
  recipes,
  onEditMeal,
}: {
  meals: DietMeal[];
  recipes: Recipe[];
  onEditMeal: (index: number, meal: DietMeal) => void;
}) {
  const { t } = useLocale();
  const mealLabel = useMealLabel();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  // Default expanded state per option, decided once at mount so switching tabs never changes it.
  // Options added later are always opened through an explicit override.
  const [defaults] = useState(() => {
    const cache: Record<string, boolean> = {};
    for (const value of meals) rememberExpandedDefaults(cache, value.options);
    return cache;
  });
  // Explicit user choices (toggle / expand all / new option); others use the card default.
  const activeIndex = Math.max(
    0,
    meals.findIndex((meal) => meal.id === activeId),
  );
  const meal = meals[activeIndex];
  if (!meal) return null;

  const setAll = (value: boolean) =>
    setOverrides({
      ...overrides,
      ...Object.fromEntries(meal.options.map((option) => [option.id, value])),
    });

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = meals[(activeIndex + step + meals.length) % meals.length];
    setActiveId(next.id);
    document.getElementById(`diet-tab-${next.id}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label={t("nutMealTabsLabel")}
        className="flex gap-1 overflow-x-auto border-b border-[var(--border-soft)]"
        style={{ scrollbarWidth: "thin" }}
      >
        {meals.map((value, index) => {
          const { count, missing } = mealTabStatus(value);
          const selected = index === activeIndex;
          return (
            <button
              key={value.id}
              id={`diet-tab-${value.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`diet-panel-${value.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveId(value.id)}
              onKeyDown={onKeyDown}
              className={`-mb-px inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                selected
                  ? "border-[var(--accent-text)] bg-[var(--accent-dim)] text-[var(--accent-text)]"
                  : "border-transparent text-[var(--text-3)] hover:text-[var(--text-1)]"
              }`}
            >
              {mealLabel(value.type)}
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[11px] ${
                  selected
                    ? "bg-[var(--accent)]/25 text-[var(--accent-text)]"
                    : "bg-[var(--bg-3)] text-[var(--text-2)]"
                }`}
              >
                {count}
              </span>
              {missing && (
                <span
                  role="img"
                  aria-label={t("nutMealNeedsOption")}
                  title={t("nutMealNeedsOption")}
                  className="inline-block h-2 w-2 rounded-full bg-[var(--gold-text)]"
                />
              )}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`diet-panel-${meal.id}`}
        aria-labelledby={`diet-tab-${meal.id}`}
        className="flex min-w-0 flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <p className="m-0 flex items-center gap-2 text-[var(--text-2)]">
            {t("nutSuggestedSchedule")}
            <span className="rounded-md border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-2 py-0.5 font-mono text-xs text-[var(--accent-text)]">
              {t("nutScheduleFlexible")}
            </span>
          </p>
          <p className="m-0 text-[var(--text-3)]">
            {meal.options.length === 1
              ? t("nutOptionsPrescribedOne")
              : t("nutOptionsPrescribedMany", { count: meal.options.length })}
          </p>
        </div>
        {meal.options.length > 1 && (
          <div className="flex gap-2 print:hidden">
            <Button type="button" variant="ghost" size="sm" onClick={() => setAll(true)}>
              {t("nutExpandAll")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAll(false)}>
              {t("nutCollapseAll")}
            </Button>
          </div>
        )}
        {meal.options.map((option, optionIndex) => (
          <DietOptionCard
            key={option.id}
            option={option}
            number={optionIndex + 1}
            recipes={recipes.filter((recipe) => recipe.type === meal.type)}
            defaultExpanded={defaults[option.id] ?? false}
            override={overrides[option.id]}
            onToggle={(next) => setOverrides({ ...overrides, [option.id]: next })}
            onPatch={(values) =>
              onEditMeal(activeIndex, {
                ...meal,
                options: meal.options.map((value, i) =>
                  i === optionIndex ? { ...value, ...values } : value,
                ),
              })
            }
            onRemove={() =>
              onEditMeal(activeIndex, {
                ...meal,
                options: meal.options.filter((_, i) => i !== optionIndex),
              })
            }
          />
        ))}
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--text-2)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-text)] print:hidden"
          onClick={() => {
            const id = crypto.randomUUID();
            setOverrides({ ...overrides, [id]: true });
            onEditMeal(activeIndex, {
              ...meal,
              options: [
                ...meal.options,
                { id, title: "", portions: [emptyPortion()], notes: "", recipeId: null },
              ],
            });
          }}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md border border-[var(--border)]">
            <Icon size={14}>{icons.plus}</Icon>
          </span>
          {t("nutAddMealOption", { meal: mealLabel(meal.type).toLowerCase() })}
        </button>
      </div>
    </div>
  );
}
