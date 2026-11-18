import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WORKSPACE_THEME_VARIANTS,
  getWorkspaceThemeVariant,
  getWorkspaceThemeVariantServerSnapshot,
  isWorkspaceThemeVariant,
  setWorkspaceThemeVariant,
  subscribeWorkspaceThemeVariant,
} from "./workspaceTheme";

afterEach(() => vi.unstubAllGlobals());

function mockBrowser(initial: string | null = null) {
  let value = initial;
  const browser = {
    localStorage: { getItem: vi.fn(() => value), setItem: vi.fn((_key: string, next: string) => { value = next; }) },
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  };
  vi.stubGlobal("window", browser);
  return browser;
}

describe("workspace theme variant preference", () => {
  it("lists the available variants and validates values", () => {
    expect(WORKSPACE_THEME_VARIANTS).toEqual(["classic", "aurora"]);
    expect(isWorkspaceThemeVariant("aurora")).toBe(true);
    expect(isWorkspaceThemeVariant("neon")).toBe(false);
    expect(isWorkspaceThemeVariant(null)).toBe(false);
  });

  it("defaults to classic for SSR, empty and invalid stored values", () => {
    expect(getWorkspaceThemeVariantServerSnapshot()).toBe("classic");
    mockBrowser(null);
    expect(getWorkspaceThemeVariant()).toBe("classic");
    mockBrowser("unknown");
    expect(getWorkspaceThemeVariant()).toBe("classic");
  });

  it("reads a stored valid variant", () => {
    mockBrowser("aurora");
    expect(getWorkspaceThemeVariant()).toBe("aurora");
  });

  it("persists the variant under its own key and notifies subscribers", () => {
    const browser = mockBrowser();
    const listener = vi.fn();
    const unsubscribe = subscribeWorkspaceThemeVariant(listener);
    setWorkspaceThemeVariant("aurora");
    expect(getWorkspaceThemeVariant()).toBe("aurora");
    expect(browser.localStorage.setItem).toHaveBeenCalledWith("budget-panel-theme", "aurora");
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    expect(browser.removeEventListener).toHaveBeenCalledWith("storage", listener);
  });

  it("ignores invalid values passed to the setter", () => {
    const browser = mockBrowser();
    setWorkspaceThemeVariant("classic");
    setWorkspaceThemeVariant("neon" as never);
    expect(getWorkspaceThemeVariant()).toBe("classic");
    expect(browser.localStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it("keeps switching when browser storage is blocked", () => {
    const browser = mockBrowser();
    browser.localStorage.getItem.mockImplementation(() => { throw new Error("blocked"); });
    browser.localStorage.setItem.mockImplementation(() => { throw new Error("blocked"); });
    setWorkspaceThemeVariant("aurora");
    expect(getWorkspaceThemeVariant()).toBe("aurora");
    setWorkspaceThemeVariant("classic");
    expect(getWorkspaceThemeVariant()).toBe("classic");
  });
});
