export type ReportCsvLabels = {
  period: string;
  currency: string;
  total: string;
  operations: string;
  card: string;
  last4: string;
  expenses: string;
  category: string;
};

export type ReportCsvBucket = {
  /** Unambiguous period label (ISO date, month or quarter key). */
  label: string;
  totalsByCurrency: Record<string, number>;
  countsByCurrency: Record<string, number>;
};

export type ReportCsvCard = {
  name: string;
  last4: string;
  expenseCount: number;
  totalsByCurrency: { currency: string; total: number }[];
};

export type ReportCsvCategory = {
  name: string;
  currency: string;
  total: number;
  count: number;
};

const BOM = "\uFEFF";

function escapeCell(value: string | number): string {
  let text = String(value);
  // Neutralise spreadsheet formula injection from user-controlled names.
  // Negative numbers ("-12.50") are legitimate and stay untouched.
  if (typeof value === "string" && /^(?:[=+@\t\r]|-(?![\d.]))/.test(text)) {
    text = `'${text}`;
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function row(cells: (string | number)[]) {
  return cells.map(escapeCell).join(",");
}

/**
 * Builds the report CSV: one row per bucket and currency (the primary
 * currency always appears, even with zero spend; other currencies only when
 * they have activity), a blank line, then totals by card.
 */
export function buildReportCsv({
  labels,
  buckets,
  primaryCurrency,
  cards,
  categories,
}: {
  labels: ReportCsvLabels;
  buckets: ReportCsvBucket[];
  primaryCurrency: string | null;
  cards: ReportCsvCard[];
  categories: ReportCsvCategory[];
}): string {
  const lines: string[] = [
    row([labels.period, labels.currency, labels.total, labels.operations]),
  ];

  for (const bucket of buckets) {
    const currencies = new Set(Object.keys(bucket.countsByCurrency));
    if (primaryCurrency) currencies.add(primaryCurrency);
    for (const currency of Array.from(currencies).sort()) {
      lines.push(
        row([
          bucket.label,
          currency,
          (bucket.totalsByCurrency[currency] ?? 0).toFixed(2),
          bucket.countsByCurrency[currency] ?? 0,
        ]),
      );
    }
  }

  if (cards.length > 0) {
    lines.push("");
    lines.push(
      row([labels.card, labels.last4, labels.currency, labels.total, labels.expenses]),
    );
    for (const card of cards) {
      for (const item of card.totalsByCurrency) {
        lines.push(
          row([
            card.name,
            card.last4,
            item.currency,
            item.total.toFixed(2),
            card.expenseCount,
          ]),
        );
      }
    }
  }

  if (categories.length > 0) {
    lines.push("");
    lines.push(
      row([labels.category, labels.currency, labels.total, labels.operations]),
    );
    for (const item of categories) {
      lines.push(
        row([item.name, item.currency, item.total.toFixed(2), item.count]),
      );
    }
  }

  return BOM + lines.join("\r\n") + "\r\n";
}

export function reportCsvFilename(from: string, to: string) {
  return `reportes-gastos-${from}-${to}.csv`;
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
