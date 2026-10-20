"use client";

import { Alert, Empty, List, Spin, Tag } from "antd";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/i18n/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ExpenseForm } from "./ExpenseForm";
import { PurchaseCardPaymentForm } from "./PurchaseCardPaymentForm";
import { usePendingPurchases } from "./hooks/usePendingPurchases";
import { usePurchaseApproval } from "./hooks/usePurchaseApproval";
import type { DetectedPurchase } from "./interfaces/detected-purchases";
import { detectedPurchaseExpense, looksLikeCardPayment } from "./utils/detected-purchases";
import { buildPagination } from "@/lib/pagination";

const CONFIDENCE_LABELS = { HIGH: "purchaseConfidenceHigh", MEDIUM: "purchaseConfidenceMedium", LOW: "purchaseConfidenceLow" } as const;

export function PendingExpensesView() {
  const { t, formatDate, formatNumber } = useLocale();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<DetectedPurchase>();
  const [discarding, setDiscarding] = useState<DetectedPurchase>();
  const [paying, setPaying] = useState<DetectedPurchase>();
  const inbox = usePendingPurchases({ page, limit: pageSize, paused: Boolean(selected || discarding || paying) });
  const approval = usePurchaseApproval();
  const totalPages = inbox.data?.pagination.totalPages;
  useEffect(() => {
    if (totalPages !== undefined && page > Math.max(1, totalPages)) {
      const timer = window.setTimeout(() => setPage(Math.max(1, totalPages)), 0);
      return () => window.clearTimeout(timer);
    }
  }, [page, totalPages]);
  const close = () => { if (!approval.saving) { setSelected(undefined); setDiscarding(undefined); setPaying(undefined); approval.clearError(); } };
  const afterMutation = async () => {
    setSelected(undefined);
    setDiscarding(undefined);
    setPaying(undefined);
    approval.clearError();
    // approval.mutate already dispatched DETECTED_PURCHASES_CHANGED, which refreshes the list
    // (and publishes the sidebar count); refresh() is a no-op while that request is in flight.
    // No router.refresh(): nothing server-rendered depends on this list.
    await inbox.refresh();
  };
  return <div className="w-full p-4 sm:p-6">
    <section>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-[var(--text-1)]">{t("pendingPurchases")}</h2>
      <Button variant="outline" loading={inbox.refreshing} onClick={() => void inbox.refresh()}>{t("refresh")}</Button>
    </div>
    <div className="mb-4"><p className="text-sm text-[var(--text-2)]">{t("pendingPurchasesDescription")}</p><Link className="mt-2 inline-block text-sm text-[var(--accent-text)]" href="/finance/expenses">{t("expenses")}</Link></div>
    {inbox.error && <div className="mb-4"><Alert type="error" showIcon title={inbox.error} action={<Button size="sm" variant="outline" onClick={() => void inbox.refresh()}>{t("retry")}</Button>} /></div>}
    {inbox.loading ? <Spin aria-label={t("loadingList")} /> : inbox.data && <List
      bordered
      dataSource={inbox.data.purchases}
      rowKey="id"
      locale={{ emptyText: <Empty description={t("pendingPurchasesEmpty")} /> }}
      pagination={buildPagination({
        t, formatNumber, current: page, pageSize, total: inbox.data.pagination.totalCount,
        recordKeys: { one: "purchaseRecord", other: "purchaseRecords" },
        onChange: (nextPage, nextPageSize) => { setPageSize(nextPageSize); setPage(nextPage); },
      })}
      renderItem={(purchase) => <List.Item>
        <div className="w-full">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2"><h3 className="font-semibold text-[var(--text-1)]">{purchase.merchant || t("detectedPurchase")}</h3>
              <p className="text-lg text-[var(--text-1)]">{formatNumber(purchase.amountCents / 100, { style: "currency", currency: purchase.currency })}</p>
              <p className="text-sm text-[var(--text-2)]">{formatDate(purchase.occurredAtMillis, { dateStyle: "medium", timeStyle: "short" })}</p>
              <Tag>{t(CONFIDENCE_LABELS[purchase.confidence])}</Tag>{looksLikeCardPayment(purchase.merchant) && <Tag color="blue">{t("purchaseLooksLikePayment")}</Tag>}<p className="text-xs text-[var(--text-3)]">{purchase.sourcePackage}</p>
            </div>
            <div className="flex flex-wrap gap-2">{(() => {
              const payFirst = looksLikeCardPayment(purchase.merchant);
              const pay = <Button key="pay" variant={payFirst ? "primary" : "outline"} disabled={approval.saving} onClick={() => { approval.clearError(); setPaying(purchase); }}>{t("registerAsCardPayment")}</Button>;
              const accept = <Button key="accept" variant={payFirst ? "outline" : "primary"} disabled={approval.saving} onClick={() => { approval.clearError(); setSelected(purchase); void approval.loadReferences(); }}>{t("acceptPurchase")}</Button>;
              return payFirst ? [pay, accept] : [accept, pay];
            })()}<Button variant="outline" disabled={approval.saving} onClick={() => { approval.clearError(); setDiscarding(purchase); }}>{t("discardPurchase")}</Button></div>
          </div>
          {(purchase.possibleDuplicateOf || purchase.mayBeRegistered) && <div className="mt-4"><Alert type="warning" showIcon title={t("purchaseDuplicateWarning")} /></div>}
        </div>
      </List.Item>}
    />}
    </section>
    <Modal open={Boolean(selected)} onClose={close} title={t("acceptPurchase")} maxWidth="max-w-2xl">
      <div className="max-h-[75vh] overflow-y-auto pr-1">
        {(selected?.possibleDuplicateOf || selected?.mayBeRegistered) && <div className="mb-4"><Alert type="warning" showIcon title={t("purchaseDuplicateWarning")} /></div>}
        {selected && (approval.referencesLoading ? <Spin aria-label={t("loadingForm")} /> : approval.referencesError ? <Alert type="error" title={approval.referencesError} action={<Button onClick={() => void approval.loadReferences()}>{t("retry")}</Button>} /> : <ExpenseForm key={selected.id} categories={approval.categories} creditCards={approval.cards} initialValues={detectedPurchaseExpense(selected, t("detectedPurchase"))} hideReceipt submitLabel={t("acceptAndCreateExpense")} loading={approval.saving} error={approval.error} onCancel={close} onSubmit={async (expense) => { if (await approval.mutate(selected.id, expense)) await afterMutation(); }} />)}
      </div>
    </Modal>
    <Modal open={Boolean(paying)} onClose={close} title={t("registerAsCardPayment")} maxWidth="max-w-lg">
      {paying && <PurchaseCardPaymentForm key={paying.id} purchase={paying} cards={approval.cards} loading={approval.saving} error={approval.error} errorCode={approval.errorCode} onCancel={close} onSubmit={async (payload) => { if (await approval.mutateAsPayment(paying.id, payload)) await afterMutation(); }} />}
    </Modal>
    <ConfirmModal open={Boolean(discarding)} onClose={close} onConfirm={async () => { if (discarding && await approval.mutate(discarding.id)) await afterMutation(); }} title={t("discardPurchase")} description={t("discardPurchaseDescription")} confirmLabel={t("discardPurchase")} loading={approval.saving}>
      {approval.error && <Alert type="error" title={approval.error} />}
    </ConfirmModal>
  </div>;
}
