// Full class strings (not interpolated) so Tailwind can see them. The column
// count follows the card count so the last row is never a lone orphan card.
const SINGLE = "grid max-w-md gap-6";
const TWO = "grid gap-6 sm:grid-cols-2";
const TWO_OR_FOUR = "grid gap-6 sm:grid-cols-2 2xl:grid-cols-4";
const THREE = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

export function cardGridClass(count: number): string {
  if (count <= 1) return SINGLE;
  if (count === 2) return TWO;
  if (count % 4 === 0) return TWO_OR_FOUR;
  return THREE;
}
