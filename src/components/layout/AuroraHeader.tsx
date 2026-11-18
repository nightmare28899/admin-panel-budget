"use client";

import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { useLocale } from "@/i18n/LocaleProvider";

/** Header bar of the aurora main panel: breadcrumb on the left, search and tools on the right. */
export function AuroraHeader({
  rootLabel,
  pageLabel,
  lead,
  pill,
  search,
  onOpenSearch,
  onOpenSidebar,
  showThemeSwitcher,
  slot,
  actions,
}: {
  rootLabel: string;
  pageLabel?: string;
  /** Replaces the breadcrumb (e.g. a workspace-specific one). */
  lead?: ReactNode;
  /** Small mono uppercase pill next to the breadcrumb. */
  pill?: string;
  /** Replaces the search trigger; the page then owns the Cmd+K shortcut. */
  search?: ReactNode;
  onOpenSearch: () => void;
  onOpenSidebar: () => void;
  showThemeSwitcher: boolean;
  slot?: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <header className="relative z-30 flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-[var(--border-soft)] px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label={t("openSidebar")}
          className="cursor-pointer rounded-xl p-1.5 text-[var(--text-2)] transition-colors hover:bg-[var(--bg-3)] hover:text-[var(--text-1)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] lg:hidden"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {lead ?? (
          <nav aria-label={rootLabel} className="flex min-w-0 items-center gap-2 text-sm">
            <span className="hidden truncate text-[var(--text-3)] sm:inline">{rootLabel}</span>
            {pageLabel && (
              <>
                <span aria-hidden="true" className="hidden text-[var(--text-3)] sm:inline">›</span>
                <span className="flex min-w-0 items-center gap-2 font-semibold text-[var(--accent-text)]">
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span aria-current="page" className="truncate">{pageLabel}</span>
                </span>
              </>
            )}
          </nav>
        )}
        {pill && (
          <span className="hidden shrink-0 rounded-full border border-[var(--border-soft)] bg-[var(--bg-3)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-3)] md:inline">
            {pill}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-x-1.5 sm:gap-x-3">
        {search ?? (
          <button
            type="button"
            onClick={onOpenSearch}
            aria-label={t("searchShortcut")}
            title={t("searchShortcut")}
            className="flex h-10 w-10 cursor-pointer items-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-3)] transition-colors hover:text-[var(--text-1)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] sm:w-64 sm:px-3.5"
          >
            <svg className="mx-auto shrink-0 sm:mx-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m21 21-4.3-4.3" />
            </svg>
            <span className="hidden flex-1 truncate text-left text-sm sm:inline">{t("searchPages")}</span>
            <kbd className="hidden rounded-md border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-3)] sm:inline">⌘K</kbd>
          </button>
        )}
        {showThemeSwitcher ? <ThemeSwitcher /> : null}
        <LanguageSwitcher />
        {slot ? (
          <>
            {slot}
            <div className="hidden h-[22px] w-px bg-[var(--border)] sm:block" aria-hidden="true" />
          </>
        ) : null}
        {actions}
      </div>
    </header>
  );
}
