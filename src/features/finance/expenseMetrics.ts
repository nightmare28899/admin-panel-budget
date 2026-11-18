/** Days of the viewer's current calendar month that have started, today included. */
export function daysElapsedInMonth(now = new Date()): number {
  return now.getDate();
}

export function averagePerDay(total: number, days: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(days) || days <= 0) return 0;
  return total / days;
}
