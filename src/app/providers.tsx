"use client";

import { PropsWithChildren, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import enUS from "antd/locale/en_US";
import esES from "antd/locale/es_ES";
import { antdSharedTheme } from "@/lib/antdTheme";
import { LocaleProvider, useLocale } from "@/i18n/LocaleProvider";
import { SessionRenewalProvider } from "./SessionRenewalProvider";

function LocalizedProviders({ children, queryClient }: PropsWithChildren<{ queryClient: QueryClient }>) {
  const { locale } = useLocale();

  return (
    <ConfigProvider theme={antdSharedTheme} locale={locale === "es" ? esES : enUS}>
      <QueryClientProvider client={queryClient}>
        <SessionRenewalProvider>{children}</SessionRenewalProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

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
    <LocaleProvider>
      <LocalizedProviders queryClient={queryClient}>{children}</LocalizedProviders>
    </LocaleProvider>
  );
}
