import type { PaginationProps } from "antd";
import type { MessageKey } from "@/i18n/messages";

export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50];

type Translate = (key: MessageKey, values?: Record<string, string | number>) => string;

type BuildPaginationInput = {
  t: Translate;
  formatNumber: (value: number) => string;
  current: number;
  pageSize: number;
  total?: number;
  /** Message keys for the singular / plural record noun shown in "Showing x-y of z". */
  recordKeys: { one: MessageKey; other: MessageKey };
  pageSizeOptions?: number[];
  sizeChanger?: boolean;
  onChange: (page: number, pageSize: number) => void;
};

export function clampPage(page: number, total: number, pageSize: number) {
  return Math.min(Math.max(1, page), Math.max(1, Math.ceil(total / pageSize)));
}

/** Antd pagination props shared by every list so all modules look like Categories. */
export function buildPagination({
  t, formatNumber, current, pageSize, total, recordKeys,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS, sizeChanger = true, onChange,
}: BuildPaginationInput): PaginationProps {
  return {
    current,
    pageSize,
    ...(total === undefined ? {} : { total }),
    pageSizeOptions,
    responsive: true,
    showLessItems: true,
    showSizeChanger: sizeChanger
      ? {
          "aria-label": t("rowsPerPage"),
          options: pageSizeOptions.map((size) => ({ value: size, label: t("rowsPerPageOption", { count: formatNumber(size) }) })),
        }
      : false,
    showTotal: (count, [start, end]) => t("showingRecords", {
      start: formatNumber(start), end: formatNumber(end), total: formatNumber(count),
      records: t(count === 1 ? recordKeys.one : recordKeys.other),
    }),
    className: "flex-wrap gap-y-2",
    onChange: (nextPage, nextPageSize) => onChange(nextPageSize !== pageSize ? 1 : nextPage, nextPageSize),
  };
}
