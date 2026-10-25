import { describe, expect, it } from "vitest";
import type { Category } from "./finance.types";
import { categoryGlyph, categoryLabel, categoryTokens } from "./categoryVisuals";

const category = (name: string, icon: string | null): Category => ({ id: name, name, icon } as Category);

describe("categoryGlyph", () => {
  it("keeps emoji glyphs", () => {
    expect(categoryGlyph("🛒")).toBe("🛒");
    expect(categoryGlyph(" 🏦 ")).toBe("🏦");
  });

  it("drops icon-set names saved by the mobile app", () => {
    expect(categoryGlyph("fast-food-outline")).toBeUndefined();
    expect(categoryGlyph("cube-outline")).toBeUndefined();
    expect(categoryGlyph("bag-handle-outline")).toBeUndefined();
    expect(categoryGlyph("car")).toBeUndefined();
  });

  it("treats empty values as no glyph", () => {
    expect(categoryGlyph(null)).toBeUndefined();
    expect(categoryGlyph(undefined)).toBeUndefined();
    expect(categoryGlyph("  ")).toBeUndefined();
  });
});

describe("categoryLabel", () => {
  it("prefixes the glyph only when it is displayable", () => {
    expect(categoryLabel(category("Supermercado", "🛒"))).toBe("🛒 Supermercado");
    expect(categoryLabel(category("Cocteleria", "fast-food-outline"))).toBe("Cocteleria");
    expect(categoryLabel(category("Varios", null))).toBe("Varios");
  });
});

describe("categoryTokens", () => {
  it("falls back to a component icon when the persisted icon is an icon-set name", () => {
    expect(categoryTokens(category("Cocteleria", "fast-food-outline")).icon.kind).toBe("component");
  });

  it("uses the persisted emoji as a glyph", () => {
    expect(categoryTokens(category("Supermercado", "🛒")).icon).toEqual({ kind: "glyph", glyph: "🛒" });
  });
});
