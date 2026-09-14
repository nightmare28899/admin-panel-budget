import {
  BankOutlined,
  CarOutlined,
  CoffeeOutlined,
  GiftOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  RocketOutlined,
  ShoppingOutlined,
  ThunderboltOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { Category } from "./finance.types";

// Soft "glass" pill palette — swaps antd's raw hex-filled <Tag> (opaque,
// clashes with the dark theme) for a token-driven pair that matches the
// dim-background/matching-text pattern already used across the app (see
// Card/Modal). Categories cycle across the emerald/gold/rose/info pairs by a
// stable hash of their id so the same category always lands on the same
// color and icon; no category (or an unmapped one) falls back to a neutral
// bg-3/text-2 pill with a plain wallet icon instead of guessing one.
export const CATEGORY_TOKENS = [
  { bg: "var(--emerald-dim)", text: "var(--emerald-text)", icon: ShoppingOutlined },
  { bg: "var(--gold-dim)", text: "var(--gold-text)", icon: GiftOutlined },
  { bg: "var(--rose-dim)", text: "var(--rose-text)", icon: HomeOutlined },
  { bg: "var(--info-dim)", text: "var(--info-text)", icon: CoffeeOutlined },
] as const;

export const NEUTRAL_TOKEN = { bg: "var(--bg-3)", text: "var(--text-2)", icon: WalletOutlined } as const;

// Cosmetic-only icon variety per category name keyword — no data dependency,
// falls back to the hash-selected icon above when nothing matches.
export const KEYWORD_ICONS: Array<[RegExp, typeof ShoppingOutlined]> = [
  [/travel|transport|uber|taxi|car|gas/i, CarOutlined],
  [/health|medic|pharma|doctor/i, MedicineBoxOutlined],
  [/bill|utilit|electric|water|internet|phone/i, ThunderboltOutlined],
  [/gift|present/i, GiftOutlined],
  [/bank|fee|transfer/i, BankOutlined],
  [/subscription|entertain|streaming/i, RocketOutlined],
];

// Shared across ExpenseList (transaction rows) and SubscriptionsView
// (subscription rows) so the same category always renders with the same
// color/icon on both pages.
export function categoryTokens(category: Category | null | undefined) {
  if (!category) return NEUTRAL_TOKEN;

  const base = CATEGORY_TOKENS[hashToIndex(category.id ?? category.name, CATEGORY_TOKENS.length)];
  const keywordIcon = KEYWORD_ICONS.find(([pattern]) => pattern.test(category.name))?.[1];
  return keywordIcon ? { ...base, icon: keywordIcon } : base;
}

export function hashToIndex(value: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}
