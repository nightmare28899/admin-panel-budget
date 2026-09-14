import type { BadgeVariant } from "@/components/ui/Badge";
import type { StatementImportStatus } from "./statement-import.types";

// Labels are resolved via t() at display time (see statusLabels in
// StatementImportsView.tsx / StatementReviewView.tsx), so this only carries
// the non-text badge styling.
export const STATUS_META: Record<StatementImportStatus, { variant: BadgeVariant }> = {
  UPLOADED: { variant: "info" },
  PARSED: { variant: "info" },
  NEEDS_REVIEW: { variant: "warning" },
  CONFIRMED: { variant: "success" },
  REVERTED: { variant: "neutral" },
  FAILED: { variant: "danger" },
};
