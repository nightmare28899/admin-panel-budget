"use client";

import Image from "next/image";
import { useLocale } from "@/i18n/LocaleProvider";

type AvatarSize = "sm" | "md" | "lg";

const SIZE_PX: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
};

const SIZE_TEXT: Record<AvatarSize, string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-3xl",
};

export function Avatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
}: {
  name?: string | null;
  avatarUrl?: string | null;
  size?: AvatarSize | number;
  className?: string;
}) {
  const { t } = useLocale();
  const px = typeof size === "number" ? size : SIZE_PX[size];
  const textClass = typeof size === "number" ? "text-base" : SIZE_TEXT[size];
  const dimensionStyle = { width: px, height: px };

  return (
    <>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name || t("userAvatar")}
          width={px}
          height={px}
          unoptimized
          style={dimensionStyle}
          className={`rounded-full border border-[var(--border-soft)] bg-[var(--bg-3)] object-cover ${className}`}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.nextElementSibling?.classList.remove("hidden");
            e.currentTarget.nextElementSibling?.classList.add("flex");
          }}
        />
      ) : null}
      <div
        style={dimensionStyle}
        className={`rounded-full border border-[var(--border-soft)] bg-[var(--bg-3)] items-center justify-center font-serif text-[var(--text-1)] ${textClass} ${avatarUrl ? "hidden" : "flex"} ${className}`}
      >
        {(name || "U").slice(0, 1).toUpperCase()}
      </div>
    </>
  );
}
