import { theme as antdTheme, type ThemeConfig } from "antd";

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
};
