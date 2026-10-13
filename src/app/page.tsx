"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useLocale } from "@/i18n/LocaleProvider";
import type { MessageKey } from "@/i18n/messages";

type WorkspaceAccent = "gold" | "info" | "emerald";

type Workspace = {
  href: string;
  accent: WorkspaceAccent;
  titleKey: MessageKey;
  descriptionKey: MessageKey;
  ctaKey: MessageKey;
  badgeKey?: MessageKey;
  featureKeys: MessageKey[];
  icon: ReactNode;
};

// Static class names per accent so Tailwind can detect them at build time.
const ACCENT_STYLES: Record<
  WorkspaceAccent,
  { hoverBorder: string; ring: string; icon: string; text: string; glow: string; badge: string }
> = {
  gold: {
    hoverBorder: "hover:border-[var(--gold)]/50",
    ring: "focus-visible:ring-[var(--gold)]",
    icon: "border-[var(--gold)]/25 bg-[var(--gold-dim)] text-[var(--gold-text)]",
    text: "text-[var(--gold-text)]",
    glow: "bg-[var(--gold)]",
    badge: "border-[var(--gold)]/30 bg-[var(--gold-dim)] text-[var(--gold-text)]",
  },
  info: {
    hoverBorder: "hover:border-[var(--info)]/50",
    ring: "focus-visible:ring-[var(--info)]",
    icon: "border-[var(--info)]/25 bg-[var(--info-dim)] text-[var(--info-text)]",
    text: "text-[var(--info-text)]",
    glow: "bg-[var(--info)]",
    badge: "border-[var(--info)]/30 bg-[var(--info-dim)] text-[var(--info-text)]",
  },
  emerald: {
    hoverBorder: "hover:border-[var(--emerald)]/50",
    ring: "focus-visible:ring-[var(--emerald)]",
    icon: "border-[var(--emerald)]/25 bg-[var(--emerald-dim)] text-[var(--emerald-text)]",
    text: "text-[var(--emerald-text)]",
    glow: "bg-[var(--emerald)]",
    badge: "border-[var(--emerald)]/30 bg-[var(--emerald-dim)] text-[var(--emerald-text)]",
  },
};

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-6 w-6",
  "aria-hidden": true,
};

const WORKSPACES: Workspace[] = [
  {
    href: "/user-login",
    accent: "info",
    titleKey: "personalFinance",
    descriptionKey: "personalFinanceDescription",
    ctaKey: "continueToFinances",
    badgeKey: "workspaceMostUsed",
    featureKeys: ["workspaceFeatureExpenses", "workspaceFeatureCards", "workspaceFeatureStatements", "workspaceFeatureReports"],
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 6h18v12H3zM3 10h18M7 15h3" />
      </svg>
    ),
  },
  {
    href: "/nutrition/login",
    accent: "emerald",
    titleKey: "nutritionWorkspace",
    descriptionKey: "nutritionWorkspaceDescription",
    ctaKey: "continueToNutrition",
    featureKeys: ["workspaceFeatureMeals", "workspaceFeatureRecipes", "workspaceFeatureDiet"],
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M20 3C10 2 3 7 4 14c1 8 14 8 16-11ZM4 20 16 8" />
      </svg>
    ),
  },
  {
    href: "/login",
    accent: "gold",
    titleKey: "adminPlatform",
    descriptionKey: "adminPlatformDescription",
    ctaKey: "continueAsAdminShort",
    badgeKey: "workspaceAdminsOnly",
    featureKeys: ["workspaceFeatureUsers", "workspaceFeatureNotifications", "workspaceFeaturePermissions"],
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 21h18M5 21V8l7-4 7 4v13M9 12h.01M9 16h.01M15 12h.01M15 16h.01" />
      </svg>
    ),
  },
];

const TRUST_ITEMS: { key: MessageKey; icon: ReactNode }[] = [
  {
    key: "trustEncrypted",
    icon: (
      <svg {...ICON_PROPS} className="h-4 w-4">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    ),
  },
  {
    key: "trustPrivate",
    icon: (
      <svg {...ICON_PROPS} className="h-4 w-4">
        <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    key: "trustSync",
    icon: (
      <svg {...ICON_PROPS} className="h-4 w-4">
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </svg>
    ),
  },
];

function WorkspaceCard({ workspace, index }: { workspace: Workspace; index: number }) {
  const { t } = useLocale();
  const accent = ACCENT_STYLES[workspace.accent];

  return (
    <Link
      href={workspace.href}
      style={{ animationDelay: `${120 + index * 80}ms` }}
      className={`group relative flex min-h-80 flex-col overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-2)]/80 p-6 shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(0,0,0,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--bg-0)] motion-safe:animate-[workspace-in_420ms_ease-out_both] motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-7 ${accent.hoverBorder} ${accent.ring}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-20 ${accent.glow}`}
      />

      <div className="mb-6 flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${accent.icon}`}>
          {workspace.icon}
        </div>
        {workspace.badgeKey && (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${accent.badge}`}>
            {t(workspace.badgeKey)}
          </span>
        )}
      </div>

      <h2 className="text-xl font-semibold text-[var(--text-1)]">{t(workspace.titleKey)}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-3)]">{t(workspace.descriptionKey)}</p>

      <ul className="mt-5 flex flex-1 flex-wrap content-start gap-2" aria-label={t("workspaceIncludes")}>
        {workspace.featureKeys.map((featureKey) => (
          <li
            key={featureKey}
            className="rounded-md border border-[var(--border-soft)] bg-[var(--bg-3)]/60 px-2 py-1 text-xs text-[var(--text-2)]"
          >
            {t(featureKey)}
          </li>
        ))}
      </ul>

      <span className={`mt-8 inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold ${accent.text}`}>
        {t(workspace.ctaKey)}
        <span className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true">
          →
        </span>
      </span>
    </Link>
  );
}

export default function Home() {
  const { t } = useLocale();

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--bg-0)]">
      <AmbientBackground variant="auth" />

      <header className="relative z-20 flex items-center justify-between px-4 pt-6 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--emerald)]">
            <span className="font-serif text-lg leading-none text-[var(--bg-0)]" aria-hidden="true">
              B
            </span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--text-1)]">Budget Panel</span>
        </div>
        <LanguageSwitcher />
      </header>

      <section
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-12 sm:px-6"
        aria-labelledby="platform-heading"
      >
        <div className="mx-auto mb-10 max-w-2xl text-center motion-safe:animate-[workspace-in_420ms_ease-out_both]">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--emerald)]/30 bg-[var(--emerald-dim)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--emerald-text)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--emerald)]" aria-hidden="true" />
            {t("workspaceEyebrow")}
          </p>
          <h1 id="platform-heading" className="font-serif text-4xl font-semibold text-[var(--text-1)] sm:text-5xl">
            {t("chooseWorkspace")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--text-3)] sm:text-base">
            {t("chooseWorkspaceDescription")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {WORKSPACES.map((workspace, index) => (
            <WorkspaceCard key={workspace.href} workspace={workspace} index={index} />
          ))}
        </div>

        <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-[var(--text-3)]">
          {TRUST_ITEMS.map((item) => (
            <li key={item.key} className="inline-flex items-center gap-2">
              <span className="text-[var(--emerald-text)]">{item.icon}</span>
              {t(item.key)}
            </li>
          ))}
        </ul>
      </section>

      <footer className="relative z-10 px-4 pb-6 text-center text-xs text-[var(--text-3)] sm:px-6">
        © {new Date().getFullYear()} Budget Panel
      </footer>
    </main>
  );
}
