"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/i18n/LocaleProvider";
import { settingsAction } from "./nutrition.actions";
import { profileSchema } from "./nutrition.schemas";
import type { Profile } from "./nutrition.types";
import { ControlledInput } from "./NutritionFields";
import {
  Banner,
  FeedbackBanner,
  PageContainer,
  PageHeader,
  useFeedback,
} from "./NutritionUi";

export default function SettingsView({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { t } = useLocale();
  const { feedback, clear, success, fail } = useFeedback();
  // theme and meal times stay in the defaults so profileSchema keeps validating the full profile;
  // meal times are no longer edited because the schedule is flexible.
  const [defaults] = useState(profile);
  const form = useForm<Profile>({ resolver: zodResolver(profileSchema), defaultValues: defaults });

  return (
    <PageContainer>
      <PageHeader title={t("nutSettingsTitle")} description={t("nutSettingsDescription")} />
      <FeedbackBanner feedback={feedback} onDismiss={clear} />
      <Card>
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            clear();
            try {
              const result = await settingsAction(values);
              if (result.success) {
                success(t("nutPrefsSaved"));
                router.refresh();
              } else fail(result.error);
            } catch {
              fail(t("nutPrefsFailed"));
            }
          })}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ControlledInput
              control={form.control}
              name="name"
              label={t("name")}
              autoComplete="name"
              placeholder={t("nutPhName")}
            />
            <ControlledInput
              control={form.control}
              name="timezone"
              label={t("nutTimezone")}
              hint={t("nutTimezoneHint")}
              placeholder={t("nutPhTimezone")}
            />
          </div>
          {Object.keys(form.formState.errors).length > 0 && (
            <Banner tone="error" className="">
              {t("nutSettingsErrors")}
            </Banner>
          )}
          <div>
            <Button type="submit" loading={form.formState.isSubmitting}>
              {t("nutSavePrefs")}
            </Button>
          </div>
        </form>
      </Card>
    </PageContainer>
  );
}
