import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8").replace(/,\s*\n\s*/g, ", ");

const DEFAULTS = ':root, [data-workspace], [data-theme]';
const AURORA_LIGHT = '[data-theme="aurora"][data-workspace]';
const AURORA_DARK = '[data-theme="aurora"][data-workspace][data-appearance="dark"]';

function block(selector: string) {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Missing block: ${selector}`);
  return css.slice(start, css.indexOf("}", start));
}

function token(scope: string, name: string) {
  const match = scope.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`Missing --${name}`);
  return match[1].trim();
}

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const [high, low] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (high + 0.05) / (low + 0.05);
}

const SHAPE_TOKENS = [
  "radius-card", "radius-control", "radius-button", "radius-chip", "radius-modal",
  "card-bg", "card-border", "card-shadow", "tile-shadow",
  "input-bg", "input-border", "button-primary-bg", "button-primary-shadow", "button-primary-shadow-hover",
  "modal-bg", "modal-border", "modal-shadow",
  "theme-font-display", "theme-font-mono", "font-number",
];

describe("classic theme parity (shape tokens default to the current look)", () => {
  const defaults = block(DEFAULTS);

  it("declares every shape token with today's values", () => {
    for (const name of SHAPE_TOKENS) expect(() => token(defaults, name)).not.toThrow();
    expect(token(defaults, "radius-card")).toBe("1rem");
    expect(token(defaults, "radius-control")).toBe("0.5rem");
    expect(token(defaults, "radius-modal")).toBe("0.75rem");
    expect(token(defaults, "radius-button")).toBe("calc(infinity * 1px)");
    expect(token(defaults, "radius-chip")).toBe("calc(infinity * 1px)");
    expect(token(defaults, "card-bg")).toBe("var(--bg-1)");
    expect(token(defaults, "card-border")).toBe("var(--border-soft)");
    expect(token(defaults, "card-shadow")).toBe("0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)");
    expect(token(defaults, "tile-shadow")).toBe("none");
    expect(token(defaults, "input-bg")).toBe("var(--bg-3)");
    expect(token(defaults, "input-border")).toBe("var(--border-soft)");
    expect(token(defaults, "modal-bg")).toBe("var(--bg-2)");
    expect(token(defaults, "modal-border")).toBe("var(--border)");
    expect(token(defaults, "modal-shadow")).toBe("0 25px 50px -12px rgb(0 0 0 / 0.25)");
    expect(token(defaults, "button-primary-bg")).toBe("var(--accent)");
    expect(token(defaults, "font-number")).toBe("inherit");
  });
});

describe.each([
  ["dark", AURORA_DARK],
  ["light", AURORA_LIGHT],
])("aurora %s appearance", (appearance, selector) => {
  const scope = block(selector);

  it("overrides every shape token and the full color palette", () => {
    for (const name of SHAPE_TOKENS) expect(() => token(scope, name)).not.toThrow();
    for (const name of ["bg-0", "bg-1", "bg-2", "bg-3", "bg-hover", "border", "border-soft", "text-1", "text-2", "text-3", "emerald", "emerald-dim", "emerald-text", "gold", "gold-dim", "gold-text", "rose", "rose-dim", "rose-text", "info", "info-dim", "info-text", "accent", "accent-dim", "accent-text", "accent-contrast", "violet", "violet-dim", "violet-text"]) {
      expect(() => token(scope, name)).not.toThrow();
    }
  });

  it("uses large radii and pill chips", () => {
    expect(token(scope, "radius-card")).toBe("1.5rem");
    expect(token(scope, "radius-control")).toBe("0.875rem");
    expect(token(scope, "radius-chip")).toBe("calc(infinity * 1px)");
  });

  it("keeps text, accents and semantic labels at >= 4.5:1", () => {
    const surfaces = ["bg-0", "bg-1", "bg-2", "bg-3"].map((name) => token(scope, name));
    for (const surface of surfaces) {
      for (const name of ["text-1", "text-2", "text-3", "accent", "accent-text", "emerald-text", "violet-text", "gold-text", "rose-text", "info-text"]) {
        expect(contrast(token(scope, name), surface), `${appearance} ${name} on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const semantic of ["emerald", "gold", "rose", "info", "accent", "violet"]) {
      expect(contrast(token(scope, `${semantic}-text`), token(scope, `${semantic}-dim`)), `${appearance} ${semantic}-text on dim`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(token(scope, "accent-contrast"), token(scope, "accent")), `${appearance} accent-contrast`).toBeGreaterThanOrEqual(4.5);
  });
});

describe("aurora fonts", () => {
  it("only switches fonts under aurora", () => {
    expect(token(block(DEFAULTS), "theme-font-display")).toBe("var(--font-display)");
    expect(token(block(DEFAULTS), "theme-font-mono")).toBe("var(--font-geist-mono)");
    expect(token(block(AURORA_LIGHT), "theme-font-display")).toContain("--font-plus-jakarta");
    expect(token(block(AURORA_LIGHT), "theme-font-mono")).toContain("--font-jetbrains-mono");
    expect(token(block(AURORA_LIGHT), "font-number")).toBe("var(--theme-font-mono)");
  });
});
