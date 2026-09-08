export type ToggleColor = "emerald" | "gold";

const ON_COLOR_CLASSES: Record<ToggleColor, string> = {
  emerald: "bg-[var(--emerald)] hover:brightness-110",
  gold: "bg-[var(--gold)] hover:brightness-110",
};

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
  onColor = "emerald",
  title,
  className = "",
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
  onColor?: ToggleColor;
  title?: string;
  className?: string;
}) {
  const track = (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      title={title}
      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent align-middle transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? ON_COLOR_CLASSES[onColor] : "bg-[var(--bg-3)] hover:bg-[var(--border)]"
      } ${className}`}
    >
      <span className="sr-only">Toggle</span>
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[var(--bg-0)] shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  if (!label) {
    return track;
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-2)] px-2.5 py-1.5">
      <span className="text-[11px] font-medium tracking-wide text-[var(--text-3)]">{label}</span>
      {track}
    </div>
  );
}
