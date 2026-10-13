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
      className={`relative overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-1)] p-6 shadow-sm ${className}`}
    >
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
