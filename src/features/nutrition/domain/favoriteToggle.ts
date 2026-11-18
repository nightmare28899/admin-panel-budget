/** Final favorite state once the server answered an optimistic toggle. */
export function settleFavorite({
  previous,
  next,
  success,
}: {
  previous: boolean;
  next: boolean;
  success: boolean;
}): boolean {
  return success ? next : previous;
}
