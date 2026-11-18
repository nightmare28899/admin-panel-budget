"use client";

import Link from "next/link";
import { useState, type FocusEvent, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { useLocale } from "@/i18n/LocaleProvider";
import { railToggleLabelKey, toRailItems, type RailNavInput } from "./railNav";

export type AuroraRailItem = RailNavInput & { icon: ReactNode };

type AuroraRailUser = { name?: string; email?: string; avatarUrl?: string | null };

type Tooltip = { text: string; top: number; left: number };

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
// Row is always as wide as its container; the icon keeps the same x position in
// both states so expanding only reveals the label next to it.
const ROW = "relative flex h-12 w-full items-center gap-3 overflow-hidden rounded-2xl px-[14px] transition-colors motion-reduce:transition-none";
const LABEL = "min-w-0 flex-1 truncate text-left text-[13.5px]";

/**
 * Navigation rail for the aurora theme. Collapsed it is icon-only (labels live
 * in a tooltip and aria-label; one fixed-position tooltip is shared so the
 * scrollable item list never clips it). Expanded it shows labels next to icons.
 */
export function AuroraRail({
  navItems,
  workspaceItems,
  user,
  profileHref,
  onSignOut,
  signingOut,
  collapsed,
  onToggleCollapsed,
}: {
  navItems: AuroraRailItem[];
  workspaceItems?: AuroraRailItem[];
  user: AuroraRailUser;
  profileHref?: string;
  onSignOut?: () => void | Promise<void>;
  signingOut?: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const showTooltip = (text: string) => (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
    if (!collapsed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ text, top: rect.top + rect.height / 2, left: rect.right + 12 });
  };
  const hideTooltip = () => setTooltip(null);
  const tooltipHandlers = (text: string) => ({
    onMouseEnter: showTooltip(text),
    onMouseLeave: hideTooltip,
    onFocus: showTooltip(text),
    onBlur: hideTooltip,
  });

  const renderItems = (items: AuroraRailItem[]) =>
    toRailItems(items, pathname, t("soon")).map(({ item, active, disabled, badge, tooltip: text }) => {
      const inner = (
        <>
          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
              {item.icon}
            </svg>
            {badge && (
              <span
                aria-hidden="true"
                className={`absolute -top-2 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold tabular-nums ring-2 ring-[var(--rail-bg)] ${
                  badge.tone === "pending" ? "bg-[var(--violet)] text-white" : "bg-[var(--bg-3)] text-[var(--text-3)]"
                }`}
              >
                {badge.text}
              </span>
            )}
          </span>
          {!collapsed && (
            <span className={`${LABEL} ${active ? "font-semibold" : ""}`}>
              {item.label}
              {item.soon && <span className="ml-2 text-[10px] text-[var(--text-3)]">{t("soon")}</span>}
            </span>
          )}
        </>
      );
      return (
        <li key={item.label} className="relative flex w-full">
          {active && <span aria-hidden="true" className="absolute top-3 bottom-3 -left-5 w-1 rounded-r-full bg-[var(--accent)]" />}
          {disabled || !item.href ? (
            <span aria-disabled="true" aria-label={text} className={`${ROW} text-[var(--text-3)] opacity-60`} {...tooltipHandlers(text)}>
              {inner}
            </span>
          ) : (
            <Link
              href={item.href}
              aria-label={text}
              aria-current={active ? "page" : undefined}
              className={`${ROW} ${FOCUS_RING} ${
                active
                  ? "bg-[var(--accent-dim)] text-[var(--accent-text)]"
                  : "text-[var(--text-3)] hover:bg-[var(--bg-3)] hover:text-[var(--text-1)]"
              }`}
              {...tooltipHandlers(text)}
            >
              {inner}
            </Link>
          )}
        </li>
      );
    });

  const userLabel = user?.name || user?.email || t("userAvatar");
  const avatar = <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />;
  const userText = !collapsed && (
    <span className="min-w-0 flex-1 text-left">
      <span className="block truncate text-[12.5px] font-medium text-[var(--text-1)]">{user?.name || user?.email}</span>
      {user?.name && user?.email && <span className="block truncate text-[11px] text-[var(--text-3)]">{user.email}</span>}
    </span>
  );
  const toggleLabel = t(railToggleLabelKey(collapsed));

  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden py-5">
      <div className="flex shrink-0 items-center gap-3 px-5">
        <div
          role="img"
          aria-label="Budget Panel"
          className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--accent)] text-[var(--accent-text)] [box-shadow:var(--tile-shadow)]"
        >
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 7V5a2 2 0 0 1 2-2h10v4" />
            <rect x="3" y="7" width="18" height="14" rx="3" />
            <path d="M21 11h-5a3 3 0 0 0 0 6h5" />
          </svg>
          <span aria-hidden="true" className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)] ring-2 ring-[var(--rail-bg)]" />
        </div>
        {!collapsed && <span className="min-w-0 truncate text-[14.5px] font-semibold text-[var(--text-1)]">Budget Panel</span>}
      </div>

      <div className="shrink-0 px-5">
        <button
          type="button"
          onClick={() => {
            hideTooltip();
            onToggleCollapsed();
          }}
          aria-expanded={!collapsed}
          aria-controls="desktop-sidebar"
          aria-label={toggleLabel}
          className={`${ROW} cursor-pointer text-[var(--text-3)] hover:bg-[var(--bg-3)] hover:text-[var(--text-1)] ${FOCUS_RING}`}
          {...tooltipHandlers(toggleLabel)}
        >
          <svg aria-hidden="true" className="shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
            <path d={collapsed ? "m13 9 3 3-3 3" : "m16 9-3 3 3 3"} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {!collapsed && <span className={LABEL}>{toggleLabel}</span>}
        </button>
      </div>

      <div aria-hidden="true" className="mx-5 h-px shrink-0 bg-[var(--border-soft)]" />

      <nav aria-label={t("navigation")} className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-full flex-col gap-2 px-5 py-1">{renderItems(navItems)}</ul>
        {workspaceItems && workspaceItems.length > 0 && (
          <>
            <div aria-hidden="true" className="mx-5 h-px shrink-0 bg-[var(--border-soft)]" />
            <ul aria-label={t("workspaces")} className="flex w-full flex-col gap-2 px-5 py-1">{renderItems(workspaceItems)}</ul>
          </>
        )}
      </nav>

      <div className="flex shrink-0 flex-col gap-2 px-5">
        {profileHref ? (
          <Link href={profileHref} aria-label={userLabel} className={`${ROW} !px-2 ${FOCUS_RING} hover:bg-[var(--bg-3)]`} {...tooltipHandlers(userLabel)}>
            {avatar}
            {userText}
          </Link>
        ) : (
          <span role="img" aria-label={userLabel} className={`${ROW} !px-2`} {...tooltipHandlers(userLabel)}>
            {avatar}
            {userText}
          </span>
        )}
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            aria-label={t("signOut")}
            className={`${ROW} cursor-pointer text-[var(--text-3)] hover:bg-[var(--rose-dim)] hover:text-[var(--rose)] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            {...tooltipHandlers(t("signOut"))}
          >
            <svg aria-hidden="true" className="shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            {!collapsed && <span className={LABEL}>{t("signOut")}</span>}
          </button>
        )}
      </div>

      {tooltip && collapsed && (
        <div
          role="tooltip"
          style={{ top: tooltip.top, left: tooltip.left }}
          className="pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--bg-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-1)] shadow-lg"
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
