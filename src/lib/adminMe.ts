import { cache } from "react";
import { api } from "@/lib/api";

/** Server-render helper: the dashboard layout and its pages share one /me request per render. */
export const getAdminMe = cache((token: string) => api.getMe(token));
