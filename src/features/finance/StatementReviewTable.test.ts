import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./StatementReviewTable.module.css", import.meta.url), "utf8");
const workspace = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8")
  .match(/\[data-workspace\]\s*\{([^}]+)\}/)![1];

function luminance(token: string) {
  const hex = workspace.match(new RegExp(`--${token}: (#(?:[a-f\\d]{6}));`, "i"))![1];
  const channels = hex.slice(1).match(/../g)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

describe("statement review table palette", () => {
  it("keeps normal and disabled values readable on every row state", () => {
    for (const background of ["bg-1", "bg-3", "bg-hover", "accent-dim"]) {
      for (const foreground of ["text-1", "text-2", "text-3"]) {
        const values = [luminance(background), luminance(foreground)].sort((a, b) => b - a);
        expect((values[0] + 0.05) / (values[1] + 0.05)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("leaves the Select combobox overlay transparent and hidden", () => {
    expect(css).toContain('input:disabled:not([role="combobox"])');
    expect(css).not.toMatch(/input:disabled\s*[,\{]/);
  });

  it("uses neutral row surfaces and a single accent for selection and focus", () => {
    expect(css).toContain(".row:nth-child(even) .cell");
    expect(css).toContain(".row:hover .cell");
    expect(css).toContain('.row[aria-selected="true"] .cell');
    expect(css).toContain("background: var(--accent-dim)");
    expect(css).toContain("outline: 2px solid var(--accent)");
    expect(css).not.toContain(".ant-");
    expect(css).not.toMatch(/background: var\(--(?:emerald|gold|rose)/);
  });

  it("frames the table like the Categories list and keeps pagination outside the border", () => {
    expect(css).toMatch(/\.table \.section\s*\{[^}]*border: 1px solid var\(--border-soft\)/);
    expect(css).toMatch(/\.table \.section\s*\{[^}]*border-radius: var\(--radius-md/);
    expect(css).toMatch(/\.table \.pagination\s*\{[^}]*margin-block-start: 24px/);
    expect(css).not.toMatch(/\.pagination\s*\{[^}]*padding-inline/);
  });
});
