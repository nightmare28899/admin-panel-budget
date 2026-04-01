"use client";

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Modal, Typography } from "antd";
import { useRouter } from "next/navigation";
import { logoutAction, renewSessionAction } from "@/lib/actions";
import {
  ActionResult,
  SESSION_EXPIRED_MESSAGE,
  SessionRenewalRequiredError,
  isSessionRenewalRequiredError,
} from "@/lib/session";

type SessionRenewalContextValue = {
  runServerAction: <T>(action: () => Promise<ActionResult<T>>) => Promise<ActionResult<T>>;
  runRequest: <T>(request: () => Promise<T>) => Promise<T>;
};

const SessionRenewalContext = createContext<SessionRenewalContextValue | null>(null);

export function SessionRenewalProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(SESSION_EXPIRED_MESSAGE);
  const pendingResolverRef = useRef<((value: boolean) => void) | null>(null);
  const pendingPromptRef = useRef<Promise<boolean> | null>(null);

  const resolvePrompt = useCallback((value: boolean) => {
    const resolve = pendingResolverRef.current;
    pendingResolverRef.current = null;
    pendingPromptRef.current = null;
    setOpen(false);
    setLoading(false);
    if (resolve) {
      resolve(value);
    }
  }, []);

  const requestRenewalDecision = useCallback((nextMessage?: string) => {
    if (nextMessage) {
      setMessage(nextMessage);
    }

    if (pendingPromptRef.current) {
      return pendingPromptRef.current;
    }

    pendingPromptRef.current = new Promise<boolean>((resolve) => {
      pendingResolverRef.current = resolve;
      setOpen(true);
    });

    return pendingPromptRef.current;
  }, []);

  const closeSession = useCallback(async () => {
    setLoading(true);
    await logoutAction();
    resolvePrompt(false);
    router.replace("/login");
    router.refresh();
  }, [resolvePrompt, router]);

  const renewSession = useCallback(async () => {
    setLoading(true);
    const result = await renewSessionAction();
    if (result.success) {
      resolvePrompt(true);
      router.refresh();
      return;
    }

    await logoutAction();
    resolvePrompt(false);
    router.replace("/login");
    router.refresh();
  }, [resolvePrompt, router]);

  const runServerAction = useCallback(
    async <T,>(action: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> => {
      const result = await action();
      if (!result.requiresSessionRenewal) {
        return result;
      }

      const renewed = await requestRenewalDecision(result.error);
      if (!renewed) {
        return { error: result.error || SESSION_EXPIRED_MESSAGE };
      }

      return action();
    },
    [requestRenewalDecision],
  );

  const runRequest = useCallback(
    async <T,>(request: () => Promise<T>): Promise<T> => {
      try {
        return await request();
      } catch (error) {
        if (!isSessionRenewalRequiredError(error)) {
          throw error;
        }

        const renewed = await requestRenewalDecision(error.message);
        if (!renewed) {
          throw error;
        }

        return request();
      }
    },
    [requestRenewalDecision],
  );

  return (
    <SessionRenewalContext.Provider value={{ runRequest, runServerAction }}>
      {children}
      <Modal
        open={open}
        centered
        closable={false}
        maskClosable={false}
        keyboard={!loading}
        okText="Renew session"
        cancelText="Close session"
        okButtonProps={{ loading }}
        cancelButtonProps={{ disabled: loading }}
        onOk={renewSession}
        onCancel={closeSession}
        title="Session expired"
      >
        <Typography.Paragraph style={{ marginBottom: 0 }}>
          {message}
        </Typography.Paragraph>
      </Modal>
    </SessionRenewalContext.Provider>
  );
}

export function useSessionRenewal() {
  const context = useContext(SessionRenewalContext);
  if (!context) {
    throw new Error("useSessionRenewal must be used within SessionRenewalProvider");
  }

  return context;
}

export { SessionRenewalRequiredError };
