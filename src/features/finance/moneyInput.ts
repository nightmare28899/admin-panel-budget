// Reads amounts formatted in either locale ("4.245,99", "4,245.99") or typed
// raw ("4245.99", "4245,99"). A lone separator followed by at most two digits
// is the decimal mark; anything else is grouping.
export function parseMoneyInput(text: string | undefined): number {
  const cleaned = (text ?? "").replace(/[^\d.,-]/g, "");
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  let decimalMark: "." | "," | null = null;
  if (lastDot !== -1 && lastComma !== -1) {
    decimalMark = lastDot > lastComma ? "." : ",";
  } else {
    const mark = lastDot !== -1 ? "." : lastComma !== -1 ? "," : null;
    if (mark && cleaned.split(mark).length === 2 && /^\d{1,2}$/.test(cleaned.split(mark)[1])) {
      decimalMark = mark;
    }
  }
  const normalized = decimalMark
    ? cleaned
        .split(decimalMark)
        .map((part, index, parts) =>
          index === parts.length - 1 ? part : part.replace(/[.,]/g, ""),
        )
        .join(".")
    : cleaned.replace(/[.,]/g, "");
  return Number(normalized);
}
