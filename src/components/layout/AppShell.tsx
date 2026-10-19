"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useLocale } from "@/i18n/LocaleProvider";
import { WorkspaceTheme, type Workspace } from "@/components/layout/WorkspaceTheme";

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
  /** Small count shown next to the label (e.g. number of active cards). */
  badge?: number;
  /** Also highlight the item on nested routes (e.g. a detail page under the list). */
  matchNested?: boolean;
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
  workspaceItems,
  user,
  profileHref,
  onSignOut,
  signingOut,
  onNavigate,
  brandSubtitle,
  activeDot,
  collapsed = false,
  onToggleCollapsed,
}: {
  navItems: AppShellNavItem[];
  workspaceItems?: AppShellNavItem[];
  user: AppShellUser;
  profileHref?: string;
  onSignOut?: () => void | Promise<void>;
  signingOut?: boolean;
  onNavigate?: () => void;
  brandSubtitle?: string;
  activeDot?: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const labelVisibility = collapsed ? "opacity-0" : "opacity-100";
  const labelTransition = "transition-opacity duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";
  const itemSpacing = `transition-[padding,gap,background-color,border-color,color] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${collapsed ? "gap-0 px-2.5" : "gap-3 px-2.5"}`;
  const renderItems = (items: AppShellNavItem[]) =>
    items.map((item) => {
        const active = item.href
            ? pathname === item.href || (item.matchNested === true && pathname.startsWith(`${item.href}/`))
            : false;

        const inner = (
          <>
            <span
              className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                active
                  ? "bg-[var(--accent)]/20 text-[var(--accent-text)]"
                  : "bg-[var(--bg-2)] text-[var(--text-3)] group-hover:bg-[var(--bg-3)] group-hover:text-[var(--text-2)]"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                {item.icon}
              </svg>
              {item.badge != null && (
                <span
                  aria-hidden="true"
                  className={`absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold tabular-nums text-[var(--accent-contrast)] ring-2 ring-[var(--bg-2)] ${labelTransition} ${collapsed ? "opacity-100" : "opacity-0"}`}
                >
                  {item.badge}
                </span>
              )}
            </span>
            <span
              className={`min-w-0 flex-1 overflow-hidden whitespace-nowrap text-[13.5px] ${labelTransition} ${labelVisibility} ${
                active ? "font-semibold text-[var(--accent-text)]" : ""
              }`}
            >
              {item.label}
            </span>
            {activeDot && active && (
              <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)] ${labelTransition} ${labelVisibility}`} />
            )}
            {item.badge != null && (
              <span
                className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${labelTransition} ${labelVisibility} ${
                  active
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "bg-[var(--bg-3)] text-[var(--text-2)]"
                }`}
                aria-label={String(item.badge)}
              >
                {item.badge}
              </span>
            )}
            {item.soon && (
              <span className={`shrink-0 whitespace-nowrap rounded-full border border-[var(--border)] px-1.5 py-0.5 text-[9.5px] tracking-[0.04em] text-[var(--text-3)] ${labelTransition} ${labelVisibility}`}>
                {t("soon")}
              </span>
            )}
          </>
        );

        if (!item.href) {
          return (
            <span
              key={item.label}
              className={`group flex shrink-0 items-center overflow-hidden rounded-xl border border-transparent py-2 text-[var(--text-3)] ${itemSpacing}`}
              aria-disabled="true"
              title={collapsed ? `${item.label}${item.soon ? ` — ${t("soon")}` : ""}` : undefined}
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
            aria-current={active ? "page" : undefined}
            title={collapsed ? `${item.label}${item.badge != null ? ` (${item.badge})` : ""}${item.soon ? ` — ${t("soon")}` : ""}` : undefined}
            className={`group flex shrink-0 items-center overflow-hidden rounded-xl border py-2 ${itemSpacing} ${
              active
                ? "border-[var(--accent)]/30 bg-[var(--accent-dim)] text-[var(--text-1)]"
                : "border-transparent text-[var(--text-2)] hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
            }`}
          >
            {inner}
          </Link>
        );
    });

  return (
    <div className={`flex h-full w-full flex-col overflow-x-hidden overflow-y-auto bg-[var(--bg-2)] py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[padding] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${collapsed ? "px-3" : "px-4"}`}>
      <div className="relative mb-4 flex shrink-0 items-center gap-2.5 overflow-hidden border-b border-[var(--border-soft)] px-2.5 pt-2 pb-5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] shadow-[0_2px_8px_rgba(0,0,0,0.25)] ${labelTransition} ${collapsed && onToggleCollapsed ? "opacity-0" : "opacity-100"}`}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-[var(--accent-contrast)]" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 7V5a2 2 0 0 1 2-2h10v4" />
            <rect x="3" y="7" width="18" height="14" rx="3" />
            <path d="M21 11h-5a3 3 0 0 0 0 6h5" />
            <circle cx="16" cy="14" r=".8" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <div className={`flex min-w-0 flex-1 flex-col ${onToggleCollapsed ? "pr-8" : ""} ${labelTransition} ${labelVisibility}`}>
          <span className="whitespace-nowrap text-[14.5px] font-semibold tracking-[0.01em] text-[var(--text-1)]">
            Budget Panel
          </span>
          {brandSubtitle ? (
            <span className="whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--accent-text)]">
              {brandSubtitle}
            </span>
          ) : null}
        </div>
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="desktop-sidebar"
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            title={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            className={`absolute right-0 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[var(--text-2)] transition-[transform,background-color,color] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[var(--bg-3)] hover:text-[var(--text-1)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] motion-reduce:transition-none ${collapsed ? "-translate-x-3" : "translate-x-0"}`}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M9 4v16" />
              <path d={collapsed ? "m13 9 3 3-3 3" : "m16 9-3 3 3 3"} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <p className={`shrink-0 overflow-hidden whitespace-nowrap px-2.5 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-3)] ${labelTransition} ${labelVisibility}`}>
        {t("navigation")}
      </p>

      <nav className="flex shrink-0 flex-col gap-1" aria-label={t("navigation")}>{renderItems(navItems)}</nav>

      {workspaceItems && workspaceItems.length > 0 ? (
        <>
          <p className={`shrink-0 overflow-hidden whitespace-nowrap px-2.5 pt-6 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-3)] ${labelTransition} ${labelVisibility}`}>
            {t("workspaces")}
          </p>
          <nav className="flex shrink-0 flex-col gap-1" aria-label={t("workspaces")}>
            {renderItems(workspaceItems)}
          </nav>
        </>
      ) : null}

      <div className="min-h-4 flex-1" />

      {profileHref ? (
        <Link
          href={profileHref}
          onClick={onNavigate}
          aria-label={user?.name || user?.email || t("userAvatar")}
          title={collapsed ? user?.name || user?.email || t("userAvatar") : undefined}
          className={`flex shrink-0 items-center gap-2.5 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-2)] p-2.5 transition-colors hover:bg-[var(--bg-3)]`}
        >
          <span className="shrink-0"><Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" /></span>
          <div className={`min-w-0 flex-1 ${labelTransition} ${labelVisibility}`}>
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
            aria-hidden="true"
            className={`shrink-0 text-[var(--text-3)] ${labelTransition} ${labelVisibility}`}
          >
            <path d="M7 12h13M7 12l4-4M7 12l4 4" />
            <path d="M3 5v14" />
          </svg>
        </Link>
      ) : (
        <div title={collapsed ? user?.name || user?.email : undefined} className={`relative shrink-0 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-2)] transition-[height] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${collapsed && onSignOut ? "h-[92px]" : "h-[54px]"}`}>
          <span className="absolute top-2.5 left-2.5"><Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" /></span>
          <div className={`absolute top-2.5 right-[50px] left-[52px] min-w-0 ${labelTransition} ${labelVisibility}`}>
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
              style={{ left: collapsed ? "11px" : "calc(100% - 41px)", top: collapsed ? "50px" : "11px" }}
              className="absolute flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--text-2)] transition-[left,top,background-color,border-color,color] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-[var(--rose)]/40 hover:bg-[var(--bg-3)] hover:text-[var(--rose)] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
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
  workspaceItems,
  pageTitles,
  defaultTitle,
  user,
  profileHref,
  onSignOut,
  signingOut,
  headerActions,
  mainClassName = "w-full px-4 py-8 sm:px-6 lg:px-8",
  workspace,
  brandSubtitle,
  activeDot,
  headerLead,
  headerSearch,
  children,
}: {
  navItems: AppShellNavItem[];
  /** Optional links to the other workspaces, listed under their own heading. */
  workspaceItems?: AppShellNavItem[];
  pageTitles?: Record<string, string>;
  defaultTitle?: string;
  user: AppShellUser;
  profileHref?: string;
  onSignOut?: () => void | Promise<void>;
  signingOut?: boolean;
  headerActions?: ReactNode;
  mainClassName?: string;
  /** Accent theme for this shell; omitted keeps the default accent. */
  workspace?: Workspace;
  /** Small mono line under the brand name in the sidebar. */
  brandSubtitle?: string;
  /** Marks the active sidebar item with a trailing dot. */
  activeDot?: boolean;
  /** Replaces the page title on the left of the top bar (e.g. a breadcrumb). */
  headerLead?: ReactNode;
  /** Replaces the search icon button; the page then owns the Cmd+K shortcut. */
  headerSearch?: ReactNode;
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
  const title = pageTitles?.[pathname] || defaultTitle;

  const toggleCollapsed = () => setSidebarCollapsed(!collapsed);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (headerSearch) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [headerSearch]);

  const shell = (
    <HeaderSlotContext.Provider value={{ setHeaderSlot }}>
      <div className="relative grid h-dvh w-full grid-cols-[auto_minmax(0,1fr)] grid-rows-[72px_minmax(0,1fr)] overflow-hidden bg-[var(--shell-header-bg)] px-2 pb-2 font-sans text-[var(--text-2)] sm:px-3 sm:pb-3">
        <aside
          id="desktop-sidebar"
          className={`relative z-40 col-start-1 row-start-2 hidden min-h-0 shrink-0 overflow-hidden rounded-l-[28px] border-r border-[var(--border-soft)] bg-[var(--bg-2)] transition-[width] duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:flex ${
            collapsed ? "md:w-[80px]" : "md:w-[260px]"
          }`}
        >
          <SidebarContent
            navItems={navItems}
            workspaceItems={workspaceItems}
            user={user}
            profileHref={profileHref}
            onSignOut={onSignOut}
            signingOut={signingOut}
            brandSubtitle={brandSubtitle}
            activeDot={activeDot}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
          />
        </aside>

        <div className="contents">
          <header className="relative z-30 col-span-2 row-start-1 flex min-w-0 shrink-0 items-center justify-between gap-2 bg-[var(--shell-header-bg)] px-2 [--bg-1:#27213f] [--bg-2:#27213f] [--bg-3:#342e4c] [--text-1:var(--shell-header-text)] [--text-2:var(--shell-header-muted)] [--text-3:var(--shell-header-muted)] [--border:var(--shell-header-border)] [--border-soft:var(--shell-header-border)] [--accent-dim:#2c2054] [--accent-text:#c4b5fd] sm:gap-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-x-2 sm:gap-x-4">
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="cursor-pointer rounded-lg p-1 text-[var(--text-2)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] md:hidden"
                aria-label={t("openSidebar")}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {headerLead ??
                (title ? (
                <h1 className="truncate font-serif text-lg font-semibold text-[var(--text-1)] sm:text-[22px]">{title}</h1>
              ) : null)}
            </div>

            <div className="flex shrink-0 items-center gap-x-1.5 sm:gap-x-3.5">
              {headerSearch ?? (
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
              )}
              {workspace ? <ThemeSwitcher /> : null}
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

          <main className="relative z-10 col-start-2 row-start-2 min-h-0 min-w-0 overflow-y-auto rounded-[28px] bg-[var(--bg-0)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:rounded-l-none">
            <div className={`min-h-full w-full ${mainClassName}`}>{children}</div>
          </main>
        </div>

        <div
          aria-hidden={!mobileSidebarOpen}
          inert={!mobileSidebarOpen}
          className={`workspace-mobile-sidebar fixed inset-0 z-50 md:hidden ${mobileSidebarOpen ? "visible opacity-100" : "invisible pointer-events-none opacity-0"}`}
        >
            <button
              aria-label={t("closeSidebarBackdrop")}
              className="absolute inset-0 cursor-pointer bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <aside className={`relative my-3 ml-3 flex h-[calc(100%-1.5rem)] w-80 max-w-[88vw] flex-col overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-1)] p-4 shadow-2xl transition-transform duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"}`}>
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
                workspaceItems={workspaceItems}
                user={user}
                profileHref={profileHref}
                onSignOut={onSignOut}
                signingOut={signingOut}
                onNavigate={() => setMobileSidebarOpen(false)}
                brandSubtitle={brandSubtitle}
                activeDot={activeDot}
              />
            </aside>
        </div>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      </div>
    </HeaderSlotContext.Provider>
  );

  return workspace ? <WorkspaceTheme workspace={workspace}>{shell}</WorkspaceTheme> : shell;
}
