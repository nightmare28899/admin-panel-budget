"use client";

import { useRef, type KeyboardEvent } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";
import { useWorkspaceAppearance } from "@/hooks/useWorkspaceAppearance";
import { useWorkspaceThemeVariant } from "@/hooks/useWorkspaceThemeVariant";
import type { WorkspaceAppearance } from "@/lib/workspaceAppearance";
import { WORKSPACE_THEME_VARIANTS, type WorkspaceThemeVariant } from "@/lib/workspaceTheme";
import { nextRadioIndex } from "./radioNavigation";

const THEME_COPY: Record<WorkspaceThemeVariant, { name: MessageKey; description: MessageKey }> = {
  classic: { name: "themeClassicName", description: "themeClassicDescription" },
  aurora: { name: "themeAuroraName", description: "themeAuroraDescription" },
};

const APPEARANCES: { value: WorkspaceAppearance; label: MessageKey }[] = [
  { value: "light", label: "themeAppearanceLight" },
  { value: "dark", label: "themeAppearanceDark" },
];

const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

/**
 * Roving-tabindex radio group: arrows move and select, Tab leaves the group.
 * Options are rendered by the caller; this hook only wires focus and keys.
 */
function useRadioKeys<T>(values: readonly T[], selected: T, onSelect: (value: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent) => {
    const next = nextRadioIndex(values.indexOf(selected), event.key, values.length);
    if (next === null) return;
    event.preventDefault();
    onSelect(values[next]);
    refs.current[next]?.focus();
  };
  return { refs, onKeyDown };
}

/** Aurora layout in miniature: floating icon rail, floating main panel, KPI card and card rows. */
function AuroraPreview({ appearance, balanceLabel }: { appearance: WorkspaceAppearance; balanceLabel: string }) {
  const floating = { background: "var(--panel-bg)", border: "1px solid var(--panel-border)", boxShadow: "var(--panel-shadow)" };
  return (
    <div
      aria-hidden="true"
      data-workspace="preview"
      data-theme="aurora"
      data-appearance={appearance}
      className="flex h-36 gap-1.5 overflow-hidden rounded-xl p-1.5"
      style={{ background: "var(--frame-bg)", color: "var(--text-1)" }}
    >
      <div className="flex w-7 shrink-0 flex-col items-center gap-1.5 rounded-xl py-1.5" style={{ ...floating, background: "var(--rail-bg)" }}>
        <span className="h-3.5 w-3.5 rounded-md" style={{ border: "1px solid var(--accent)" }} />
        <span className="h-px w-3" style={{ background: "var(--border-soft)" }} />
        <span className="relative h-3.5 w-3.5 rounded-md" style={{ background: "var(--accent-dim)" }}>
          <span className="absolute top-0.5 -left-1.5 h-2.5 w-0.5 rounded-r-full" style={{ background: "var(--accent)" }} />
        </span>
        <span className="h-3.5 w-3.5 rounded-md" style={{ background: "var(--bg-3)" }} />
        <span className="h-3.5 w-3.5 rounded-md" style={{ background: "var(--bg-3)" }} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl p-1.5" style={floating}>
        <div className="flex items-center justify-between gap-2 border-b pb-1" style={{ borderColor: "var(--border-soft)" }}>
          <span className="h-1.5 w-12 rounded-full" style={{ background: "var(--accent-dim)" }} />
          <span className="h-2.5 w-10 rounded-md border" style={{ background: "var(--input-bg)", borderColor: "var(--input-border)" }} />
        </div>
        <div
          className="flex items-center gap-1.5 border p-1.5"
          style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", boxShadow: "var(--card-shadow)", borderRadius: "calc(var(--radius-card) * 0.5)" }}
        >
          <span className="h-4 w-4 shrink-0 rounded-md" style={{ background: "var(--accent-dim)" }} />
          <span className="text-[8px] uppercase tracking-wider" style={{ color: "var(--text-3)", fontFamily: "var(--theme-font-mono)" }}>{balanceLabel}</span>
          <span className="ml-auto text-xs font-bold leading-none" style={{ fontFamily: "var(--theme-font-mono)" }}>
            12,480<span className="opacity-50">.00</span>
          </span>
        </div>
        {[0, 1].map((row) => (
          <div
            key={row}
            className="flex items-center gap-1.5 border p-1"
            style={{ background: "var(--card-bg)", borderColor: "var(--card-border)", borderRadius: "calc(var(--radius-card) * 0.4)" }}
          >
            <span className="h-3.5 w-3.5 shrink-0 rounded-md" style={{ background: row ? "var(--violet-dim)" : "var(--accent-dim)" }} />
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="h-1 w-10 rounded-full" style={{ background: "var(--text-3)", opacity: 0.6 }} />
              <span className="h-1 w-6 rounded-full" style={{ background: "var(--bg-3)" }} />
            </span>
            <span className="h-1.5 w-7 rounded-full" style={{ background: "var(--rose-text)", opacity: 0.7 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Mini preview drawn with the theme's own tokens: the wrapper carries the same
 * data attributes as <html>, so the CSS variables resolve for this subtree only.
 */
function ThemePreview({ variant, appearance, balanceLabel }: { variant: WorkspaceThemeVariant; appearance: WorkspaceAppearance; balanceLabel: string }) {
  if (variant === "aurora") return <AuroraPreview appearance={appearance} balanceLabel={balanceLabel} />;
  return (
    <div
      aria-hidden="true"
      data-workspace="preview"
      data-theme={variant}
      data-appearance={appearance}
      className="flex h-32 gap-2 overflow-hidden rounded-xl p-2"
      style={{ background: "var(--bg-0)", color: "var(--text-1)" }}
    >
      <div className="flex w-5 shrink-0 flex-col gap-1.5 rounded-md p-1" style={{ background: "var(--bg-2)" }}>
        <span className="h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
        <span className="h-1.5 rounded-full" style={{ background: "var(--bg-3)" }} />
        <span className="h-1.5 rounded-full" style={{ background: "var(--bg-3)" }} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div
          className="flex flex-col gap-1 border p-2"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--card-border)",
            boxShadow: "var(--card-shadow)",
            borderRadius: "calc(var(--radius-card) * 0.55)",
          }}
        >
          <span className="text-[9px] uppercase tracking-wider" style={{ color: "var(--text-3)" }}>{balanceLabel}</span>
          <span className="text-base font-bold leading-none" style={{ fontFamily: "var(--font-number)" }}>12,480</span>
          <span
            className="mt-0.5 w-fit px-1.5 py-0.5 text-[8px] font-medium"
            style={{ background: "var(--accent-dim)", color: "var(--accent-text)", borderRadius: "var(--radius-chip)" }}
          >
            +4.2%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-4 w-12"
            style={{ background: "var(--button-primary-bg)", boxShadow: "var(--button-primary-shadow)", borderRadius: "calc(var(--radius-button) * 0.5)" }}
          />
          <span
            className="h-4 flex-1 border"
            style={{ background: "var(--input-bg)", borderColor: "var(--input-border)", borderRadius: "calc(var(--radius-control) * 0.5)" }}
          />
        </div>
      </div>
    </div>
  );
}

/** Theme + appearance chooser. Applies instantly and persists through the shared stores. */
export function ThemePicker() {
  const { t } = useLocale();
  const { appearance, setAppearance } = useWorkspaceAppearance();
  const { variant, setVariant } = useWorkspaceThemeVariant();
  const themeKeys = useRadioKeys(WORKSPACE_THEME_VARIANTS, variant, setVariant);
  const appearanceKeys = useRadioKeys(
    APPEARANCES.map((item) => item.value),
    appearance,
    setAppearance,
  );

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="theme-picker-label">
        <h2 id="theme-picker-label" className="mb-3 text-sm font-semibold text-[var(--text-1)]">{t("themePickerLabel")}</h2>
        <div role="radiogroup" aria-labelledby="theme-picker-label" onKeyDown={themeKeys.onKeyDown} className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {WORKSPACE_THEME_VARIANTS.map((option, index) => {
            const selected = option === variant;
            return (
              <button
                key={option}
                ref={(node) => { themeKeys.refs.current[index] = node; }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setVariant(option)}
                className={`flex flex-col gap-3 rounded-[var(--radius-card)] border-2 p-4 text-left transition-colors motion-reduce:transition-none ${FOCUS_RING} ${
                  selected
                    ? "border-[var(--accent)] bg-[var(--bg-1)]"
                    : "border-[var(--border-soft)] bg-[var(--bg-1)] hover:border-[var(--border)]"
                }`}
              >
                <ThemePreview variant={option} appearance={appearance} balanceLabel={t("themePreviewBalance")} />
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[var(--text-1)]">{t(THEME_COPY[option].name)}</span>
                  {selected && (
                    <span className="rounded-full bg-[var(--accent-dim)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent-text)]">{t("themeActive")}</span>
                  )}
                </span>
                <span className="text-xs text-[var(--text-3)]">{t(THEME_COPY[option].description)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="appearance-picker-label">
        <h2 id="appearance-picker-label" className="mb-3 text-sm font-semibold text-[var(--text-1)]">{t("themeAppearanceLabel")}</h2>
        <div
          role="radiogroup"
          aria-labelledby="appearance-picker-label"
          onKeyDown={appearanceKeys.onKeyDown}
          className="inline-flex gap-1 rounded-[var(--radius-control)] border border-[var(--input-border)] bg-[var(--input-bg)] p-1"
        >
          {APPEARANCES.map((option, index) => {
            const selected = option.value === appearance;
            return (
              <button
                key={option.value}
                ref={(node) => { appearanceKeys.refs.current[index] = node; }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setAppearance(option.value)}
                className={`rounded-[var(--radius-control)] px-4 py-1.5 text-sm font-medium transition-colors motion-reduce:transition-none ${FOCUS_RING} ${
                  selected
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "text-[var(--text-2)] hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]"
                }`}
              >
                {t(option.label)}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
