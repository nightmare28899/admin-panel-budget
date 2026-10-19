import { afterEach, describe, expect, it, vi } from "vitest";
import { getWorkspaceAppearance, getWorkspaceAppearanceServerSnapshot, setWorkspaceAppearance, subscribeWorkspaceAppearance } from "./workspaceAppearance";

afterEach(() => vi.unstubAllGlobals());

function mockBrowser(initial = "light") {
  let value = initial;
  const browser = {
    localStorage: { getItem: vi.fn(() => value), setItem: vi.fn((_key: string, next: string) => { value = next; }) },
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  };
  vi.stubGlobal("window", browser);
  return browser;
}

describe("workspace appearance preference", () => {
  it("defaults to light for SSR and invalid stored values", () => {
    mockBrowser("unknown");
    expect(getWorkspaceAppearanceServerSnapshot()).toBe("light");
    expect(getWorkspaceAppearance()).toBe("light");
  });

  it("persists dark mode and notifies subscribers", () => {
    const browser = mockBrowser();
    const listener = vi.fn();
    const unsubscribe = subscribeWorkspaceAppearance(listener);
    setWorkspaceAppearance("dark");
    expect(getWorkspaceAppearance()).toBe("dark");
    expect(browser.localStorage.setItem).toHaveBeenCalledWith("budget-panel-appearance", "dark");
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    expect(browser.removeEventListener).toHaveBeenCalledWith("storage", listener);
  });

  it("keeps toggling when writes fail but storage reads still succeed", () => {
    const browser = mockBrowser();
    browser.localStorage.setItem.mockImplementation(() => { throw new Error("quota"); });
    setWorkspaceAppearance("dark");
    expect(getWorkspaceAppearance()).toBe("dark");
    browser.localStorage.setItem.mockImplementation(() => {});
    setWorkspaceAppearance("light");
    expect(getWorkspaceAppearance()).toBe("light");
  });

  it("keeps the toggle usable when browser storage is blocked", () => {
    const browser = mockBrowser();
    browser.localStorage.getItem.mockImplementation(() => { throw new Error("blocked"); });
    browser.localStorage.setItem.mockImplementation(() => { throw new Error("blocked"); });
    setWorkspaceAppearance("dark");
    expect(getWorkspaceAppearance()).toBe("dark");
    setWorkspaceAppearance("light");
    expect(getWorkspaceAppearance()).toBe("light");
  });
});
