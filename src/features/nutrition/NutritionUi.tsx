"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import type { MealType } from "./nutrition.types";
import type { MessageKey } from "@/i18n/messages";

const MEAL_LABEL_KEYS: Record<MealType, MessageKey> = {
  breakfast: "nutMealBreakfast",
  morning_snack: "nutMealMorningSnack",
  lunch: "nutMealLunch",
  afternoon_snack: "nutMealAfternoonSnack",
  dinner: "nutMealDinner",
};

/** Localized meal-type label. */
export function useMealLabel() {
  const { t } = useLocale();
  return useCallback((type: MealType) => t(MEAL_LABEL_KEYS[type]), [t]);
}

/** Same page frame finance views use. */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</div>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-[var(--text-3)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export type BannerTone = "success" | "error" | "info" | "warning";

const BANNER_TONES: Record<BannerTone, string> = {
  success: "border-[var(--emerald)]/40 bg-[var(--emerald-dim)] text-[var(--emerald-text)]",
  error: "border-[var(--rose)]/40 bg-[var(--rose)]/10 text-[var(--rose)]",
  info: "border-[var(--info)]/40 bg-[var(--info-dim)] text-[var(--info-text)]",
  warning: "border-[var(--gold)]/40 bg-[var(--gold-dim)] text-[var(--gold-text)]",
};

/** Inline notice/error banner, same look as finance feedback banners. */
export function Banner({
  tone,
  children,
  onDismiss,
  className = "mb-4",
}: {
  tone: BannerTone;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const { t } = useLocale();
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${BANNER_TONES[tone]} ${className}`}
    >
      <span className="min-w-0">{children}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={tone === "error" ? t("dismissError") : t("dismissNotification")}
          className="shrink-0 cursor-pointer opacity-70 transition-opacity hover:opacity-100"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}

export type Feedback = { tone: "success" | "error"; text: string };

/** Transient result message shown after an action. */
export function useFeedback() {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const clear = useCallback(() => setFeedback(null), []);
  const success = useCallback((text: string) => setFeedback({ tone: "success", text }), []);
  const fail = useCallback((text: string) => setFeedback({ tone: "error", text }), []);
  return { feedback, clear, success, fail };
}

export function FeedbackBanner({
  feedback,
  onDismiss,
}: {
  feedback: Feedback | null;
  onDismiss: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Actions are often far below this banner; bring the result into view.
  useEffect(() => {
    if (feedback) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [feedback]);
  if (!feedback) return null;
  return (
    <div ref={ref} className="scroll-mt-20">
      <Banner tone={feedback.tone} onDismiss={onDismiss}>
        {feedback.text}
      </Banner>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-xl text-[var(--accent-text)]">
        {icon}
      </span>
      <h2 className="font-serif text-lg font-semibold text-[var(--text-1)]">{title}</h2>
      {description ? <p className="max-w-md text-sm text-[var(--text-3)]">{description}</p> : null}
      {action}
    </div>
  );
}

/** Inset panel used for repeated sub-items inside a card (portions, options). */
export function InsetPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--border-soft)] bg-[var(--bg-1)]/60 p-4 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="font-serif text-lg font-semibold text-[var(--text-1)]">{children}</h2>;
}

/** Inline stroke icon, same style the finance navigation uses. */
export function Icon({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

export const icons = {
  check: <path d="m5 12 5 5 9-10" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  leaf: (
    <>
      <path d="M20 3C10 2 3 7 4 14c1 8 14 8 16-11Z" />
      <path d="M4 20 16 8" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-9-9.2C1.7 7.5 3.8 4 7.200 4c2 0 3.7 1.1 4.8 2.800C13.1 5.1 14.8 4 16.8 4 20.2 4 22.3 7.5 21 10.8 19 15.6 12 20 12 20Z" />,
  upload: <path d="M12 16V4m0 0L7 9m5-5 5 5M4 20h16" />,
  utensils: <path d="M6 3v8a2 2 0 0 0 2 2v8M10 3v8M6 7h4M17 3c-2 2-3 5-3 8h3v10" />,
  pie: (
    <>
      <path d="M12 3v9h9" />
      <path d="M20.5 15A9 9 0 1 1 9 3.5" />
    </>
  ),
  skip: <path d="m5 5 9 7-9 7ZM18 5v14" />,
  file: (
    <>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M15 3v3h3" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
      <path d="M19 17v4M17 19h4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.500-1 8-4 8-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  download: <path d="M12 4v12m0 0-5-5m5 5 5-5M4 20h16" />,
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16Z" />
      <path d="m13 7 4 4" />
    </>
  ),
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />,
  warning: (
    <>
      <path d="M12 3 2 20h20Z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  circleCheck: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.500 12 2.500 2.500 4.500-5" />
    </>
  ),
  food: (
    <>
      <path d="M12 8c0-3 2-5 5-5 0 3-2 5-5 5Z" />
      <path d="M12 8c-4-2-8 1-7 6 1 4 4 7 7 7s6-3 7-7c1-5-3-8-7-6Z" />
    </>
  ),
};

/** Maps a meal or diet status to its translated label and badge tone. */
export function useStatusLabel() {
  const { t } = useLocale();
  return useCallback(
    (status: string) => {
      const map: Record<string, MessageKey> = {
        pending: "nutStatusPending",
        completed: "nutStatusCompleted",
        skipped: "nutStatusSkipped",
        draft: "nutStatusDraft",
        pending_verification: "nutStatusPendingVerification",
        verified: "nutStatusVerified",
      };
      const key = map[status];
      return key ? t(key) : status;
    },
    [t],
  );
}
