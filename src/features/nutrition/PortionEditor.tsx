"use client";

import { Checkbox } from "antd";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";
import { TextField } from "./NutritionFields";
import { Icon, InsetPanel, icons } from "./NutritionUi";
import type { Portion } from "./nutrition.types";
import { formatQuantity } from "./domain/format";

export const emptyPortion = (): Portion => ({
  id: crypto.randomUUID(),
  foodId: "",
  foodName: "",
  quantity: null,
  unit: "",
  preparation: "",
  free: false,
});

/** Editable list of exact food portions, shared by diet options and recipes. */
export function PortionEditor({
  portions,
  onChange,
  allowFree = true,
}: {
  portions: Portion[];
  onChange: (portions: Portion[]) => void;
  allowFree?: boolean;
}) {
  const { t } = useLocale();
  const update = (index: number, values: Partial<Portion>) =>
    onChange(portions.map((portion, i) => (i === index ? { ...portion, ...values } : portion)));
  return (
    <div className="flex flex-col gap-3">
      {portions.map((portion, index) => (
        <InsetPanel key={portion.id}>
          <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
            <legend className="mb-2 p-0 text-sm font-medium text-[var(--text-1)]">
              {t("nutFoodNumber", { number: index + 1 })}
            </legend>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextField
                label={t("nutFoodIdentity")}
                required
                value={portion.foodId}
                onChange={(event) => update(index, { foodId: event.target.value })}
                placeholder={t("nutPhFoodId")}
              />
              <TextField
                label={t("nutFoodName")}
                required
                value={portion.foodName}
                onChange={(event) => update(index, { foodName: event.target.value })}
                placeholder={t("nutPhFoodName")}
              />
              <TextField
                label={t("nutExactQuantity")}
                value={formatQuantity(portion.quantity) ?? ""}
                disabled={portion.free}
                onChange={(event) => update(index, { quantity: event.target.value || null })}
                placeholder={t("nutPhQuantity")}
              />
              <TextField
                label={t("nutPrescribedUnit")}
                value={portion.unit}
                onChange={(event) => update(index, { unit: event.target.value })}
                placeholder={t("nutPhUnit")}
              />
            </div>
            <TextField
              label={t("nutPreparation")}
              value={portion.preparation}
              onChange={(event) => update(index, { preparation: event.target.value })}
              placeholder={t("nutPhPreparation")}
            />
            <Checkbox
              disabled={!allowFree && !portion.free}
              checked={portion.free}
              onChange={(event) =>
                update(index, {
                  free: event.target.checked,
                  quantity: event.target.checked ? null : portion.quantity,
                })
              }
            >
              {t("nutFreeFoodAllowed")}
            </Checkbox>
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(portions.filter((_, i) => i !== index))}
              >
                {t("nutRemoveFood")}
              </Button>
            </div>
          </fieldset>
        </InsetPanel>
      ))}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...portions, emptyPortion()])}
        >
          <Icon size={16}>{icons.plus}</Icon>
          {t("nutAddFood")}
        </Button>
      </div>
      <p className="text-xs text-[var(--text-3)]">{t("nutPortionHint")}</p>
    </div>
  );
}
