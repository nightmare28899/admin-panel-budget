"use client";

import { useRouter } from "next/navigation";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useLocale } from "@/i18n/LocaleProvider";

/** Full-page error state shown when the nutrition data cannot be loaded. */
export default function NutritionUnavailable() {
  const router = useRouter();
  const { t } = useLocale();
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[var(--bg-0)] px-4">
      <AmbientBackground variant="auth" />
      <div className="absolute right-4 top-6 z-20 sm:right-6">
        <LanguageSwitcher />
      </div>
      <div className="relative z-10 w-full max-w-lg">
        <Card>
          <div role="alert" className="flex flex-col gap-4">
            <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">
              {t("nutUnavailableTitle")}
            </h1>
            <p className="text-sm leading-6 text-[var(--text-2)]">{t("nutUnavailableDescription")}</p>
            <div>
              <Button type="button" onClick={() => router.refresh()}>
                {t("nutTryAgain")}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
