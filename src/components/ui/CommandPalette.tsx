"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./Modal";
import { useLocale } from "@/i18n/LocaleProvider";

type CommandEntry = {
  label: string;
  href: string;
};

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { t } = useLocale();
  const entries = useMemo<CommandEntry[]>(
    () => [
      { label: t("dashboardHome"), href: "/" },
      { label: t("users"), href: "/dashboard/users" },
      { label: t("profile"), href: "/dashboard/profile" },
      { label: t("notifications"), href: "/dashboard/notifications" },
      { label: t("financeOverview"), href: "/finance" },
      { label: t("expenses"), href: "/finance/expenses" },
      { label: t("categories"), href: "/finance/categories" },
      { label: t("reports"), href: "/finance/reports" },
      { label: t("subscriptions"), href: "/finance/subscriptions" },
    ],
    [t],
  );
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset the search box each time the palette transitions from closed to
  // open — adjusted during render (not an effect) per the React-recommended
  // pattern for state that depends on a prop change.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((entry) => entry.label.toLowerCase().includes(needle));
  }, [entries, query]);

  const clampedActiveIndex = results.length ? Math.min(activeIndex, results.length - 1) : 0;

  const go = (entry: CommandEntry) => {
    onClose();
    router.push(entry.href);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index + 1) % results.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (results.length ? (index - 1 + results.length) % results.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = results[clampedActiveIndex];
      if (entry) go(entry);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("jumpTo")} maxWidth="max-w-lg">
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder={t("searchPages")}
        role="combobox"
        aria-expanded="true"
        aria-controls="command-palette-results"
        aria-activedescendant={results[clampedActiveIndex] ? `command-palette-option-${clampedActiveIndex}` : undefined}
        className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-3)] px-3.5 py-2.5 text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-3)] focus:border-[var(--emerald)]"
      />
      <ul id="command-palette-results" role="listbox" className="-mx-2 mt-1 max-h-72 space-y-0.5 overflow-y-auto">
        {results.length === 0 ? (
          <li className="px-2 py-6 text-center text-sm text-[var(--text-3)]">{t("noMatches")}</li>
        ) : (
          results.map((entry, index) => (
            <li key={entry.href} id={`command-palette-option-${index}`} role="option" aria-selected={index === clampedActiveIndex}>
              <button
                type="button"
                onClick={() => go(entry)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-left text-sm transition-colors ${
                  index === clampedActiveIndex
                    ? "bg-[var(--bg-3)] text-[var(--text-1)]"
                    : "text-[var(--text-2)] hover:bg-[var(--bg-3)]/60 hover:text-[var(--text-1)]"
                }`}
              >
                <span>{entry.label}</span>
                <span className="text-xs text-[var(--text-3)]">{entry.href}</span>
              </button>
            </li>
          ))
        )}
      </ul>
    </Modal>
  );
}
