"use client";

import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useLocale } from "@/i18n/LocaleProvider";
import { useWorkspaceAppearance } from "@/hooks/useWorkspaceAppearance";

export function ThemeSwitcher() {
  const { appearance, setAppearance } = useWorkspaceAppearance();
  const { t } = useLocale();
  const dark = appearance === "dark";
  const label = t(dark ? "switchToLightMode" : "switchToDarkMode");

  return (
    <button
      type="button"
      onClick={() => setAppearance(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--text-2)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)]"
    >
      {dark ? <SunOutlined aria-hidden="true" /> : <MoonOutlined aria-hidden="true" />}
    </button>
  );
}
