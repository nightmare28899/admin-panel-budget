import type { Diet, Portion } from "../nutrition.types";
import { formatQuantity } from "./format";

/** A draft is pending when it has no saved baseline or differs from it. */
export function isDraftDirty(baseline: Diet | null, draft: Diet): boolean {
  return baseline === null || JSON.stringify(baseline) !== JSON.stringify(draft);
}

/** "1 cup diced": the prescribed amount and preparation of one portion, as written. */
export function portionLine(portion: Pick<Portion, "quantity" | "unit" | "preparation" | "free">): string {
  const quantity = portion.free ? null : formatQuantity(portion.quantity);
  const amount = quantity ? [quantity, portion.unit.trim()].filter(Boolean).join(" ") : "";
  return [amount, portion.preparation.trim()].filter(Boolean).join(" ");
}
