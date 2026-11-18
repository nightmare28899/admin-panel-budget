"use client";

import { useLocale } from "@/i18n/LocaleProvider";
import { ThemePicker } from "./ThemePicker";

/** Themes page shared by every workspace shell; `className` supplies the shell's page padding. */
export function ThemesView({ className = "" }: { className?: string }) {
  const { t } = useLocale();
  return (
    <div className={`w-full ${className}`}>
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">{t("themes")}</h1>
        <p className="mt-0.5 text-sm text-[var(--text-3)]">{t("themesDescription")}</p>
      </div>
      <ThemePicker />
    </div>
  );
}
