"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";
import { PortionEditor } from "./PortionEditor";
import { SelectField, TextAreaField, TextField } from "./NutritionFields";
import { Icon, icons } from "./NutritionUi";
import { portionLine } from "./domain/dietDraft";
import type { DietOption, Recipe } from "./nutrition.types";
import { recipeMatchesOption } from "./domain/recipe";

/** One diet option: portion tiles and clinical note, plus the full editors when expanded. */
export function DietOptionCard({
  option,
  number,
  recipes,
  defaultExpanded,
  override,
  onToggle,
  onPatch,
  onRemove,
}: {
  option: DietOption;
  /** 1-based position among the meal's options. */
  number: number;
  /** Recipes of the same meal type, candidates for the matching-recipe select. */
  recipes: Recipe[];
  /** Live default; only its value at mount counts so typing never collapses the card. */
  defaultExpanded: boolean;
  /** Explicit user choice; wins over the frozen default. */
  override: boolean | undefined;
  onToggle: (expanded: boolean) => void;
  onPatch: (values: Partial<DietOption>) => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const [initiallyExpanded] = useState(defaultExpanded);
  const expanded = override ?? initiallyExpanded;
  const panelId = `diet-option-${option.id}`;
  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border bg-[var(--bg-1)]/60 p-4 ${
        expanded ? "border-[var(--text-1)]" : "border-[var(--border-soft)]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[var(--accent)]/40 bg-[var(--accent-dim)] font-mono text-xs font-semibold text-[var(--accent-text)]"
        >
          {number}
        </span>
        <h3 className="m-0 min-w-0 flex-1 basis-48 truncate text-[15px] font-semibold text-[var(--text-1)]">
          {t("nutOptionNumber", { number, title: option.title.trim() || t("nutUntitledOption") })}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="!rounded-lg"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => onToggle(!expanded)}
          >
            <Icon size={14}>{icons.edit}</Icon>
            {expanded ? t("nutCollapseOption") : t("nutEditOption")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="!rounded-lg !border !border-[var(--rose)]/40 !text-[var(--rose)] hover:!bg-[var(--rose)]/10"
            onClick={onRemove}
          >
            <Icon size={14}>{icons.trash}</Icon>
            {t("nutRemoveOption")}
          </Button>
        </div>
      </div>
      {option.portions.length > 0 ? (
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
          {option.portions.map((portion) => {
            const line = portionLine(portion);
            return (
              <li
                key={portion.id}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-1)] p-3"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                    portion.free
                      ? "border-[var(--gold)]/40 bg-[var(--gold-dim)] text-[var(--gold-text)]"
                      : "border-[var(--accent)]/30 bg-[var(--accent-dim)] text-[var(--accent-text)]"
                  }`}
                >
                  <Icon size={18}>{icons.food}</Icon>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-medium text-[var(--text-1)]">
                    {portion.foodName.trim() || t("nutFoodName")}
                  </p>
                  {line ? (
                    <p className="m-0 truncate font-mono text-xs text-[var(--text-3)]" title={line}>
                      {line}
                    </p>
                  ) : null}
                </div>
                {portion.free ? (
                  <span className="shrink-0 rounded-md bg-[var(--gold-dim)] px-2 py-0.5 text-[11px] text-[var(--gold-text)]">
                    {t("nutFreeTag")}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 text-sm text-[var(--text-3)]">{t("nutNoFoodsSummary")}</p>
      )}
      {option.notes.trim() ? (
        <p className="m-0 flex items-start gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-1)] px-3 py-2.5 text-[13px] text-[var(--text-2)]">
          <span className="mt-0.5 text-[var(--accent-text)]">
            <Icon size={16}>{icons.circleCheck}</Icon>
          </span>
          <span className="min-w-0 break-words">
            {t("nutClinicalIndication")} {option.notes.trim()}
          </span>
        </p>
      ) : null}
      {expanded && (
        <div id={panelId} className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-4">
          <TextField
            label={t("nutOptionTitle")}
            required
            value={option.title}
            onChange={(event) => onPatch({ title: event.target.value })}
            placeholder={t("nutPhOptionTitle")}
          />
          <PortionEditor
            portions={option.portions}
            onChange={(portions) => onPatch({ portions, recipeId: null })}
          />
          <TextAreaField
            label={t("nutPreparationNotes")}
            value={option.notes}
            onChange={(notes) => onPatch({ notes })}
            placeholder={t("nutPhNotes")}
          />
          <SelectField
            label={t("nutMatchingRecipe")}
            value={option.recipeId ?? ""}
            onChange={(recipeId) => onPatch({ recipeId: recipeId || null })}
            options={[
              { value: "", label: t("nutNoRecipeAssociation") },
              ...recipes
                .filter((recipe) => recipeMatchesOption(recipe, option))
                .map((recipe) => ({ value: recipe.id, label: recipe.title })),
            ]}
          />
        </div>
      )}
    </article>
  );
}
