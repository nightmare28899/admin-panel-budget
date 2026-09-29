import type { Category } from "./finance.types";
import type { StatementRow } from "./statement-import.types";
import { canIncludeAsExpense } from "./statement-import.utils";

type CategoryRule = { name: string; icon: string; pattern: RegExp };

// Merchant/description keyword rules for Mexican credit-card statements
// (RappiCard/Banorte and similar). Order matters: first match wins, so more
// specific patterns (e.g. named streaming services) come before broad
// catch-alls (e.g. generic "servicio").
const CATEGORY_RULES: CategoryRule[] = [
  { name: "Tienda de conveniencia", icon: "🏪", pattern: /\boxxo\b|7[\s-]?eleven|circle\s*k|extra\b|super\s*city/i },
  { name: "Supermercado", icon: "🛒", pattern: /wal\s*mart|soriana|chedraui|comercial\s*mexicana|superama|\bheb\b|costco|sam'?s\s*club|bodega\s*aurrera|la\s*comer|city\s*market|super\s*(kompra|del\s*norte)/i },
  { name: "Restaurantes", icon: "🍽️", pattern: /rappi(?!\s*card)|uber\s*eats|didi\s*food|restaurant|starbucks|domino'?s|pizza|burger|mcdonald|kfc|sushi|\btaco/i },
  { name: "Cafeterías", icon: "☕", pattern: /cafe(teria)?\b|vips|toks|sanborns/i },
  { name: "Transporte", icon: "🚕", pattern: /\buber(?!\s*eats)\b|\bdidi\b(?!\s*food)|cabify|\btaxi\b|metro\b|peaje|autopista/i },
  { name: "Gasolina", icon: "⛽", pattern: /gasolin|pemex|\bshell\b|\bmobil\b|g500|combustible/i },
  { name: "Juegos y apps", icon: "🎮", pattern: /clash\s*of\s*clans|google\s*play|app\s*store|playstation|\bxbox\b|\bsteam\b|nintendo|riot\s*games|supercell|king\.com|candy\s*crush/i },
  { name: "Streaming y suscripciones", icon: "🎬", pattern: /netflix|spotify|disney\+?|\bhbo\b|amazon\s*prime|youtube\s*premium|apple\s*(music|tv)|crunchyroll|paramount\+?|anthropic|\bclaude\b|openai|chatgpt|copilot/i },
  { name: "Salud", icon: "💊", pattern: /farmacia|guadalajara|del\s*ahorro|benavides|hospital|cl[ií]nica|consultorio|laboratorio/i },
  { name: "Compras en línea", icon: "🛍️", pattern: /amazon(?!\s*prime)|mercado\s*libre|mercadolibre|shein|aliexpress|liverpool|palacio\s*de\s*hierro|\bsears\b/i },
  { name: "Servicios", icon: "🧾", pattern: /\bcfe\b|telmex|totalplay|\bizzi\b|megacable|telcel|movistar|at&t|\bagua\b|luz\b|internet/i },
  { name: "Comisiones bancarias", icon: "🏦", pattern: /comisi[oó]n|inter[eé]s(es)?|anualidad|membres[ií]a/i },
];

const FALLBACK_CATEGORY = { name: "Otros gastos", icon: "🧩" };

function normalizeCategoryKey(name: string) {
  return name.trim().toLocaleLowerCase();
}

function matchRule(row: StatementRow): { name: string; icon: string } {
  const haystack = `${row.merchantName ?? ""} ${row.description}`.toLocaleLowerCase();
  return CATEGORY_RULES.find((rule) => rule.pattern.test(haystack)) ?? FALLBACK_CATEGORY;
}

/** A row is a categorization candidate when it can become an expense, has no
 * category yet, and the reviewer hasn't already dismissed it (excluded or
 * marked info-only). PENDING and already-INCLUDE_EXPENSE rows both qualify. */
function needsCategory(row: StatementRow) {
  return canIncludeAsExpense(row) && !row.categoryId && row.decision !== "EXCLUDE" && row.decision !== "INFO_ONLY";
}

export type CategorizationPlan = {
  /** rowId -> normalized category key (matches a key in categoriesToCreate, or an existing category name). */
  rowCategoryKeys: Record<string, string>;
  categoriesToCreate: Array<{ key: string; name: string; icon: string }>;
};

/** Suggests a category per uncategorized, includable row by matching its
 * merchant/description against known merchant keywords, reusing an existing
 * category by name when one matches and flagging new ones to create
 * otherwise. Never overwrites a row that already has a category. */
export function planStatementCategorization(
  rows: StatementRow[],
  categories: Category[],
): CategorizationPlan {
  const existingKeys = new Set(categories.map((category) => normalizeCategoryKey(category.name)));
  const categoriesToCreate = new Map<string, { key: string; name: string; icon: string }>();
  const rowCategoryKeys: Record<string, string> = {};

  for (const row of rows) {
    if (!needsCategory(row)) continue;

    const match = matchRule(row);
    const key = normalizeCategoryKey(match.name);
    rowCategoryKeys[row.id] = key;
    if (!existingKeys.has(key) && !categoriesToCreate.has(key)) {
      categoriesToCreate.set(key, { key, name: match.name, icon: match.icon });
    }
  }

  return { rowCategoryKeys, categoriesToCreate: [...categoriesToCreate.values()] };
}

export function categoryKeyOf(category: Category) {
  return normalizeCategoryKey(category.name);
}
