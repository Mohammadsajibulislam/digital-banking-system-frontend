"use client";

import { useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiDownload } from "react-icons/fi";
import StatusBadge from "@/components/ui/status-badge";
import { useAppSelector } from "@/store/hooks";
import { downloadReceipt } from "@/lib/receipt";
import { formatMoney, getErrorMessage } from "@/lib/utils";
import { TYPE_LABELS, formatDateTime } from "./helpers";
import { useGetTransactionQuery } from "./transactions-api";
import TransactionFlagPanel from "@/features/flags/transaction-flag-panel";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-4 py-3"><dt className="text-sm text-slate-500">{label}</dt><dd className="text-right text-sm font-medium text-slate-900">{value}</dd></div>;
}

export default function TransactionDetail({ txnId, backHref }: { txnId: string; backHref: string }) {
  const role = useAppSelector((state) => state.auth.user?.role);
  const isCustomer = role === "CUSTOMER";
  const { data: tx, isLoading, isError, error } = useGetTransactionQuery(txnId);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  async function handleDownload() {
    if (!tx) return;
    setDownloading(true);
    setDownloadError("");
    try { await downloadReceipt(tx); } catch { setDownloadError("Could not generate the receipt. Please try again."); } finally { setDownloading(false); }
  }

  const backLink = <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"><FiArrowLeft className="h-4 w-4" />Back to transactions</Link>;
  if (isLoading) return <div className="mx-auto max-w-2xl space-y-4">{backLink}<div className="h-96 animate-pulse rounded-2xl bg-slate-200" /></div>;
  if (isError || !tx) return <div className="mx-auto max-w-2xl space-y-4">{backLink}<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{getErrorMessage(error)}</div></div>;

  const credit = tx.direction === "CREDIT";
  const total = (Number(tx.amount) + Number(tx.fee)).toFixed(2);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {backLink}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-6 text-center"><p className="text-sm text-slate-500">{TYPE_LABELS[tx.type] ?? tx.type}</p><p className={`mt-1 text-3xl font-semibold ${isCustomer ? (credit ? "text-emerald-600" : "text-rose-600") : "text-slate-900"}`}>{isCustomer ? (credit ? "+" : "-") : ""}{formatMoney(tx.amount)}</p><div className="mt-3"><StatusBadge status={tx.status} /></div></div>
        <dl className="divide-y divide-slate-100 px-6">
          <Row label="Transaction ID" value={tx.txnId} /><Row label="Date and time" value={formatDateTime(tx.createdAt)} />
          <Row label="From" value={tx.fromAccountNumber ? `${tx.fromName ?? ""} (${tx.fromAccountNumber})` : "Bank"} />
          <Row label="To" value={tx.toAccountNumber ? `${tx.toName ?? ""} (${tx.toAccountNumber})` : "Bank"} />
          <Row label="Amount" value={formatMoney(tx.amount)} /><Row label="Fee" value={formatMoney(tx.fee)} /><Row label="Total" value={formatMoney(total)} />
          {tx.description && <Row label="Description" value={tx.description} />}{tx.failureReason && <Row label="Failure reason" value={<span className="text-red-600">{tx.failureReason}</span>} />}
        </dl>
        {tx.ledger.length > 0 && <div className="border-t border-slate-100 p-6"><h2 className="mb-3 text-sm font-semibold text-slate-900">Account impact</h2><ul className="space-y-2">{tx.ledger.map((line) => <li key={line.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm"><span className="text-slate-600">Account {line.accountNumber} <span className={line.direction === "CREDIT" ? "text-emerald-600" : "text-rose-600"}>({line.direction === "CREDIT" ? "+" : "-"}{formatMoney(line.amount)})</span></span><span className="font-medium text-slate-900">Balance: {formatMoney(line.balanceAfter)}</span></li>)}</ul></div>}
        {!isCustomer && <TransactionFlagPanel txnId={tx.txnId} />}
        <div className="border-t border-slate-100 p-6">{downloadError && <p role="alert" className="mb-3 text-sm text-red-600">{downloadError}</p>}<button type="button" onClick={handleDownload} disabled={downloading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-2.5 font-medium text-white hover:bg-blue-800 disabled:opacity-60"><FiDownload className="h-4 w-4" />{downloading ? "Preparing receipt..." : "Download receipt (PDF)"}</button></div>
      </div>
    </div>
  );
}
