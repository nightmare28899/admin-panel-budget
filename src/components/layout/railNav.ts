export type RailNavInput = {
  label: string;
  href: string | null;
  soon?: boolean;
  badge?: number;
  matchNested?: boolean;
};

export type RailBadge = { text: string; tone: "pending" | "zero" };

export type RailItem<T extends RailNavInput> = {
  item: T;
  active: boolean;
  disabled: boolean;
  badge: RailBadge | null;
  /** Visible tooltip text and accessible name (the rail shows icons only). */
  tooltip: string;
};

const BADGE_CAP = 99;

export function isNavItemActive(pathname: string, item: RailNavInput): boolean {
  if (!item.href) return false;
  return pathname === item.href || (item.matchNested === true && pathname.startsWith(`${item.href}/`));
}

export function formatRailBadge(count: number | undefined): RailBadge | null {
  if (count === undefined || !Number.isFinite(count) || count < 0) return null;
  return {
    text: count > BADGE_CAP ? `${BADGE_CAP}+` : String(count),
    tone: count === 0 ? "zero" : "pending",
  };
}

export function toRailItems<T extends RailNavInput>(items: T[], pathname: string, soonLabel: string): RailItem<T>[] {
  return items.map((item) => ({
    item,
    active: isNavItemActive(pathname, item),
    disabled: !item.href,
    badge: formatRailBadge(item.badge),
    tooltip: `${item.label}${item.badge != null ? ` (${item.badge})` : ""}${item.soon ? ` — ${soonLabel}` : ""}`,
  }));
}

/** Label for the header breadcrumb: explicit page title, else the active nav item, else the default. */
export function resolveCurrentPageLabel(
  pathname: string,
  items: RailNavInput[],
  pageTitles?: Record<string, string>,
  defaultTitle?: string,
): string | undefined {
  return pageTitles?.[pathname] || items.find((item) => isNavItemActive(pathname, item))?.label || defaultTitle;
}

/** Desktop width of the aurora rail: icon-only when collapsed, labelled when expanded. */
export function railWidthClass(collapsed: boolean): "lg:w-[88px]" | "lg:w-[248px]" {
  return collapsed ? "lg:w-[88px]" : "lg:w-[248px]";
}

/** i18n key for the rail's expand/collapse toggle (names the action it performs). */
export function railToggleLabelKey(collapsed: boolean): "expandSidebar" | "collapseSidebar" {
  return collapsed ? "expandSidebar" : "collapseSidebar";
}
