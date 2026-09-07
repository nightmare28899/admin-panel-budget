import { redirect } from "next/navigation";
import { getUserToken } from "@/lib/userSession";
import { FinanceWorkspace } from "@/features/finance/FinanceWorkspace";

export default async function FinancePage() {
  const token = await getUserToken();
  if (!token) redirect("/user-login");
  return <FinanceWorkspace />;
}
