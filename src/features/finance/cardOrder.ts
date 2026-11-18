/** Moves `fromId` so it lands right before `toId`. Returns the same array for same/unknown ids. */
export function moveCard(ids: readonly string[], fromId: string, toId: string): string[] {
  const from = ids.indexOf(fromId);
  const to = ids.indexOf(toId);
  if (from === -1 || to === -1 || from === to) return ids as string[];
  const next = ids.filter((id) => id !== fromId);
  next.splice(next.indexOf(toId), 0, fromId);
  return next;
}

/** Keyboard variant: shifts `id` by `delta` positions, clamped no-op at the edges. */
export function shiftCard(ids: readonly string[], id: string, delta: number): string[] {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from === -1 || delta === 0 || to < 0 || to >= ids.length) return ids as string[];
  const next = ids.filter((item) => item !== id);
  next.splice(to, 0, id);
  return next;
}

/**
 * Full id list to persist after reordering a filtered view: the reordered visible ids first,
 * then every hidden id in its current relative order.
 */
export function buildFullOrder(allIds: readonly string[], visibleOrderedIds: readonly string[]): string[] {
  const known = new Set(allIds);
  const visible = visibleOrderedIds.filter((id) => known.has(id));
  const shown = new Set(visible);
  return [...visible, ...allIds.filter((id) => !shown.has(id))];
}

/** Sorts items by the given id order; items not listed keep their relative order at the end. */
export function applyCardOrder<T extends { id: string }>(items: readonly T[], ids: readonly string[]): T[] {
  const rank = new Map(ids.map((id, index) => [id, index]));
  const end = ids.length;
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (rank.get(a.item.id) ?? end) - (rank.get(b.item.id) ?? end) || a.index - b.index)
    .map(({ item }) => item);
}
