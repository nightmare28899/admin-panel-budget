import { theme as antdTheme, type ThemeConfig } from "antd";
import type { WorkspaceAppearance } from "./workspaceAppearance";

// Hex values derived from the oklch tokens in src/app/globals.css
// (resolved via canvas pixel readback — do not eyeball these, re-derive
// the same way if the source tokens change).
const BG_0 = "#080b11";
const BG_2 = "#171d26";
const BG_3 = "#262e3a";
const BORDER = "#323b48";
const BORDER_SOFT = "#262d38";
const TEXT_1 = "#e8ebf1";
const TEXT_2 = "#b6beca";
const TEXT_3 = "#8f99a9";
const EMERALD = "#00c77f";
const GOLD = "#f69e0b";
const ROSE = "#ef4444";
const INFO = "#22d3ee";

// Low-alpha variants (same hex as BG_3/BORDER_SOFT, alpha added) so antd
// surfaces that must let the AppShell's fixed backdrop show through — the
// Table body/header — read as translucent glass instead of an opaque panel.
const BG_3_ALPHA_LOW = "rgba(38, 46, 58, 0.28)"; // BG_3 @ ~28% — row hover
const BG_3_ALPHA_LOWER = "rgba(38, 46, 58, 0.16)"; // BG_3 @ ~16% — striped/expanded rows
const BG_3_ALPHA_MEDIUM = "rgba(38, 46, 58, 0.6)"; // BG_3 @ 60% — outlined buttons
const BUTTON_LIFT_SHADOW =
  "inset 0 1px 0 rgba(255,255,255,0.16), 0 1px 2px rgba(0,0,0,0.35), 0 4px 10px rgba(0,0,0,0.28)";

export type Workspace = "finance" | "nutrition" | "admin";

// antd needs a concrete color to derive its palette, so this mirrors the
// --accent override per [data-workspace] in globals.css.
export const workspaceAccent: Record<Workspace, string> = {
  finance: "#613fdd",
  nutrition: "#613fdd",
  admin: "#613fdd",
};

// Concrete hex tokens mirror the screenshot-reference workspace tokens in globals.css.
// Public/login screens retain antdSharedTheme's dark palette.
export const workspaceReferenceTheme: ThemeConfig = {
  algorithm: antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: workspaceAccent.nutrition,
    colorSuccess: "#067647",
    colorWarning: "#925b08",
    colorError: "#b42318",
    colorInfo: "#175cd3",
    colorBgBase: "#f5f5f6",
    colorBgContainer: "#ffffff",
    colorBgElevated: "#f2f2f2",
    colorBgLayout: "#f5f5f6",
    colorText: "#242429",
    colorTextSecondary: "#505057",
    colorTextTertiary: "#5f5f68",
    colorTextPlaceholder: "#5f5f68",
    colorBorder: "#c7c7ce",
    colorBorderSecondary: "#dedee3",
    borderRadius: 10,
    fontFamily: "var(--font-geist-sans), sans-serif",
  },
  components: {
    Button: {
      fontWeight: 500,
      primaryColor: "#ffffff",
      dangerColor: "#ffffff",
      defaultColor: "#242429",
      defaultBg: "#ffffff",
      defaultBorderColor: "#c7c7ce",
      defaultHoverBg: "#e9e9ec",
      defaultShadow: "none",
      primaryShadow: "none",
      dangerShadow: "none",
      paddingInline: 20,
      paddingInlineSM: 12,
      contentFontSize: 14,
      contentFontSizeSM: 12,
    },
    Table: {
      colorBgContainer: "#ffffff",
      headerBg: "#f2f2f2",
      footerBg: "#f2f2f2",
      headerColor: "#505057",
      headerSplitColor: "#dedee3",
      borderColor: "#dedee3",
      rowHoverBg: "#e9e9ec",
      rowExpandedBg: "#e9e9ec",
    },
    Modal: { contentBg: "#ffffff", headerBg: "#ffffff" },
    Popconfirm: { colorBgElevated: "#ffffff" },
  },
};

export const antdSharedTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: EMERALD,
    colorSuccess: EMERALD,
    colorWarning: GOLD,
    colorError: ROSE,
    colorInfo: INFO,
    colorBgBase: BG_0,
    colorBgContainer: BG_2,
    colorBgElevated: BG_3,
    colorBgLayout: BG_0,
    colorText: TEXT_1,
    colorTextSecondary: TEXT_2,
    colorTextTertiary: TEXT_3,
    colorBorder: BORDER,
    colorBorderSecondary: BORDER_SOFT,
    borderRadius: 10, // matches --radius-md (0.625rem) in globals.css
    fontFamily: "var(--font-geist-sans), sans-serif",
  },
  components: {
    Button: {
      fontWeight: 500,
      primaryColor: BG_0,
      dangerColor: BG_0,
      defaultColor: TEXT_1,
      defaultBg: BG_3_ALPHA_MEDIUM,
      defaultBorderColor: BORDER,
      defaultHoverBg: BG_3,
      defaultHoverColor: TEXT_1,
      defaultHoverBorderColor: TEXT_3,
      defaultActiveBg: BG_2,
      defaultActiveColor: TEXT_1,
      defaultActiveBorderColor: BORDER,
      defaultShadow: "none",
      primaryShadow: BUTTON_LIFT_SHADOW,
      dangerShadow: BUTTON_LIFT_SHADOW,
      paddingInline: 20,
      paddingInlineSM: 12,
      contentFontSize: 14,
      contentFontSizeSM: 12,
    },
    // Table stays transparent (body + header + footer) so the AppShell's
    // fixed radial backdrop is visible through it — only row hover/selection
    // get a faint --bg-3 wash instead of antd's opaque default.
    Table: {
      colorBgContainer: "transparent",
      headerBg: "transparent",
      footerBg: "transparent",
      headerColor: TEXT_2,
      headerSplitColor: BORDER_SOFT,
      borderColor: BORDER_SOFT,
      rowHoverBg: BG_3_ALPHA_LOW,
      rowSelectedBg: BG_3_ALPHA_LOW,
      rowSelectedHoverBg: BG_3_ALPHA_LOW,
      rowExpandedBg: BG_3_ALPHA_LOWER,
    },
    Popconfirm: {
      colorBgElevated: BG_3,
    },
    Modal: {
      contentBg: BG_2,
      headerBg: BG_2,
    },
  },
};


export const workspaceDarkTheme: ThemeConfig = {
  ...antdSharedTheme,
  token: {
    ...antdSharedTheme.token,
    colorPrimary: "#b5a0ff",
    colorBgBase: "#080b11",
    colorBgContainer: "#111620",
    colorBgElevated: "#262e3a",
    colorTextPlaceholder: "#8f99a9",
  },
  components: {
    ...antdSharedTheme.components,
    Table: {
      ...antdSharedTheme.components?.Table,
      colorBgContainer: "#111620",
      headerBg: "#262e3a",
      footerBg: "#262e3a",
    },
    Modal: { contentBg: "#111620", headerBg: "#111620" },
  },
};

export function getWorkspaceTheme(workspace: Workspace, appearance: WorkspaceAppearance): ThemeConfig {
  const selected = appearance === "dark" ? workspaceDarkTheme : workspaceReferenceTheme;
  return {
    ...selected,
    inherit: false,
    token: {
      ...selected.token,
      colorPrimary: appearance === "dark" ? workspaceDarkTheme.token!.colorPrimary : workspaceAccent[workspace],
    },
  };
}
