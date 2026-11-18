import { describe, expect, it } from "vitest";
import { THEME_INIT_SCRIPT } from "./themeInitScript";

function run(storage: Record<string, string> | "throws") {
  const attributes: Record<string, string> = {};
  const window = {
    localStorage: {
      getItem: (key: string) => {
        if (storage === "throws") throw new Error("blocked");
        return storage[key] ?? null;
      },
    },
  };
  const document = { documentElement: { setAttribute: (name: string, value: string) => { attributes[name] = value; } } };
  new Function("window", "document", THEME_INIT_SCRIPT)(window, document);
  return attributes;
}

describe("theme init script", () => {
  it("applies stored theme and appearance before hydration", () => {
    expect(run({ "budget-panel-theme": "aurora", "budget-panel-appearance": "dark" })).toEqual({ "data-theme": "aurora", "data-appearance": "dark" });
  });

  it("falls back to classic/light for empty or invalid values", () => {
    expect(run({})).toEqual({ "data-theme": "classic", "data-appearance": "light" });
    expect(run({ "budget-panel-theme": "x", "budget-panel-appearance": "y" })).toEqual({ "data-theme": "classic", "data-appearance": "light" });
  });

  it("never throws when storage is blocked", () => {
    expect(() => run("throws")).not.toThrow();
  });
});
