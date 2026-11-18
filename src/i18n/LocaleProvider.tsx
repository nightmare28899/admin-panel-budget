"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type PropsWithChildren } from "react";
import { messages, type MessageKey } from "./messages";
import { isLocale, type Locale, type MessageValues } from "./types";

const LOCALE_STORAGE_KEY = "budget-panel-locale";
const listeners = new Set<() => void>();

// `new Date("2026-10-15")` is UTC midnight, which renders as the previous day
// west of UTC (e.g. Mexico). Date-only strings are calendar days, so build
// them in local time instead.
function toDisplayDate(input: Date | string | number) {
  if (typeof input === "string") {
    const dateOnly = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
    }
  }
  return new Date(input);
}

function browserLocale(): Locale {
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocale(stored)) return stored;
  return window.navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
}

function localeSnapshot(): Locale {
  try {
    return browserLocale();
  } catch {
    return "en";
  }
}

function localeServerSnapshot(): Locale {
  return "en";
}

function subscribeLocale(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function persistLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // The selector remains functional for the current page when storage is unavailable.
  }
  listeners.forEach((listener) => listener());
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: MessageValues) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: PropsWithChildren) {
  const locale = useSyncExternalStore(subscribeLocale, localeSnapshot, localeServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useCallback(
    (key: MessageKey, values?: MessageValues) => {
      const template = messages[locale][key];
      if (!values) return template;
      return template.replace(/\{(\w+)\}/g, (match, name: string) =>
        Object.hasOwn(values, name) ? String(values[name]) : match,
      );
    },
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: persistLocale,
      t,
      formatDate: (input, options) =>
        new Intl.DateTimeFormat(locale, options).format(toDisplayDate(input)),
      formatNumber: (input, options) => new Intl.NumberFormat(locale, options).format(input),
    }),
    [locale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
