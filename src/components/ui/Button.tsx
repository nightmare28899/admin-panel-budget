import { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "success" | "tinted";
export type ButtonSize = "sm" | "md";

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-1.5 cursor-pointer select-none whitespace-nowrap transition-all duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none";

const LIFT_SHADOW = "[box-shadow:var(--button-primary-shadow)]";
const LIFT_SHADOW_HOVER = "hover:[box-shadow:var(--button-primary-shadow-hover)]";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: `rounded-[var(--radius-button)] border border-black/10 [background:var(--button-primary-bg)] text-[var(--accent-contrast)] font-semibold ${LIFT_SHADOW} ${LIFT_SHADOW_HOVER} hover:-translate-y-px hover:brightness-110 active:translate-y-0 active:brightness-95 disabled:hover:translate-y-0 disabled:[box-shadow:none]`,
  outline:
    "rounded-[var(--radius-button)] border border-[var(--border)] bg-[var(--bg-3)]/60 text-[var(--text-1)] font-medium hover:border-[var(--text-3)] hover:bg-[var(--bg-3)] active:bg-[var(--bg-2)] disabled:hover:bg-[var(--bg-3)]/60",
  ghost:
    "rounded-[var(--radius-button)] text-[var(--text-2)] font-medium hover:bg-[var(--bg-3)] hover:text-[var(--text-1)] active:bg-[var(--bg-2)]",
  danger: `rounded-[var(--radius-button)] border border-black/10 bg-[var(--rose)] text-white font-semibold ${LIFT_SHADOW} ${LIFT_SHADOW_HOVER} hover:-translate-y-px hover:brightness-110 active:translate-y-0 active:brightness-95 disabled:hover:translate-y-0 disabled:[box-shadow:none]`,
  success: `rounded-[var(--radius-button)] border border-black/10 bg-[var(--emerald)] text-[var(--bg-0)] font-semibold ${LIFT_SHADOW} ${LIFT_SHADOW_HOVER} hover:-translate-y-px hover:brightness-110 active:translate-y-0 active:brightness-95 disabled:hover:translate-y-0 disabled:[box-shadow:none]`,
  tinted:
    "rounded-[var(--radius-button)] border border-[var(--accent)]/30 bg-[var(--accent-dim)] font-semibold text-[var(--accent-text)] hover:bg-[var(--accent)]/25 hover:border-[var(--accent)]/50 active:bg-[var(--accent)]/35",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  disabled,
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || rest["aria-busy"]}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin motion-reduce:animate-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
        </svg>
      )}
      {children}
    </button>
  );
}
