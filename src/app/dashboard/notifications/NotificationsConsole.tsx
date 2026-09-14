"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Card,
  Form,
  Input,
  Select,
  Space,
  Typography,
} from "antd";
import {
  SessionRenewalRequiredError,
  useSessionRenewal,
} from "@/app/SessionRenewalProvider";
import { FormSkeleton } from "@/components/ui/ContentSkeleton";
import { Button } from "@/components/ui/Button";
import { useLocale } from "@/i18n/LocaleProvider";
import { frontendError } from "@/i18n/errors";

type UserOption = {
  id: string;
  name: string;
  email: string;
  isActive?: boolean;
};

type SendPushPayload = {
  userId: string;
  title: string;
  body: string;
};

type SendPushResult = {
  message: string;
  tokenCount: number;
  successCount: number;
  failureCount: number;
  invalidTokensRemoved: number;
  failureReasons?: Record<string, number>;
};

async function fetchUsers(): Promise<UserOption[]> {
  const response = await fetch("/api/admin/users?includeDisabled=false", {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json()) as {
    error?: string;
    users?: UserOption[];
    requiresSessionRenewal?: boolean;
  };

  if (response.status === 401 && payload?.requiresSessionRenewal) {
    throw new SessionRenewalRequiredError(payload.error);
  }

  if (!response.ok) {
    // "failedLoadUsers" is a stable i18n message key (see
    // src/i18n/messages.ts) — this function runs outside React and can't
    // call t() itself, so the UI resolves it via frontendError()/t().
    throw new Error(payload.error || "failedLoadUsers");
  }

  return Array.isArray(payload.users) ? payload.users : [];
}

async function sendTestPush(
  values: SendPushPayload,
): Promise<SendPushResult> {
  const response = await fetch("/api/admin/notifications/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(values),
  });
  const payload = (await response.json()) as
    | ({ error?: string; requiresSessionRenewal?: boolean } & Partial<SendPushResult>)
    | undefined;

  if (response.status === 401 && payload?.requiresSessionRenewal) {
    throw new SessionRenewalRequiredError(payload.error);
  }

  if (!response.ok) {
    // Both fallbacks below are stable i18n message keys (see
    // src/i18n/messages.ts) — this function runs outside React and can't
    // call t() itself, so the UI resolves them via frontendError()/t().
    throw new Error(payload?.error || "failedSendTestNotification");
  }

  return {
    message: payload?.message || "notificationRequestProcessed",
    tokenCount: Number(payload?.tokenCount || 0),
    successCount: Number(payload?.successCount || 0),
    failureCount: Number(payload?.failureCount || 0),
    invalidTokensRemoved: Number(payload?.invalidTokensRemoved || 0),
    failureReasons:
      payload?.failureReasons && typeof payload.failureReasons === "object"
        ? payload.failureReasons
        : {},
  };
}

export default function NotificationsConsole() {
  const { runRequest } = useSessionRenewal();
  const { t } = useLocale();
  const [form] = Form.useForm<SendPushPayload>();
  const [result, setResult] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin", "notification-users"],
    queryFn: () => runRequest(fetchUsers),
  });

  const sendMutation = useMutation({
    mutationFn: (values: SendPushPayload) => runRequest(() => sendTestPush(values)),
    onSuccess: (payload) => {
      const failures = Object.entries(payload.failureReasons || {})
        .map(([code, count]) => `${code} (${count})`)
        .join(", ");
      const hasNoDelivery = payload.tokenCount > 0 && payload.successCount === 0;
      const hasNoRegisteredDevice = payload.tokenCount === 0;

      setResult({
        type: hasNoDelivery || hasNoRegisteredDevice ? "warning" : "success",
        message: [
          t("acceptedPushes", {
            message: frontendError(payload.message, t, "notificationRequestProcessed"),
            success: payload.successCount,
            total: payload.tokenCount,
          }),
          payload.failureCount > 0 && failures ? t("pushFailures", { failures }) : "",
        ]
          .filter(Boolean)
          .join(" "),
      });
      form.setFieldsValue({
        title: t("testNotification"),
        body: t("testNotificationBody"),
      });
    },
    onError: (error) => {
      setResult({
        type: "error",
        message: frontendError(error instanceof Error ? error.message : undefined, t, "pushFailed"),
      });
    },
  });

  const userOptions = (usersQuery.data || [])
    .filter((user) => user.isActive !== false)
    .map((user) => ({
      value: user.id,
      label: `${user.name || t("unnamedUser")} (${user.email})`,
    }));

  return (
    <Space orientation="vertical" size={24} className="flex w-full">
      <div className="space-y-2">
        <Typography.Title level={2} style={{ margin: 0 }}>
          {t("pushNotifications")}
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
          {t("pushDescription")}
        </Typography.Paragraph>
      </div>

      <Card className="border border-slate-800/80 bg-slate-950/80">
        <Space orientation="vertical" size={16} className="flex w-full">
          <Alert
            type="info"
            showIcon
            title={t("howThisWorks")}
            description={t("pushHowDescription")}
          />

          {result ? (
            <Alert
              type={result.type}
              showIcon
              title={result.type === "success" ? t("pushProcessed") : t("pushFailed")}
              description={result.message}
            />
          ) : null}

          {usersQuery.error ? (
            <Alert
              type="error"
              showIcon
              title={t("couldNotLoadUsers")}
              description={frontendError(
                usersQuery.error instanceof Error ? usersQuery.error.message : undefined,
                t,
                "unknownError",
              )}
              action={
                <Button type="button" variant="outline" size="sm" onClick={() => void usersQuery.refetch()}>
                   {t("retry")}
                </Button>
              }
            />
          ) : null}

          {usersQuery.isLoading ? (
            <FormSkeleton />
          ) : (
            <Form<SendPushPayload>
              form={form}
              layout="vertical"
              initialValues={{
                title: t("testNotification"),
                body: t("testNotificationBody"),
              }}
              onFinish={(values) => {
                setResult(null);
                sendMutation.mutate(values);
              }}
            >
              <Form.Item
                name="userId"
                label={t("targetUser")}
                rules={[{ required: true, message: t("selectTargetUser") }]}
              >
                <Select
                  showSearch
                  placeholder={t("selectMobileUser")}
                  optionFilterProp="label"
                  options={userOptions}
                />
              </Form.Item>

              <Form.Item
                name="title"
                label={t("notificationTitle")}
                rules={[{ required: true, message: t("enterNotificationTitle") }]}
              >
                <Input maxLength={120} placeholder={t("testNotification")} />
              </Form.Item>

              <Form.Item
                name="body"
                label={t("notificationBody")}
                rules={[{ required: true, message: t("enterNotificationBody") }]}
              >
                <Input.TextArea rows={4} maxLength={240} showCount placeholder={t("writeNotification")} />
              </Form.Item>

              <Space size={12}>
                <Button
                  type="submit"
                  variant="primary"
                  loading={sendMutation.isPending}
                >
                  {t("sendTestPush")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    form.resetFields();
                    setResult(null);
                  }}
                >
                  {t("reset")}
                </Button>
              </Space>
            </Form>
          )}
        </Space>
      </Card>
    </Space>
  );
}
