// Pure iCalendar (RFC 5545) builder for card payment reminders. No React, no
// browser APIs: text arrives already localized and the clock is injectable so
// the output is deterministic and easy to unit test.

export type PaymentReminderEvent = {
  /** Stable unique id, e.g. `<statementImportId>`; a domain suffix is appended. */
  uid: string;
  /** Local calendar day of the payment, "YYYY-MM-DD". */
  dueDate: string;
  summary: string;
  description: string;
  /** Text shown by each reminder alarm. */
  alarmDescription: string;
};

export type PaymentReminderAlarm = {
  /** RFC 5545 duration relative to the event start, e.g. "-P1D" or "-PT2H". */
  trigger: string;
};

export const DEFAULT_PAYMENT_REMINDER_ALARMS: PaymentReminderAlarm[] = [
  { trigger: "-P1D" },
  { trigger: "-PT2H" },
];

const PRODID = "-//Budget App//Payment Reminder//EN";
const UID_DOMAIN = "budget-app";
const MAX_LINE_OCTETS = 75;

/** Escapes TEXT values: backslash, semicolon, comma and newlines. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Folds a content line to 75 octets per line without splitting a UTF-8 character. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let currentOctets = 0;
  // The continuation lines start with one space, which counts toward the limit.
  let limit = MAX_LINE_OCTETS;

  for (const char of line) {
    const size = encoder.encode(char).length;
    if (currentOctets + size > limit) {
      parts.push(current);
      current = "";
      currentOctets = 0;
      limit = MAX_LINE_OCTETS - 1;
    }
    current += char;
    currentOctets += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

function formatUtcTimestamp(date: Date): string {
  return (
    `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function parseDateParts(dueDate: string): { year: number; month: number; day: number } {
  const match = dueDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) throw new Error(`Invalid due date: ${dueDate}`);
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function formatDateValue(year: number, month: number, day: number): string {
  return `${pad(year, 4)}${pad(month)}${pad(day)}`;
}

function nextDayValue(dueDate: string): string {
  const { year, month, day } = parseDateParts(dueDate);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return formatDateValue(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function buildEventLines(
  event: PaymentReminderEvent,
  stamp: string,
  alarms: PaymentReminderAlarm[],
): string[] {
  const { year, month, day } = parseDateParts(event.dueDate);
  return [
    "BEGIN:VEVENT",
    `UID:${event.uid}@${UID_DOMAIN}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${formatDateValue(year, month, day)}`,
    `DTEND;VALUE=DATE:${nextDayValue(event.dueDate)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    "TRANSP:TRANSPARENT",
    ...alarms.flatMap((alarm) => [
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcsText(event.alarmDescription)}`,
      `TRIGGER:${alarm.trigger}`,
      "END:VALARM",
    ]),
    "END:VEVENT",
  ];
}

/** Builds a complete VCALENDAR with one all-day VEVENT per payment, CRLF terminated. */
export function buildPaymentRemindersIcs(
  events: PaymentReminderEvent[],
  options: { now?: Date; alarms?: PaymentReminderAlarm[] } = {},
): string {
  const stamp = formatUtcTimestamp(options.now ?? new Date());
  const alarms = options.alarms ?? DEFAULT_PAYMENT_REMINDER_ALARMS;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events.flatMap((event) => buildEventLines(event, stamp, alarms)),
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** `recordatorio-pago-<bank>-<yyyy-mm-dd>.ics` (pass a generic label for multi-card files). */
export function paymentReminderFilename(bank: string | null, dueDate: string): string {
  const slug = bank ? slugify(bank) : "";
  return `recordatorio-pago-${slug || "tarjeta"}-${dueDate.slice(0, 10)}.ics`;
}

/** Triggers a client-side download of the .ics text. Browser only. */
export function downloadIcs(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
