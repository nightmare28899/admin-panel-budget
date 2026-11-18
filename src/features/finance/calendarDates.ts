const DAY_MS = 86_400_000;

/** Parses "YYYY-MM-DD" (or an ISO string starting with it) as a local calendar day. */
export function parseDateOnly(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Whole local calendar days from `from` to `to` (negative when `to` is earlier). */
export function calendarDaysBetween(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / DAY_MS);
}

/** Calendar days until a date-only due date; negative when overdue, null when unparseable. */
export function daysUntilDueDate(dueDate: string, now: Date = new Date()): number | null {
  const due = parseDateOnly(dueDate);
  return due ? calendarDaysBetween(now, due) : null;
}

export function formatDateOnly(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
