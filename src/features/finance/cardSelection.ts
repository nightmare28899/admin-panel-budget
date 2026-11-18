/**
 * Which card the desktop detail panel shows: the current selection while it is still
 * visible, otherwise the first visible card (filter change, card added or removed).
 */
export function resolveSelectedCardId(visibleIds: readonly string[], selectedId: string | undefined): string | undefined {
  if (selectedId !== undefined && visibleIds.includes(selectedId)) return selectedId;
  return visibleIds[0];
}
