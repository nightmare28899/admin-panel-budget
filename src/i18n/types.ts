export const SUPPORTED_LOCALES = ["en", "es"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export type MessageValues = Record<string, string | number>;

export function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "es";
}
