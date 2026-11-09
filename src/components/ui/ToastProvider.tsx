"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocale } from "@/i18n/LocaleProvider";
import { dismissToast, durationFor, pushToast, type ToastItem, type ToastType } from "./toastQueue";

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const toneClasses: Record<ToastType, string> = {
  error: "border-[var(--rose)]/40 text-[var(--rose)]",
  success: "border-[var(--emerald)]/40 text-[var(--emerald-text)]",
};

export function ToastProvider({ children }: PropsWithChildren) {
  const { t } = useLocale();
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => dismissToast(current, id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType) => {
      const id = nextId.current++;
      setItems((current) => pushToast(current, { message, type }, id));
      timers.current.set(id, setTimeout(() => dismiss(id), durationFor(type)));
    },
    [dismiss],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => show(message, "success"),
      error: (message) => show(message, "error"),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[1100] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role={item.type === "error" ? "alert" : "status"}
            aria-live={item.type === "error" ? "assertive" : "polite"}
            className={`animate-toast-in pointer-events-auto flex items-start gap-3 rounded-xl border bg-[var(--bg-2)] px-5 py-3 font-medium shadow-lg ${toneClasses[item.type]}`}
          >
            <span className="min-w-0 break-words">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label={t("dismiss")}
              className="shrink-0 cursor-pointer opacity-70 transition-opacity hover:opacity-100"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
