import { describe, expect, it, vi } from "vitest";
import { buildPagination, clampPage, DEFAULT_PAGE_SIZE_OPTIONS } from "./pagination";

const t = (key: string, values?: Record<string, string | number>) =>
  values ? `${key}:${Object.values(values).join("|")}` : key;
const formatNumber = (value: number) => `#${value}`;
const base = { t: t as never, formatNumber, recordKeys: { one: "record", other: "records" } as const };

describe("clampPage", () => {
  it("keeps the page inside 1..lastPage", () => {
    expect(clampPage(5, 25, 10)).toBe(3);
    expect(clampPage(0, 25, 10)).toBe(1);
    expect(clampPage(2, 0, 10)).toBe(1);
  });
});

describe("buildPagination", () => {
  it("matches the Categories pagination look", () => {
    const config = buildPagination({ ...base, current: 2, pageSize: 10, total: 35, onChange: vi.fn() });
    expect(config).toMatchObject({
      current: 2, pageSize: 10, total: 35, responsive: true, showLessItems: true,
      pageSizeOptions: DEFAULT_PAGE_SIZE_OPTIONS, className: "flex-wrap gap-y-2",
    });
    expect(DEFAULT_PAGE_SIZE_OPTIONS).toEqual([10, 20, 50]);
    expect(config.showSizeChanger).toEqual({
      "aria-label": "rowsPerPage",
      options: [10, 20, 50].map((value) => ({ value, label: `rowsPerPageOption:#${value}` })),
    });
  });

  it("formats the total with singular/plural nouns", () => {
    const config = buildPagination({ ...base, current: 1, pageSize: 10, onChange: vi.fn() });
    const show = config.showTotal as (total: number, range: [number, number]) => string;
    expect(show(35, [11, 20])).toBe("showingRecords:#11|#20|#35|records");
    expect(show(1, [1, 1])).toBe("showingRecords:#1|#1|#1|record");
  });

  it("can hide the size changer", () => {
    expect(buildPagination({ ...base, current: 1, pageSize: 20, sizeChanger: false, onChange: vi.fn() }).showSizeChanger).toBe(false);
  });

  it("resets to page 1 when the page size changes", () => {
    const onChange = vi.fn();
    const config = buildPagination({ ...base, current: 3, pageSize: 10, onChange });
    config.onChange?.(3, 20);
    expect(onChange).toHaveBeenLastCalledWith(1, 20);
    config.onChange?.(4, 10);
    expect(onChange).toHaveBeenLastCalledWith(4, 10);
  });
});
