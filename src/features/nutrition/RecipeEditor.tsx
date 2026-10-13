"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/i18n/LocaleProvider";
import { recipeSchema } from "./nutrition.schemas";
import { saveRecipeAction } from "./nutrition.actions";
import { mealTypes, type Recipe } from "./nutrition.types";
import { PortionEditor } from "./PortionEditor";
import {
  ControlledCheckbox,
  ControlledInput,
  ControlledSelect,
  TextAreaField,
} from "./NutritionFields";
import { Banner, SectionTitle, useMealLabel } from "./NutritionUi";

export function RecipeEditor({
  recipe,
  onSaved,
  onCancel,
}: {
  recipe: Recipe;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t } = useLocale();
  const mealLabel = useMealLabel();
  const [message, setMessage] = useState("");
  const form = useForm<Recipe>({ resolver: zodResolver(recipeSchema), defaultValues: recipe });
  const ingredients = useWatch({ control: form.control, name: "ingredients" });
  const steps = useWatch({ control: form.control, name: "steps" });

  return (
    <Card>
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          setMessage("");
          try {
            const result = await saveRecipeAction(values);
            if (result.success) onSaved();
            else setMessage(result.error);
          } catch {
            setMessage(t("nutRecipeSaveFailed"));
          }
        })}
      >
        <SectionTitle>{t("nutRecipeEditor")}</SectionTitle>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ControlledInput
            control={form.control}
            name="title"
            label={t("nutRecipeTitle")}
            maxLength={120}
            placeholder={t("nutPhRecipeTitle")}
          />
          <ControlledSelect
            control={form.control}
            name="type"
            label={t("nutMealType")}
            options={mealTypes.map((type) => ({ value: type, label: mealLabel(type) }))}
          />
        </div>
        <PortionEditor
          portions={ingredients}
          onChange={(portions) => form.setValue("ingredients", portions, { shouldDirty: true })}
        />
        <p className="text-xs text-[var(--text-3)]">{t("nutFreeIngredientsHint")}</p>
        <TextAreaField
          label={t("nutStepsLabel")}
          rows={5}
          placeholder={t("nutPhSteps")}
          value={steps.join("\n")}
          onChange={(value) => form.setValue("steps", value.split("\n"), { shouldDirty: true })}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ControlledInput
            control={form.control}
            name="duration"
            label={t("nutDurationLabel")}
            type="number"
            min={0}
            max={1440}
            placeholder={t("nutPhDuration")}
            asNumber
          />
          <ControlledInput
            control={form.control}
            name="imageUrl"
            label={t("nutImageLink")}
            type="url"
            emptyAsNull
            placeholder={t("nutPhImageUrl")}
          />
        </div>
        <TextAreaFieldForNotes form={form} label={t("nutNotes")} placeholder={t("nutPhNotes")} />
        <ControlledCheckbox control={form.control} name="demo">
          {t("nutDemoCheckbox")}
        </ControlledCheckbox>
        {Object.keys(form.formState.errors).length > 0 && (
          <Banner tone="error" className="">
            {t("nutRecipeCheckErrors")}
          </Banner>
        )}
        {message && (
          <Banner tone="error" className="">
            {message}
          </Banner>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={form.formState.isSubmitting}>
            {t("nutSaveRecipe")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={form.formState.isSubmitting}
            onClick={onCancel}
          >
            {t("cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function TextAreaFieldForNotes({
  form,
  label,
  placeholder,
}: {
  form: ReturnType<typeof useForm<Recipe>>;
  label: string;
  placeholder: string;
}) {
  const notes = useWatch({ control: form.control, name: "notes" });
  return (
    <TextAreaField
      label={label}
      placeholder={placeholder}
      value={notes}
      onChange={(value) => form.setValue("notes", value, { shouldDirty: true })}
    />
  );
}
