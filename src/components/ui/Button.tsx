import { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "success" | "tinted";
export type ButtonSize = "sm" | "md";

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-1.5 cursor-pointer select-none whitespace-nowrap transition-all duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100";

// Soft layered shadow (many thin stops) instead of a single flat blob — reads as real elevation on a dark surface.
const LIFT_SHADOW =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_1px_2px_rgba(0,0,0,0.35),0_4px_10px_rgba(0,0,0,0.28)]";
const LIFT_SHADOW_HOVER =
  "hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.4),0_8px_20px_rgba(0,0,0,0.32)]";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: `rounded-full border border-black/10 bg-[var(--emerald)] text-[var(--bg-0)] font-semibold ${LIFT_SHADOW} ${LIFT_SHADOW_HOVER} hover:-translate-y-px hover:brightness-110 active:translate-y-0 active:brightness-95 disabled:hover:translate-y-0 disabled:shadow-none`,
  outline:
    "rounded-full border border-[var(--border)] bg-[var(--bg-3)]/60 text-[var(--text-1)] font-medium hover:border-[var(--text-3)] hover:bg-[var(--bg-3)] active:bg-[var(--bg-2)] disabled:hover:bg-[var(--bg-3)]/60",
  ghost:
    "rounded-full text-[var(--text-2)] font-medium hover:bg-[var(--bg-3)] hover:text-[var(--text-1)] active:bg-[var(--bg-2)]",
  danger: `rounded-full border border-black/10 bg-[var(--rose)] text-[var(--bg-0)] font-semibold ${LIFT_SHADOW} ${LIFT_SHADOW_HOVER} hover:-translate-y-px hover:brightness-110 active:translate-y-0 active:brightness-95 disabled:hover:translate-y-0 disabled:shadow-none`,
  success: `rounded-full border border-black/10 bg-[var(--emerald)] text-[var(--bg-0)] font-semibold ${LIFT_SHADOW} ${LIFT_SHADOW_HOVER} hover:-translate-y-px hover:brightness-110 active:translate-y-0 active:brightness-95 disabled:hover:translate-y-0 disabled:shadow-none`,
  tinted:
    "rounded-full border border-[var(--emerald)]/30 bg-[var(--emerald-dim)] font-semibold text-[var(--emerald-text)] hover:bg-[var(--emerald)]/25 hover:border-[var(--emerald)]/50 active:bg-[var(--emerald)]/35",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
