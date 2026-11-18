/**
 * Splits an already-localized amount ("6,753.37" / "6.753,37") into its whole
 * part and a trailing 1-2 digit decimal part (separator included) so the
 * decimals can be dimmed. Values without decimals stay whole.
 */
export function splitFormattedAmount(text: string): { whole: string; decimals: string } {
  const match = /^(.*\d)([.,]\d{1,2})$/.exec(text);
  return match ? { whole: match[1], decimals: match[2] } : { whole: text, decimals: "" };
}
