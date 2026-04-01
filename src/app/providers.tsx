"use client";

import { PropsWithChildren, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, theme } from "antd";
import { SessionRenewalProvider } from "./SessionRenewalProvider";

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#6366F1",
          borderRadius: 16,
          colorBgBase: "#020617",
          colorTextBase: "#E2E8F0",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <SessionRenewalProvider>{children}</SessionRenewalProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
