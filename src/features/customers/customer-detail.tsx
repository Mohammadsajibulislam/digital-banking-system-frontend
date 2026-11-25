"use client";

import { useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiPlus } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import StatusBadge from "@/components/ui/status-badge";
import { formatDateTime, TYPE_LABELS } from "@/features/transactions/helpers";
import { useAppSelector } from "@/store/hooks";
import { formatDate, formatMoney, getErrorMessage } from "@/lib/utils";
import type { AccountType } from "@/types/banking";
import type { UserStatus } from "@/types/customers";
import { useCreateCustomerAccountMutation, useGetCustomerQuery, useSetCustomerStatusMutation, useVerifyCustomerMutation } from "./customers-api";
import VerifiedBadge from "./verified-badge";

export default function CustomerDetail({ customerId, backHref }: { customerId: string; backHref: string }) {
  const role = useAppSelector((state) => state.auth.user?.role);
  const [verify, { isLoading: verifying }] = useVerifyCustomerMutation();
  const [changeStatus, { isLoading: changing }] = useSetCustomerStatusMutation();
  const [openAccount, { isLoading: opening }] = useCreateCustomerAccountMutation();
  const { data: customer, isLoading, isError, error } = useGetCustomerQuery(customerId);
  const [dialog, setDialog] = useState<"verify" | "status" | "account" | null>(null);
  const [statusTarget, setStatusTarget] = useState<UserStatus>("ACTIVE");
  const [reason, setReason] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("SAVINGS");
  const [dialogError, setDialogError] = useState("");
  const [toast, setToast] = useState("");
  const txnBase = role === "ADMIN" ? "/admin/transactions" : "/staff/transactions";

  const backLink = <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"><FiArrowLeft className="h-4 w-4" />Back to customers</Link>;
  if (isLoading) return <div className="mx-auto max-w-5xl space-y-4">{backLink}<div className="h-96 animate-pulse rounded-2xl bg-slate-200" /></div>;
  if (isError || !customer) return <div className="mx-auto max-w-5xl space-y-4">{backLink}<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{getErrorMessage(error)}</div></div>;

  async function handleVerify() {
    try {
      await verify(customerId).unwrap();
      setDialog(null);
      setToast("Customer information verified");
    } catch (err) {
      setDialogError(getErrorMessage(err));
    }
  }

  async function handleStatus(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (statusTarget === "BLOCKED" && reason.trim().length < 3) {
      setDialogError("Please write a reason for blocking");
      return;
    }
    try {
      await changeStatus({ id: customerId, status: statusTarget, reason: reason.trim() || undefined }).unwrap();
      setDialog(null);
      setToast(`Customer is now ${statusTarget.toLowerCase()}`);
    } catch (err) {
      setDialogError(getErrorMessage(err));
    }
  }

  function openDialog(next: "verify" | "status" | "account", status?: UserStatus) {
    setDialog(next);
    setDialogError("");
    setReason("");
    if (status) setStatusTarget(status);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {backLink}
      {toast && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{toast}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-semibold text-slate-900">{customer.name}</h1><p className="text-sm text-slate-500">{customer.email}</p></div><div className="flex gap-2"><StatusBadge status={customer.status} /><VerifiedBadge verified={customer.isVerified} /></div></div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-2 font-semibold">Profile</h2><dl className="divide-y divide-slate-100 text-sm">{[
          ["Phone", customer.phone ?? "-"], ["Address", customer.address ?? "-"], ["Joined", formatDate(customer.createdAt)],
          ["Registered by", customer.registeredByName ?? "Self"], ["Loan applications", String(customer.loanCount)],
        ].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-2.5"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium">{value}</dd></div>)}</dl></section>
        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold">Actions</h2>{!customer.isVerified && <button type="button" onClick={() => openDialog("verify")} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white">Verify information</button>}<div className="border-t border-slate-100 pt-3">{role === "ADMIN" ? <div className="flex flex-wrap gap-2">{customer.status !== "ACTIVE" && <button type="button" onClick={() => openDialog("status", "ACTIVE")} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Activate</button>}{customer.status === "ACTIVE" && <button type="button" onClick={() => openDialog("status", "INACTIVE")} className="rounded-lg border px-4 py-2 text-sm">Deactivate</button>}{customer.status !== "BLOCKED" && <button type="button" onClick={() => openDialog("status", "BLOCKED")} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">Block</button>}</div> : <p className="text-sm text-slate-500">Status changes are handled by an admin.</p>}</div></section>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Accounts ({customer.accounts.length})</h2><button type="button" disabled={customer.status !== "ACTIVE"} onClick={() => openDialog("account")} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><FiPlus className="h-4 w-4" />Open account</button></div>{customer.accounts.length === 0 ? <p className="p-5 text-sm text-slate-500">No accounts yet.</p> : <ul className="divide-y divide-slate-100">{customer.accounts.map((account) => <li key={account.id} className="flex items-center justify-between px-5 py-4"><div><p className="font-medium">{account.accountNumber} <span className="text-slate-500">({account.type.toLowerCase()})</span></p></div><div className="flex items-center gap-3"><StatusBadge status={account.status} /><strong>{formatMoney(account.balance)}</strong></div></li>)}</ul>}</section>
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold">Recent transactions</h2></div>{customer.recentTransactions.length === 0 ? <p className="p-5 text-sm text-slate-500">No transactions yet.</p> : <ul className="divide-y divide-slate-100">{customer.recentTransactions.map((txn) => <li key={txn.id} className="flex items-center justify-between px-5 py-3"><div><Link href={`${txnBase}/${txn.txnId}`} className="text-sm font-medium text-blue-700 hover:underline">{txn.txnId}</Link><p className="text-xs text-slate-500">{TYPE_LABELS[txn.type] ?? txn.type} | {formatDateTime(txn.createdAt)}</p></div><strong className={txn.direction === "CREDIT" ? "text-emerald-600" : "text-rose-600"}>{txn.direction === "CREDIT" ? "+" : "-"}{formatMoney(txn.amount)}</strong></li>)}</ul>}</section>
      <Modal open={dialog !== null} title={dialog === "verify" ? "Verify customer" : dialog === "account" ? "Open account" : "Change customer status"} onClose={() => setDialog(null)}>
        {dialog === "verify" && <div className="space-y-4"><p className="text-sm text-slate-600">Confirm that you checked this customer&apos;s identity information.</p>{dialogError && <p className="text-sm text-red-600">{dialogError}</p>}<button type="button" onClick={handleVerify} disabled={verifying} className="w-full rounded-lg bg-blue-700 py-2.5 text-sm text-white">{verifying ? "Verifying..." : "Confirm verification"}</button></div>}
        {dialog === "status" && <form onSubmit={handleStatus} className="space-y-4"><textarea rows={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={statusTarget === "BLOCKED" ? "Reason for blocking (required)" : "Reason (optional)"} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />{dialogError && <p className="text-sm text-red-600">{dialogError}</p>}<button type="submit" disabled={changing} className="w-full rounded-lg bg-red-600 py-2.5 text-sm text-white">{changing ? "Please wait..." : "Confirm"}</button></form>}
        {dialog === "account" && <form onSubmit={async (e) => { e.preventDefault(); try { await openAccount({ customerId, type: accountType }).unwrap(); setDialog(null); setToast("New account opened"); } catch (err) { setDialogError(getErrorMessage(err)); } }} className="space-y-4"><select value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="SAVINGS">Savings</option><option value="CURRENT">Current</option><option value="BUSINESS">Business</option></select>{dialogError && <p className="text-sm text-red-600">{dialogError}</p>}<button type="submit" disabled={opening} className="w-full rounded-lg bg-blue-700 py-2.5 text-sm text-white">{opening ? "Opening..." : "Open account"}</button></form>}
      </Modal>
    </div>
  );
}
