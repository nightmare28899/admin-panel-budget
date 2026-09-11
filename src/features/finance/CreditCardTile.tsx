import { Button } from "@/components/ui/Button";
import {
  creditCardBackground,
  CreditCardChipIcon,
  CreditCardContactlessIcon,
} from "./creditCardVisuals";
import type { CreditCardOverviewItem } from "./credit-cards.types";

// Credit cards don't carry their own currency (unlike expenses/subscriptions);
// match the same "MXN" convention already used for statement reconciliation.
function formatMoney(value: number) {
  return `MXN ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function usageTone(card: CreditCardOverviewItem): "emerald" | "gold" | "rose" {
  if (card.flags.overLimit) return "rose";
  if (card.flags.highUtilization) return "gold";
  return "emerald";
}

const USAGE_BADGE_CLASS = {
  emerald: "bg-[var(--emerald-dim)] text-[var(--emerald-text)]",
  gold: "bg-[var(--gold-dim)] text-[var(--gold-text)]",
  rose: "bg-[var(--rose-dim)] text-[var(--rose-text)]",
};

export function CreditCardTile({
  card,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  card: CreditCardOverviewItem;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  const background = creditCardBackground(card);
  const tone = usageTone(card);

  return (
    <div className={`overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-2)]/60 ${card.isActive ? "" : "opacity-60"}`}>
      <div
        style={{ background }}
        className="relative flex h-40 flex-col justify-between overflow-hidden p-4"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/30" />

        <div className="relative flex items-start justify-between">
          <span className="truncate text-xs font-bold uppercase tracking-wide text-white/90">
            {card.bank}
          </span>
          <div className="flex items-center gap-2">
            <CreditCardContactlessIcon />
            {!card.isActive && (
              <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/85">
                Inactive
              </span>
            )}
          </div>
        </div>

        <CreditCardChipIcon />

        <div className="relative">
          <p className="font-mono text-[15px] tracking-[0.15em] text-white drop-shadow-sm">
            •••• •••• •••• {card.last4}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="truncate text-xs font-medium text-white/85">{card.name}</span>
            {card.brand && (
              <span className="shrink-0 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/85">
                {card.brand}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {card.creditStatus.limit != null ? (
          <div>
            <div className="flex items-center justify-between text-xs text-[var(--text-3)]">
              <span>Spending this cycle</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${USAGE_BADGE_CLASS[tone]}`}
              >
                {card.creditStatus.utilizationPercent ?? 0}% USED
              </span>
            </div>
            <p className="mt-1 font-mono text-sm text-[var(--text-1)]">
              {formatMoney(card.currentCycle.spend)} / {formatMoney(card.creditStatus.limit)}
            </p>
          </div>
        ) : (
          <p className="text-xs text-[var(--text-3)]">No credit limit set.</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          {card.isActive ? (
            <Button type="button" variant="danger" size="sm" onClick={onDeactivate}>
              Deactivate
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onReactivate}>
              Reactivate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
