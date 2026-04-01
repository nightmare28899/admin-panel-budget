"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import {
  SessionRenewalRequiredError,
  useSessionRenewal,
} from "@/app/SessionRenewalProvider";

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
    throw new Error(payload.error || "Failed to load users");
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
    throw new Error(payload?.error || "Failed to send test notification");
  }

  return {
    message: payload?.message || "Notification request processed",
    tokenCount: Number(payload?.tokenCount || 0),
    successCount: Number(payload?.successCount || 0),
    failureCount: Number(payload?.failureCount || 0),
    invalidTokensRemoved: Number(payload?.invalidTokensRemoved || 0),
  };
}

export default function NotificationsConsole() {
  const { runRequest } = useSessionRenewal();
  const [form] = Form.useForm<SendPushPayload>();
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin", "notification-users"],
    queryFn: () => runRequest(fetchUsers),
  });

  const sendMutation = useMutation({
    mutationFn: (values: SendPushPayload) => runRequest(() => sendTestPush(values)),
    onSuccess: (payload) => {
      setResult({
        type: "success",
        message: `${payload.message} Accepted: ${payload.successCount}/${payload.tokenCount}.`,
      });
      form.setFieldsValue({
        title: "Test notification",
        body: "This push came from the admin panel.",
      });
    },
    onError: (error) => {
      setResult({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to send test push",
      });
    },
  });

  const userOptions = (usersQuery.data || [])
    .filter((user) => user.isActive !== false)
    .map((user) => ({
      value: user.id,
      label: `${user.name || "Unnamed user"} (${user.email})`,
    }));

  return (
    <Space orientation="vertical" size={24} className="flex w-full">
      <div className="space-y-2">
        <Typography.Title level={2} style={{ margin: 0, color: "#F8FAFC" }}>
          Push Notifications
        </Typography.Title>
        <Typography.Paragraph style={{ margin: 0, color: "#94A3B8" }}>
          Send a test push from the admin panel to a mobile user with a
          registered device token.
        </Typography.Paragraph>
      </div>

      <Card className="border border-slate-800/80 bg-slate-950/80">
        <Space orientation="vertical" size={16} className="flex w-full">
          <Alert
            type="info"
            showIcon
            title="How this works"
            description="The selected user must have opened the mobile app, granted notification permission, and registered an FCM device token first."
          />

          {result ? (
            <Alert
              type={result.type}
              showIcon
              title={result.type === "success" ? "Push processed" : "Push failed"}
              description={result.message}
            />
          ) : null}

          {usersQuery.error ? (
            <Alert
              type="error"
              showIcon
              title="Could not load users"
              description={
                usersQuery.error instanceof Error
                  ? usersQuery.error.message
                  : "Unknown error"
              }
              action={
                <Button size="small" onClick={() => usersQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : null}

          {usersQuery.isLoading ? (
            <div className="flex min-h-40 items-center justify-center">
              <Spin size="large" />
            </div>
          ) : (
            <Form<SendPushPayload>
              form={form}
              layout="vertical"
              initialValues={{
                title: "Test notification",
                body: "This push came from the admin panel.",
              }}
              onFinish={(values) => {
                setResult(null);
                sendMutation.mutate(values);
              }}
            >
              <Form.Item
                name="userId"
                label="Target user"
                rules={[{ required: true, message: "Select a target user" }]}
              >
                <Select
                  showSearch
                  placeholder="Select a mobile user"
                  optionFilterProp="label"
                  options={userOptions}
                />
              </Form.Item>

              <Form.Item
                name="title"
                label="Notification title"
                rules={[{ required: true, message: "Enter a notification title" }]}
              >
                <Input maxLength={120} />
              </Form.Item>

              <Form.Item
                name="body"
                label="Notification body"
                rules={[{ required: true, message: "Enter a notification body" }]}
              >
                <Input.TextArea rows={4} maxLength={240} showCount />
              </Form.Item>

              <Space size={12}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={sendMutation.isPending}
                >
                  Send test push
                </Button>
                <Button
                  onClick={() => {
                    form.resetFields();
                    setResult(null);
                  }}
                >
                  Reset
                </Button>
              </Space>
            </Form>
          )}
        </Space>
      </Card>
    </Space>
  );
}
