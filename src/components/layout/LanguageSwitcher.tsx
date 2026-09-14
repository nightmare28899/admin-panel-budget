"use client";

import { useState } from "react";
import { Popover } from "antd";
import { CheckOutlined, GlobalOutlined } from "@ant-design/icons";
import { useLocale } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/types";

const LOCALE_OPTIONS: Array<{ value: Locale; labelKey: "english" | "spanish" }> = [
  { value: "en", labelKey: "english" },
  { value: "es", labelKey: "spanish" },
];

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      styles={{ content: { padding: 0 } }}
      open={open}
      onOpenChange={setOpen}
      content={
        <div className="w-[160px] overflow-hidden rounded-[var(--radius-md)]">
          <ul>
            {LOCALE_OPTIONS.map((option) => {
              const active = option.value === locale;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => {
                      setLocale(option.value);
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-[var(--bg-3)] ${
                      active ? "text-[var(--emerald-text)]" : "text-[var(--text-2)]"
                    }`}
                  >
                    {t(option.labelKey)}
                    {active && <CheckOutlined className="text-xs" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      }
    >
      <button
        type="button"
        aria-label={t("language")}
        title={t("language")}
        className={`flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border border-[var(--border-soft)] text-[var(--text-2)] transition-colors hover:bg-[var(--bg-2)] hover:text-[var(--text-1)] ${className}`}
      >
        <GlobalOutlined />
      </button>
    </Popover>
  );
}
