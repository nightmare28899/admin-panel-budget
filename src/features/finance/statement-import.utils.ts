import dayjs from "dayjs";
import type { BadgeVariant } from "@/components/ui/Badge";
import type { StatementImportStatus } from "./statement-import.types";

export const STATUS_META: Record<
  StatementImportStatus,
  { label: string; variant: BadgeVariant }
> = {
  UPLOADED: { label: "Uploaded", variant: "info" },
  PARSED: { label: "Parsed", variant: "info" },
  NEEDS_REVIEW: { label: "Ready for review", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  REVERTED: { label: "Reverted", variant: "neutral" },
  FAILED: { label: "Processing failed", variant: "danger" },
};

export function formatStatementPeriod(start?: string | null, end?: string | null) {
  if (!start || !end) return "Period pending";
  return `${dayjs(start).format("MMM D, YYYY")} – ${dayjs(end).format("MMM D, YYYY")}`;
}
