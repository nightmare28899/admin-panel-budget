import { useLocale } from "@/i18n/LocaleProvider";

export function BudgetRing({ percentage, size = 48 }: { percentage: number; size?: number }) {
  const { t, formatNumber } = useLocale();
  const clamped = Math.min(100, Math.max(0, percentage));
  // Unlike the app's usual "down is favorable" trend polarity, here higher
  // usage is worse: emerald while comfortably under budget, gold as it
  // tightens, rose once spending is near or over the limit.
  const color = clamped < 70 ? "var(--emerald)" : clamped <= 90 ? "var(--gold)" : "var(--rose)";

  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={t("budgetUsedPercent", { percent: formatNumber(Math.round(clamped)) })}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border-soft)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.24}
        className="fill-[var(--text-1)] font-mono tabular-nums"
      >
        {Math.round(clamped)}
      </text>
    </svg>
  );
}
