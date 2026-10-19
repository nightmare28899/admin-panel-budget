import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { theme } from "antd";
import { antdSharedTheme, workspaceReferenceTheme, workspaceAccent, workspaceDarkTheme, getWorkspaceTheme } from "./antdTheme";

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe("workspace reference theme", () => {
  it("uses Ant Design's default algorithm while preserving the public dark theme", () => {
    expect(workspaceReferenceTheme.algorithm).toBe(theme.defaultAlgorithm);
    expect(antdSharedTheme.algorithm).toBe(theme.darkAlgorithm);
  });

  it("keeps normal, muted and accent text readable on every workspace surface", () => {
    const tokens = workspaceReferenceTheme.token!;
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const scopedTokens = css.match(/\[data-workspace\]\s*\{([^}]+)\}/)![1];
    const backgrounds = [...scopedTokens.matchAll(/--bg-(?:[0-3]|hover): (#[a-f\d]{6});/gi)].map((match) => match[1]);
    expect(backgrounds).toHaveLength(5);
    const textColors = [tokens.colorText!, tokens.colorTextSecondary!, tokens.colorTextTertiary!, tokens.colorTextPlaceholder!, tokens.colorError!, tokens.colorSuccess!, tokens.colorWarning!, tokens.colorInfo!, ...Object.values(workspaceAccent)];
    for (const background of backgrounds) {
      for (const foreground of textColors) expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
    for (const accent of Object.values(workspaceAccent)) expect(contrast("#ffffff", accent)).toBeGreaterThanOrEqual(4.5);
  });

  it("matches the sampled screenshot surfaces and purple accent exactly", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const scopedTokens = css.match(/\[data-workspace\]\s*\{([^}]+)\}/)![1];
    const referenceColors = {
      "bg-0": "#f5f5f6", "bg-1": "#ffffff", "bg-2": "#e9e9ec", "bg-3": "#f2f2f2",
      "shell-header-bg": "#100c27", "shell-header-text": "#ffffff",
      "shell-header-muted": "#d6d2e2", "shell-header-border": "#342e4c", accent: "#613fdd",
    };
    for (const [token, color] of Object.entries(referenceColors)) expect(scopedTokens).toContain(`--${token}: ${color};`);
    expect(Object.values(workspaceAccent)).toEqual(["#613fdd", "#613fdd", "#613fdd"]);
    expect(contrast("#ffffff", "#100c27")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#d6d2e2", "#100c27")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#d6d2e2", "#342e4c")).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#c4b5fd", "#2c2054")).toBeGreaterThanOrEqual(4.5);
    const components = workspaceReferenceTheme.components!;
    expect(components.Table!.colorBgContainer).toBe("#ffffff");
    expect(components.Table!.headerBg).toBe("#f2f2f2");
    expect(components.Modal!.contentBg).toBe("#ffffff");
    expect(components.Popconfirm!.colorBgElevated).toBe("#ffffff");
  });

  it("keeps semantic badge labels readable on their tinted surfaces", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const scopedTokens = css.match(/\[data-workspace\]\s*\{([^}]+)\}/)![1];
    for (const semantic of ["emerald", "gold", "rose", "info"]) {
      const background = scopedTokens.match(new RegExp(`--${semantic}-dim: (#[a-f\\d]{6});`, "i"))![1];
      const foreground = scopedTokens.match(new RegExp(`--${semantic}-text: (#[a-f\\d]{6});`, "i"))![1];
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("uses the same reference tokens in CSS and Ant Design, including portals", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const workspaceTokens = css.match(/\[data-workspace\]\s*\{([^}]+)\}/)![1];
    const pairs = {
      "bg-0": workspaceReferenceTheme.token!.colorBgBase,
      "bg-1": workspaceReferenceTheme.token!.colorBgContainer,
      "bg-3": workspaceReferenceTheme.token!.colorBgElevated,
      "text-1": workspaceReferenceTheme.token!.colorText,
      "text-2": workspaceReferenceTheme.token!.colorTextSecondary,
      "text-3": workspaceReferenceTheme.token!.colorTextTertiary,
      accent: workspaceAccent.finance,
    };
    expect(workspaceTokens).toContain("color-scheme: light");
    for (const [token, value] of Object.entries(pairs)) expect(workspaceTokens).toContain(`--${token}: ${value};`);
  });
});


describe("workspace dark theme", () => {
  it("selects the requested palette without changing the light reference or public theme", () => {
    for (const workspace of ["finance", "nutrition", "admin"] as const) {
      expect(getWorkspaceTheme(workspace, "light").algorithm).toBe(theme.defaultAlgorithm);
      expect(getWorkspaceTheme(workspace, "light").token!.colorPrimary).toBe(workspaceAccent[workspace]);
      expect(getWorkspaceTheme(workspace, "dark").algorithm).toBe(theme.darkAlgorithm);
      expect(getWorkspaceTheme(workspace, "dark").inherit).toBe(false);
    }
    expect(antdSharedTheme.token!.colorPrimary).toBe("#00c77f");
    expect(workspaceReferenceTheme.token!.colorBgContainer).toBe("#ffffff");
  });

  it("keeps CSS and Ant Design dark surfaces in sync and readable", () => {
    const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
    const tokens = css.match(/\[data-workspace\]\[data-appearance="dark"\]\s*\{([^}]+)\}/)![1];
    const themeTokens = workspaceDarkTheme.token!;
    const pairs = {
      "bg-0": themeTokens.colorBgBase,
      "bg-1": themeTokens.colorBgContainer,
      "bg-3": themeTokens.colorBgElevated,
      "text-1": themeTokens.colorText,
      "text-2": themeTokens.colorTextSecondary,
      "text-3": themeTokens.colorTextTertiary,
      accent: themeTokens.colorPrimary,
    };
    for (const [token, value] of Object.entries(pairs)) expect(tokens).toContain(`--${token}: ${value};`);
    for (const background of ["#080b11", "#111620", "#171d26", "#262e3a"]) {
      for (const foreground of ["#e8ebf1", "#b6beca", "#8f99a9", "#b5a0ff"])
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
    for (const semantic of ["emerald", "gold", "rose", "info"]) {
      const background = tokens.match(new RegExp(`--${semantic}-dim: (#[a-f\\d]{6});`, "i"))![1];
      const foreground = tokens.match(new RegExp(`--${semantic}-text: (#[a-f\\d]{6});`, "i"))![1];
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
    expect(workspaceDarkTheme.components!.Modal!.contentBg).toBe(themeTokens.colorBgContainer);
    expect(workspaceDarkTheme.components!.Table!.colorBgContainer).toBe(themeTokens.colorBgContainer);
  });
});
