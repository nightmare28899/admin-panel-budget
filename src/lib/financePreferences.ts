export const DAILY_BUDGET_MAX = 1_000_000;

export const SUPPORTED_CURRENCIES = [
  { value: "USD", label: "US Dollar (USD)" },
  { value: "MXN", label: "Mexican Peso (MXN)" },
  { value: "EUR", label: "Euro (EUR)" },
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]["value"];

export function clampDailyBudgetInput(value: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 0;
  return Math.min(Math.max(amount, 0), DAILY_BUDGET_MAX);
}

export function normalizeSupportedCurrency(value: unknown): SupportedCurrency {
  return SUPPORTED_CURRENCIES.find((option) => option.value === value)?.value ?? "MXN";
}
