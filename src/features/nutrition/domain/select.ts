/** antd only shows a Select placeholder when the value is undefined, not for "". */
export function selectValue(value: string | null | undefined): string | undefined {
  return value ? value : undefined;
}
