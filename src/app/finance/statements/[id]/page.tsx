import { StatementReviewView } from "@/features/finance/StatementReviewView";

export default async function FinanceStatementReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StatementReviewView statementImportId={id} />;
}
