export type ToastType = "success" | "error";

export function Toast({ message, type }: { message: string; type: ToastType }) {
  return (
    <div
      className={`animate-toast-in fixed bottom-4 right-4 z-50 rounded-xl border bg-[var(--bg-2)] px-6 py-3 font-medium shadow-lg ${
        type === "error"
          ? "border-[var(--rose)]/40 text-[var(--rose)]"
          : "border-[var(--emerald)]/40 text-[var(--emerald-text)]"
      }`}
    >
      {message}
    </div>
  );
}
