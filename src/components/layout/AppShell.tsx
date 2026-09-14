"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useLocale } from "@/i18n/LocaleProvider";

const SIDEBAR_COLLAPSED_KEY = "sidebar-collapsed";

// Sidebar-collapsed is a per-viewer preference backed by localStorage, which
// doesn't exist during SSR. useSyncExternalStore is the React-provided way to
// read a value like this without a hydration mismatch: the server (and the
// client's very first paint) always get `getServerSnapshot`'s value, then
// React reconciles with the real client value right after — no effect, no
// setState-in-effect, no manual hydration warning suppression needed.
const sidebarCollapsedListeners = new Set<() => void>();

function subscribeSidebarCollapsed(onChange: () => void) {
  sidebarCollapsedListeners.add(onChange);
  return () => sidebarCollapsedListeners.delete(onChange);
}

function getSidebarCollapsedSnapshot(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) !== "false";
  } catch {
    return true;
  }
}

function getSidebarCollapsedServerSnapshot(): boolean {
  return true;
}

function setSidebarCollapsed(next: boolean) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  } catch {
    // non-critical per-viewer preference — ignore write failures.
  }
  sidebarCollapsedListeners.forEach((onChange) => onChange());
}

type HeaderSlotContextValue = {
  setHeaderSlot: (node: ReactNode | null) => void;
};

const HeaderSlotContext = createContext<HeaderSlotContextValue | null>(null);

export function useHeaderSlot() {
  const ctx = useContext(HeaderSlotContext);
  if (!ctx) {
    throw new Error("useHeaderSlot must be used within AppShell");
  }
  return ctx.setHeaderSlot;
}

export type AppShellNavItem = {
  label: string;
  href: string | null;
  soon?: boolean;
  icon: ReactNode;
};

export type AppShellUser = {
  name?: string;
  email?: string;
  role?: string;
  avatarUrl?: string | null;
};

function SidebarContent({
  navItems,
  user,
  profileHref,
  onSignOut,
  signingOut,
  onNavigate,
}: {
  navItems: AppShellNavItem[];
  user: AppShellUser;
  profileHref?: string;
  onSignOut?: () => void | Promise<void>;
  signingOut?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useLocale();

  return (
    <div className="flex h-full w-[260px] flex-col overflow-y-auto bg-[var(--bg-1)] px-4 py-6">
      <div className="mb-4 flex items-center gap-2.5 border-b border-[var(--border-soft)] px-2 pt-2 pb-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--emerald)] shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
          <span className="font-serif text-[17px] leading-none text-[var(--bg-0)]">B</span>
        </div>
        <span className="whitespace-nowrap text-[14.5px] font-semibold tracking-[0.01em] text-[var(--text-1)]">
          Budget Panel
        </span>
      </div>

      <p className="px-2.5 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-3)]">
        {t("navigation")}
      </p>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = item.href ? pathname === item.href : false;

          const inner = (
            <>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  active
                    ? "bg-[var(--emerald)]/20 text-[var(--emerald-text)]"
                    : "bg-[var(--bg-2)] text-[var(--text-3)] group-hover:bg-[var(--bg-3)] group-hover:text-[var(--text-2)]"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  {item.icon}
                </svg>
              </span>
              <span
                className={`flex-1 whitespace-nowrap text-[13.5px] ${
                  active ? "font-semibold text-[var(--emerald-text)]" : ""
                }`}
              >
                {item.label}
              </span>
              {item.soon && (
                <span className="whitespace-nowrap rounded-full border border-[var(--border)] px-1.5 py-0.5 text-[9.5px] tracking-[0.04em] text-[var(--text-3)]">
                  {t("soon")}
                </span>
              )}
            </>
          );

          if (!item.href) {
            return (
              <span
                key={item.label}
                className="group flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2 text-[var(--text-3)]"
                aria-disabled="true"
              >
                {inner}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-xl border px-2.5 py-2 transition-colors ${
                active
                  ? "border-[var(--emerald)]/30 bg-[var(--emerald-dim)] text-[var(--text-1)]"
                  : "border-transparent text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
              }`}
            >
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      {profileHref ? (
        <Link
          href={profileHref}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-2)] p-2.5 transition-colors hover:bg-[var(--bg-3)]"
        >
          <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium text-[var(--text-1)]">
              {user?.name || user?.email}
            </div>
            <div className="truncate text-[11px] text-[var(--text-3)]">{user?.role || ""}</div>
          </div>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            className="shrink-0 text-[var(--text-3)]"
          >
            <path d="M7 12h13M7 12l4-4M7 12l4 4" />
            <path d="M3 5v14" />
          </svg>
        </Link>
      ) : (
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-2)] p-2.5">
          <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium text-[var(--text-1)]">
              {user?.name || user?.email}
            </div>
            <div className="truncate text-[11px] text-[var(--text-3)]">{user?.email || ""}</div>
          </div>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              disabled={signingOut}
              aria-label={t("signOut")}
              title={t("signOut")}
              className="flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--text-2)] transition-colors hover:border-[var(--rose)]/40 hover:bg-[var(--bg-3)] hover:text-[var(--rose)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {signingOut ? (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 17l5-5-5-5" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12H9" />
                </svg>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AppShell({
  navItems,
  pageTitles,
  defaultTitle,
  user,
  profileHref,
  onSignOut,
  signingOut,
  headerActions,
  mainClassName = "mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8",
  children,
}: {
  navItems: AppShellNavItem[];
  pageTitles: Record<string, string>;
  defaultTitle: string;
  user: AppShellUser;
  profileHref?: string;
  onSignOut?: () => void | Promise<void>;
  signingOut?: boolean;
  headerActions?: ReactNode;
  mainClassName?: string;
  children: ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [headerSlot, setHeaderSlot] = useState<ReactNode | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { t } = useLocale();
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    getSidebarCollapsedSnapshot,
    getSidebarCollapsedServerSnapshot,
  );
  const pathname = usePathname();
  const title = pageTitles[pathname] || defaultTitle;

  const toggleCollapsed = () => setSidebarCollapsed(!collapsed);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <HeaderSlotContext.Provider value={{ setHeaderSlot }}>
      <div className="relative flex h-screen w-full overflow-hidden bg-[var(--bg-0)] font-sans text-[var(--text-2)]">
        <AmbientBackground />
        <aside
          className={`relative z-40 hidden shrink-0 overflow-hidden border-r border-[var(--border-soft)] bg-[var(--bg-1)] transition-[margin-left] duration-300 ease-in-out will-change-[margin-left] motion-reduce:transition-none md:flex md:w-[260px] ${
            collapsed ? "md:ml-[-260px]" : "md:ml-0"
          }`}
        >
          <SidebarContent
            navItems={navItems}
            user={user}
            profileHref={profileHref}
            onSignOut={onSignOut}
            signingOut={signingOut}
          />
        </aside>

        <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-y-auto">
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-0)]/85 backdrop-blur-md px-4 sm:px-8">
            <div className="flex items-center gap-x-4">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="cursor-pointer rounded-lg p-1 text-[var(--text-2)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] md:hidden"
                aria-label={t("openSidebar")}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={toggleCollapsed}
                aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
                title={collapsed ? t("expandSidebar") : t("collapseSidebar")}
                className="hidden cursor-pointer rounded-lg p-1 text-[var(--text-2)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] md:block"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="font-serif text-xl font-semibold text-[var(--text-1)] sm:text-[22px]">{title}</h1>
            </div>

            <div className="flex items-center gap-x-3.5">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label={t("searchShortcut")}
                title={t("searchShortcut")}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--text-2)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <circle cx="11" cy="11" r="7" />
                  <path strokeLinecap="round" d="m21 21-4.3-4.3" />
                </svg>
              </button>
              <LanguageSwitcher />
              {headerSlot ? (
                <>
                  {headerSlot}
                  <div className="hidden h-[22px] w-px bg-[var(--border)] sm:block" aria-hidden="true" />
                </>
              ) : null}
              {headerActions}
            </div>
          </header>

          <main className="flex-1">
            <div className={mainClassName}>{children}</div>
          </main>
        </div>

        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              aria-label={t("closeSidebarBackdrop")}
              className="absolute inset-0 cursor-pointer bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className="relative my-3 ml-3 flex h-[calc(100%-1.5rem)] w-80 max-w-[88vw] flex-col overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-1)] p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--text-2)]">{t("navigation")}</p>
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="cursor-pointer rounded-lg border border-[var(--border-soft)] px-2.5 py-1 text-sm text-[var(--text-2)] transition-colors hover:bg-[var(--bg-3)]"
                  aria-label={t("closeSidebar")}
                >
                  ✕
                </button>
              </div>
              <SidebarContent
                navItems={navItems}
                user={user}
                profileHref={profileHref}
                onSignOut={onSignOut}
                signingOut={signingOut}
                onNavigate={() => setMobileSidebarOpen(false)}
              />
            </aside>
          </div>
        )}

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </HeaderSlotContext.Provider>
  );
}
