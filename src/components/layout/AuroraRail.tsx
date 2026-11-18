"use client";

import Link from "next/link";
import { useState, type FocusEvent, type MouseEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { useLocale } from "@/i18n/LocaleProvider";
import { toRailItems, type RailNavInput } from "./railNav";

export type AuroraRailItem = RailNavInput & { icon: ReactNode };

type AuroraRailUser = { name?: string; email?: string; avatarUrl?: string | null };

type Tooltip = { text: string; top: number; left: number };

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";
const TILE = "relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors motion-reduce:transition-none";

/**
 * Icon-only navigation rail for the aurora theme. Labels live in the tooltip
 * and aria-label; one fixed-position tooltip is shared so the scrollable item
 * list never clips it.
 */
export function AuroraRail({
  navItems,
  workspaceItems,
  user,
  profileHref,
  onSignOut,
  signingOut,
}: {
  navItems: AuroraRailItem[];
  workspaceItems?: AuroraRailItem[];
  user: AuroraRailUser;
  profileHref?: string;
  onSignOut?: () => void | Promise<void>;
  signingOut?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useLocale();
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  const showTooltip = (text: string) => (event: MouseEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
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
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            {item.icon}
          </svg>
          {badge && (
            <span
              aria-hidden="true"
              className={`absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold tabular-nums ring-2 ring-[var(--rail-bg)] ${
                badge.tone === "pending" ? "bg-[var(--violet)] text-white" : "bg-[var(--bg-3)] text-[var(--text-3)]"
              }`}
            >
              {badge.text}
            </span>
          )}
        </>
      );
      return (
        <li key={item.label} className="relative flex w-full justify-center">
          {active && <span aria-hidden="true" className="absolute top-3 bottom-3 left-0 w-1 rounded-r-full bg-[var(--accent)]" />}
          {disabled || !item.href ? (
            <span aria-disabled="true" aria-label={text} className={`${TILE} text-[var(--text-3)] opacity-60`} {...tooltipHandlers(text)}>
              {inner}
            </span>
          ) : (
            <Link
              href={item.href}
              aria-label={text}
              aria-current={active ? "page" : undefined}
              className={`${TILE} ${FOCUS_RING} ${
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

  return (
    <div className="flex h-full w-full flex-col items-center gap-3 py-5">
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

      <div aria-hidden="true" className="h-px w-8 shrink-0 bg-[var(--border-soft)]" />

      <nav aria-label={t("navigation")} className="flex min-h-0 w-full flex-1 flex-col items-center gap-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-full flex-col items-center gap-2 py-1">{renderItems(navItems)}</ul>
        {workspaceItems && workspaceItems.length > 0 && (
          <>
            <div aria-hidden="true" className="h-px w-8 shrink-0 bg-[var(--border-soft)]" />
            <ul aria-label={t("workspaces")} className="flex w-full flex-col items-center gap-2 py-1">{renderItems(workspaceItems)}</ul>
          </>
        )}
      </nav>

      <div className="flex shrink-0 flex-col items-center gap-2">
        {profileHref ? (
          <Link href={profileHref} aria-label={userLabel} className={`rounded-2xl p-1 ${FOCUS_RING}`} {...tooltipHandlers(userLabel)}>
            {avatar}
          </Link>
        ) : (
          <span role="img" aria-label={userLabel} className="rounded-2xl p-1" {...tooltipHandlers(userLabel)}>{avatar}</span>
        )}
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
            aria-label={t("signOut")}
            className={`${TILE} cursor-pointer text-[var(--text-3)] hover:bg-[var(--rose-dim)] hover:text-[var(--rose)] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
            {...tooltipHandlers(t("signOut"))}
          >
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        )}
      </div>

      {tooltip && (
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
