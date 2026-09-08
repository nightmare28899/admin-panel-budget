export function Card({
  title,
  icon,
  children,
  className = "",
  id,
}: {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`relative overflow-hidden rounded-2xl border border-[var(--emerald)]/25 bg-[var(--bg-2)]/60 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,var(--emerald-dim),transparent_55%)]"
        aria-hidden="true"
      />
      <div className="relative">
        {title ? (
          <h3 className="mb-[18px] flex items-center gap-[9px] text-[13.5px] font-medium text-[var(--text-1)]">
            {icon}
            {title}
          </h3>
        ) : null}
        {children}
      </div>
    </div>
  );
}
