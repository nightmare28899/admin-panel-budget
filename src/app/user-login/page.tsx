"use client";

import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { userGoogleLoginAction, userLoginAction } from "@/lib/userActions";
import { signInWithGoogle } from "@/lib/googleAuth";

export default function UserLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function submit(values: { email: string; password: string }) {
    setError(null); setLoading(true);
    const result = await userLoginAction(values.email.trim(), values.password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    router.push("/finance");
  }

  async function googleLogin() {
    setError(null); setGoogleLoading(true);
    try {
      const token = await signInWithGoogle();
      const result = await userGoogleLoginAction(token);
      if (result.error) setError(result.error); else router.push("/finance");
    } catch (reason) {
      const code = typeof reason === "object" && reason !== null && "code" in reason ? String(reason.code) : "";
      setError(code.includes("popup-closed") || code.includes("cancelled") ? "Google sign-in was cancelled." : reason instanceof Error ? reason.message : "Google sign-in failed.");
    } finally { setGoogleLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
    <Card className="w-full max-w-md" title="Personal finance" bordered={false}>
      <Typography.Paragraph type="secondary">Sign in with an existing Budget account.</Typography.Paragraph>
      {error && <Alert className="mb-4" type="error" showIcon message={error} role="alert" />}
      <Form layout="vertical" onFinish={submit} requiredMark="optional">
        <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}><Input autoComplete="email" /></Form.Item>
        <Form.Item label="Password" name="password" rules={[{ required: true }]}><Input.Password autoComplete="current-password" /></Form.Item>
        <Button type="primary" htmlType="submit" block loading={loading}>Sign in</Button>
      </Form>
      <div className="my-4 text-center text-slate-500">or</div>
      <Button block onClick={googleLogin} loading={googleLoading} aria-label="Continue with Google">Continue with Google</Button>
    </Card>
  </main>;
}
