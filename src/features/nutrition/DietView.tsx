"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "antd";
import { Badge, type BadgeVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useLocale } from "@/i18n/LocaleProvider";
import { activateDietAction, saveDietAction, verifyDietAction } from "./nutrition.actions";
import {
  mealTypes,
  type ActionResult,
  type Diet,
  type NutritionState,
} from "./nutrition.types";
import { localDate } from "./domain/dailyPlan";
import { DietMealTabs } from "./DietMealTabs";
import { DietImportCard } from "./DietImportCard";
import { attachableOriginals, type ImportResult } from "./nutrition.import";
import { Field, TextField } from "./NutritionFields";
import { FileInput } from "./FileInput";
import {
  Banner,
  EmptyState,
  FeedbackBanner,
  Icon,
  PageContainer,
  icons,
  useFeedback,
  useMealLabel,
  useStatusLabel,
} from "./NutritionUi";
import { formatQuantity } from "./domain/format";
import { isDraftDirty } from "./domain/dietDraft";

function newDiet(timezone: string): Diet {
  return {
    id: crypto.randomUUID(),
    title: "",
    startDate: localDate(timezone),
    endDate: null,
    status: "draft",
    active: false,
    meals: mealTypes.map((type) => ({ id: crypto.randomUUID(), type, options: [] })),
  };
}

const DIET_STATUS_VARIANT: Record<Diet["status"], BadgeVariant> = {
  draft: "neutral",
  pending_verification: "warning",
  verified: "success",
};

export default function DietView({
  state,
  startNew = false,
}: {
  state: NutritionState;
  /** Opens a blank draft on arrival (the top-bar "Create new diet" link). */
  startNew?: boolean;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const mealLabel = useMealLabel();
  const statusLabel = useStatusLabel();
  const { feedback, clear, success, fail } = useFeedback();
  const [draft, setDraft] = useState<Diet | null>(null);
  // What the open draft is compared against; null while it was never saved (imported).
  const [baseline, setBaseline] = useState<Diet | null>(null);
  const [busy, setBusy] = useState(false);
  // Set while the open draft came from a photo/PDF import: keeps the source
  // files so the originals can be retained once the diet is saved.
  const [imported, setImported] = useState<
    (Pick<ImportResult, "warnings" | "unmapped"> & { dietId: string; files: File[] }) | null
  >(null);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  const run = async (operation: () => Promise<ActionResult>) => {
    setBusy(true);
    clear();
    try {
      const result = await operation();
      if (result.success) {
        success(t("nutDietSaved"));
        router.refresh();
      } else fail(result.error);
      return result.success;
    } catch {
      fail(t("nutDietSaveFailed"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const editMeal = (index: number, meal: Diet["meals"][number]) => {
    if (draft)
      setDraft({ ...draft, meals: draft.meals.map((value, i) => (i === index ? meal : value)) });
  };

  /** Uploads one original through the same-origin proxy; resolves to an error message or null. */
  const postOriginal = async (dietId: string, file: File): Promise<string | null> => {
    try {
      const body = new FormData();
      body.set("dietId", dietId);
      body.set("file", file, file.name);
      const result = await fetch("/api/nutrition/diet-files", { method: "POST", body });
      const data: unknown = await result.json();
      if (result.ok) return null;
      return typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string"
        ? data.error
        : t("nutUploadFailed");
    } catch {
      return t("nutUploadFailed");
    }
  };

  const uploadOriginal = async (form: HTMLFormElement, dietId: string) => {
    setBusy(true);
    clear();
    try {
      const file = new FormData(form).get("file");
      const error = file instanceof File ? await postOriginal(dietId, file) : t("nutUploadFailed");
      if (error) {
        fail(error);
        return;
      }
      success(t("nutOriginalRetained"));
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const openDraft = (diet: Diet, saved: Diet | null) => {
    setImported(null);
    setBaseline(saved);
    setDraft(diet);
  };

  const closeDraft = () => {
    setDraft(null);
    setBaseline(null);
    setImported(null);
  };

  useEffect(() => {
    if (!startNew) return;
    const blank = newDiet(state.profile.timezone);
    openDraft(blank, structuredClone(blank));
    // Drop the query so a refresh does not reopen the draft.
    router.replace("/nutrition/diet");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startNew]);

  const startImportedDraft = (result: ImportResult, files: File[]) => {
    clear();
    setBaseline(null);
    setDraft({ ...result.draft, startDate: localDate(state.profile.timezone) });
    setImported({
      dietId: result.draft.id,
      files,
      warnings: result.warnings,
      unmapped: result.unmapped,
    });
  };

  const saveDraft = async (diet: Diet) => {
    if (!(await run(() => saveDietAction(diet)))) return;
    const source = imported && imported.dietId === diet.id ? imported : null;
    closeDraft();
    if (!source) return;
    // The draft id is client-generated and persisted by save_diet, so it is the new diet id.
    const { attach, skipped } = attachableOriginals(source.files);
    setBusy(true);
    try {
      let attached = 0;
      for (const file of attach) if ((await postOriginal(diet.id, file)) === null) attached += 1;
      if (attached === source.files.length)
        success(t("nutImportOriginalsAttached", { count: attached }));
      else
        fail(
          t("nutImportOriginalsPartial", {
            attached,
            total: attach.length + skipped.length,
          }),
        );
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const activeDiet = state.diets.find((diet) => diet.active);
  const dirty = draft ? isDraftDirty(baseline, draft) : false;

  return (
    <PageContainer>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-soft)] pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 font-serif text-3xl font-semibold text-[var(--text-1)]">
              {t("nutDietTitle")}
            </h1>
            {activeDiet ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-text)]">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                {t("nutPlanInProgress")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[var(--text-3)]">{t("nutDietDescription")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {activeDiet?.status === "verified" ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-dim)] px-3 py-2 text-xs text-[var(--accent-text)]">
              <Icon size={15}>{icons.shield}</Icon>
              {t("nutVerifiedOriginal")}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-1)] px-3 py-2 text-xs text-[var(--text-1)] transition-colors hover:bg-[var(--bg-2)]"
          >
            <Icon size={15}>{icons.download}</Icon>
            {t("nutExportPdf")}
          </button>
        </div>
      </header>
      <FeedbackBanner feedback={feedback} onDismiss={clear} />

      <DietImportCard disabled={busy || (!!draft && dirty)} onImported={startImportedDraft} />

      {draft && (
        <section className="mb-6 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-1)]/60">
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              await saveDraft(draft);
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] p-5 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--bg-2)] text-[var(--text-2)]">
                  <Icon size={18}>{icons.edit}</Icon>
                </span>
                <div className="min-w-0">
                  <h2 className="m-0 text-base font-semibold text-[var(--text-1)]">
                    {state.diets.some((diet) => diet.id === draft.id) ? t("nutEditDiet") : t("nutNewDiet")}
                  </h2>
                  <p className="m-0 text-[13px] text-[var(--text-3)]">{t("nutEditDietDescription")}</p>
                </div>
              </div>
              {dirty ? (
                <p className="m-0 flex items-center gap-2 text-[13px] text-[var(--text-3)]">
                  {t("nutDraftStatus")}
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--gold)]/40 bg-[var(--gold-dim)] px-2.5 py-1 text-xs font-medium text-[var(--gold-text)]">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--gold-text)]" />
                    {t("nutPendingChanges")}
                  </span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              {imported && imported.dietId === draft.id && (
                <div className="flex flex-col gap-2">
                  <Banner tone="info" className="">
                    {t("nutImportReviewNotice")}
                  </Banner>
                  {imported.warnings.length > 0 && (
                    <Banner tone="warning" className="">
                      <strong>{t("nutImportWarningsTitle")}</strong>
                      <ul className="m-0 mt-1 list-disc space-y-1 pl-5">
                        {imported.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </Banner>
                  )}
                  {imported.unmapped.length > 0 && (
                    <Banner tone="info" className="">
                      <strong>{t("nutImportUnmappedTitle")}</strong>
                      <ul className="m-0 mt-1 list-disc space-y-1 pl-5">
                        {imported.unmapped.map((note, index) => (
                          <li key={index}>{note}</li>
                        ))}
                      </ul>
                    </Banner>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr_1fr]">
                <TextField
                  label={t("nutPlanTitle")}
                  required
                  maxLength={120}
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  placeholder={t("nutPhDietTitle")}
                />
                <TextField
                  label={t("nutStartDate")}
                  type="date"
                  required
                  className="[&_input]:font-mono"
                  value={draft.startDate}
                  onChange={(event) => setDraft({ ...draft, startDate: event.target.value })}
                  placeholder={t("nutPhDate")}
                />
                <TextField
                  label={
                    <span className="flex items-baseline justify-between gap-2">
                      {t("nutEndDate")}
                      <span className="text-xs font-normal text-[var(--text-3)]">{t("nutOptionalTag")}</span>
                    </span>
                  }
                  type="date"
                  className="[&_input]:font-mono"
                  value={draft.endDate ?? ""}
                  onChange={(event) => setDraft({ ...draft, endDate: event.target.value || null })}
                  placeholder={t("nutPhDate")}
                />
              </div>
              <h3 className="m-0 mt-1 font-mono text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-2)]">
                {t("nutScheduledMeals")}
              </h3>
              <DietMealTabs
                key={draft.id}
                meals={draft.meals}
                recipes={state.recipes}
                onEditMeal={editMeal}
              />
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-soft)] pt-5 print:hidden">
                <p className="m-0 flex min-w-0 flex-1 basis-72 items-start gap-2.5 text-[13px] text-[var(--text-3)]">
                  <span className="mt-0.5 text-[var(--gold-text)]">
                    <Icon size={18}>{icons.warning}</Icon>
                  </span>
                  {t("nutVerificationResetNote")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="!rounded-xl"
                    onClick={closeDraft}
                    disabled={busy}
                  >
                    {t("cancel")}
                  </Button>
                  <Button type="submit" className="!rounded-xl" loading={busy}>
                    {t("nutSaveDraft")}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </section>
      )}

      {!state.diets.length && !draft && (
        <Card>
          <EmptyState
            icon={<Icon size={22}>{icons.leaf}</Icon>}
            title={t("nutStartWithOriginalTitle")}
            description={t("nutStartWithOriginalDescription")}
          />
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {state.diets.map((diet) => (
          <Card key={diet.id}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 flex-1 font-serif text-lg font-semibold text-[var(--text-1)]">
                  {diet.title}
                </h2>
                <Badge variant={diet.active ? "success" : DIET_STATUS_VARIANT[diet.status]}>
                  {diet.active ? t("active") : statusLabel(diet.status)}
                </Badge>
              </div>
              <p className="text-sm text-[var(--text-3)]">
                {diet.startDate} → {diet.endDate ?? t("nutNoEndDate")}
              </p>
              <div className="flex flex-wrap gap-2">
                {diet.meals.map((meal) => (
                  <Badge key={meal.id} ring>
                    {t("nutOptionsCount", { meal: mealLabel(meal.type), count: meal.options.length })}
                  </Badge>
                ))}
              </div>
              <details className="text-sm text-[var(--text-2)]">
                <summary className="cursor-pointer font-medium text-[var(--text-1)]">
                  {t("nutViewExactPortions")}
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  {diet.meals.map((meal) => (
                    <div key={meal.id}>
                      <h3 className="text-sm font-semibold text-[var(--text-1)]">
                        {mealLabel(meal.type)}
                      </h3>
                      {meal.options.map((option) => (
                        <div key={option.id} className="mt-2">
                          <strong className="text-[var(--text-1)]">{option.title}</strong>
                          <ul className="m-0 mt-1 list-disc space-y-1 pl-5">
                            {option.portions.map((portion) => (
                              <li key={portion.id}>
                                {portion.foodName}:{" "}
                                {portion.free
                                  ? t("nutExplicitlyFree")
                                  : portion.quantity === null
                                    ? t("nutQuantityNotVerified")
                                    : `${formatQuantity(portion.quantity)} ${portion.unit}`}{" "}
                                {portion.preparation}
                              </li>
                            ))}
                          </ul>
                          {option.notes && (
                            <p className="mt-1 text-[var(--text-3)]">{option.notes}</p>
                          )}
                          {diet.active && (
                            <Link
                              href={`/nutrition/recipes?option=${option.id}#ai-dishes`}
                              className="mt-1 inline-flex items-center gap-1.5 font-medium text-[var(--accent-text)] hover:underline"
                            >
                              <Icon size={15}>{icons.leaf}</Icon>
                              {t("nutSuggestIdeas")}
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </details>

              <form
                className="flex flex-wrap items-end gap-3 print:hidden"
                onSubmit={(event) => {
                  event.preventDefault();
                  void uploadOriginal(event.currentTarget, diet.id);
                }}
              >
                <Field label={t("nutOriginalFile")} className="min-w-[220px] flex-1">
                  {(id) => (
                    <FileInput id={id} name="file" accept=".jpg,.jpeg,.png,.pdf" required />
                  )}
                </Field>
                <Button type="submit" variant="outline" loading={busy}>
                  <Icon size={16}>{icons.upload}</Icon>
                  {t("nutRetainOriginal")}
                </Button>
              </form>

              {state.files
                .filter((file) => file.dietId === diet.id)
                .map((file) => (
                  <a
                    key={file.id}
                    href={`/api/nutrition/diet-files/${file.id}`}
                    className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--accent-text)] hover:underline"
                  >
                    <Icon size={16}>{icons.file}</Icon>
                    <span className="min-w-0 break-words">
                      {t("nutDownloadOriginal", { name: file.name })}
                    </span>
                  </a>
                ))}

              <Checkbox
                className="print:hidden"
                checked={!!acknowledged[diet.id]}
                onChange={(event) =>
                  setAcknowledged({ ...acknowledged, [diet.id]: event.target.checked })
                }
              >
                {t("nutAcknowledgeCheck")}
              </Checkbox>
              <div className="flex flex-wrap gap-2 print:hidden">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => openDraft(structuredClone(diet), structuredClone(diet))}
                >
                  {t("edit")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || !acknowledged[diet.id]}
                  onClick={() => void run(() => verifyDietAction(diet.id, !!acknowledged[diet.id]))}
                >
                  {t("nutVerifyTranscription")}
                </Button>
                <Button
                  type="button"
                  disabled={busy || diet.status !== "verified" || diet.active}
                  onClick={() => void run(() => activateDietAction(diet.id))}
                >
                  {t("nutActivateDiet")}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
