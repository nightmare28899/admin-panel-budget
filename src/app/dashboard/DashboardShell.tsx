"use client";

import Link from "next/link";
import { AppShell, useHeaderSlot, type AppShellNavItem } from "@/components/layout/AppShell";
import { LogoutButton } from "./LogoutButton";
import { useLocale } from "@/i18n/LocaleProvider";

export { useHeaderSlot };

type SessionUser = {
  name?: string;
  email?: string;
  role?: string;
  avatarUrl?: string | null;
  isPremium?: boolean;
};

function createNavItems(t: ReturnType<typeof useLocale>["t"]): AppShellNavItem[] {
  return [
  {
    label: t("overview"),
    href: null,
    soon: true,
    icon: (
      <>
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
      </>
    ),
  },
  {
    label: t("users"),
    href: "/dashboard/users",
    icon: (
      <>
        <path d="M17 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 5 18.5V20" />
        <circle cx="9.5" cy="8.5" r="3.5" />
        <path d="M19 20v-1.5a3.5 3.5 0 0 0-2.5-3.36" />
        <path d="M15 5.13a3.5 3.5 0 0 1 0 6.74" />
      </>
    ),
  },
  {
    label: t("notifications"),
    href: "/dashboard/notifications",
    icon: (
      <>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </>
    ),
  },
  {
    label: t("settings"),
    href: null,
    soon: true,
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.37a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.63 15a1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.63 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.63a1.7 1.7 0 0 0 1.04-1.56V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.63a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.37 9a1.7 1.7 0 0 0 1.56 1.04H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
      </>
    ),
  },
  {
    label: t("myProfile"),
    href: "/dashboard/profile",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
      </>
    ),
  },
  ];
}

function HeaderActions() {
  const { t } = useLocale();
  return (
    <>
      <Link
        href="/dashboard/notifications"
        aria-label={t("notifications")}
        title={t("notifications")}
        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--text-2)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </Link>
      <LogoutButton />
    </>
  );
}

export function DashboardShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const { t } = useLocale();
  const pageTitles: Record<string, string> = {
    "/dashboard/users": t("users"),
    "/dashboard/profile": t("myProfile"),
    "/dashboard/notifications": t("notifications"),
  };
  return (
    <AppShell
      navItems={createNavItems(t)}
      pageTitles={pageTitles}
      defaultTitle={t("dashboard")}
      user={user}
      profileHref="/dashboard/profile"
      headerActions={<HeaderActions />}
    >
      {children}
    </AppShell>
  );
}
