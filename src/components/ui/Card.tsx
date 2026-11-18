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
      className={`relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--card-border)] [background:var(--card-bg)] p-6 [box-shadow:var(--card-shadow)] ${className}`}
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
