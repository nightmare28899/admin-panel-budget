export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

const PILL_VARIANTS: Record<BadgeVariant, string> = {
  neutral: "bg-[var(--bg-3)] text-[var(--text-2)]",
  success: "bg-[var(--emerald-dim)] text-[var(--emerald-text)]",
  warning: "bg-[var(--gold-dim)] text-[var(--gold-text)]",
  danger: "bg-[var(--rose)]/15 text-[var(--rose)]",
  info: "bg-[var(--emerald-dim)] text-[var(--emerald-text)]",
};

export function Badge({
  variant = "neutral",
  ring = false,
  children,
  className = "",
}: {
  variant?: BadgeVariant;
  ring?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (ring) {
    return (
      <span
        className={`inline-flex items-center rounded-md border border-[var(--border)] px-2.5 py-[3px] text-xs text-[var(--text-2)] ${className}`}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${PILL_VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
