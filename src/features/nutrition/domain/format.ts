/** Stored quantities are fixed-scale decimals ("100.000000000000"); show them compactly. */
export function formatQuantity(quantity: string | null | undefined): string | null {
  if (quantity == null) return null;
  return quantity.includes(".") ? quantity.replace(/\.?0+$/, "") : quantity;
}

const MAX_LABEL_FOODS = 3;

/** Option title plus its first foods, so generic titles like "Opción 1" are recognisable. */
export function optionLabel(option: { title: string; portions: { foodName: string }[] }): string {
  const foods = option.portions.map((portion) => portion.foodName);
  if (foods.length === 0) return option.title;
  const shown = foods.slice(0, MAX_LABEL_FOODS).join(", ");
  const extra = foods.length > MAX_LABEL_FOODS ? ` +${foods.length - MAX_LABEL_FOODS}` : "";
  return `${option.title} · ${shown}${extra}`;
}
