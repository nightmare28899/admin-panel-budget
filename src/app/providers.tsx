"use client";

import { PropsWithChildren, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { antdSharedTheme } from "@/lib/antdTheme";
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
    <ConfigProvider theme={antdSharedTheme}>
      <QueryClientProvider client={queryClient}>
        <SessionRenewalProvider>{children}</SessionRenewalProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
