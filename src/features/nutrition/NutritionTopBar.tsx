"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/i18n/LocaleProvider";
import { Icon, icons } from "./NutritionUi";
import { recipeSearchUrl } from "./domain/search";

/** "NUTRICIÓN PERSONAL / Plan Nutricional Activo": the chip only shows with an active diet. */
export function NutritionBreadcrumb({ hasActiveDiet }: { hasActiveDiet: boolean }) {
  const { t } = useLocale();
  return (
    <nav aria-label={t("nutBreadcrumbRoot")} className="flex min-w-0 items-center gap-3">
      <span className="hidden truncate font-mono text-xs uppercase tracking-[0.12em] text-[var(--text-3)] sm:inline">
        {t("nutBreadcrumbRoot")}
      </span>
      {hasActiveDiet ? (
        <>
          <span aria-hidden="true" className="hidden text-[var(--text-3)] sm:inline">
            /
          </span>
          <span className="truncate rounded-full border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-text)]">
            {t("nutActivePlanChip")}
          </span>
        </>
      ) : null}
    </nav>
  );
}

/** Searches recipes by food or ingredient; Cmd/Ctrl+K focuses it. */
export function NutritionSearch() {
  const { t } = useLocale();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        router.push(recipeSearchUrl(query));
      }}
      className="flex h-[34px] w-36 items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-1)] px-3 text-[var(--text-3)] transition-colors focus-within:border-[var(--accent)] sm:w-72"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true" className="shrink-0">
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="m21 21-4.3-4.3" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label={t("nutSearchLabel")}
        placeholder={t("nutSearchPlaceholder")}
        className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-[13px] text-[var(--text-1)] outline-none placeholder:text-[var(--text-3)] focus:ring-0"
      />
      <kbd className="hidden shrink-0 rounded-md border border-[var(--border-soft)] bg-[var(--bg-3)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-3)] sm:inline">
        ⌘K
      </kbd>
    </form>
  );
}

/** Opens the diet page with a blank draft. */
export function CreateDietLink() {
  const { t } = useLocale();
  return (
    <Link
      href="/nutrition/diet?new=1"
      className="inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[var(--accent)] px-3 text-[13px] font-semibold text-[var(--accent-contrast)] shadow-[0_4px_14px_color-mix(in_oklab,var(--accent)_35%,transparent)] transition-[filter] hover:brightness-110 sm:px-4"
    >
      <Icon size={15}>{icons.plus}</Icon>
      <span className="hidden sm:inline">{t("nutCreateDiet")}</span>
      <span className="sr-only sm:hidden">{t("nutCreateDiet")}</span>
    </Link>
  );
}
