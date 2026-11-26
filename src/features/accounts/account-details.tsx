"use client";

import { useState } from "react";
import { FiCheck, FiCopy, FiDownload } from "react-icons/fi";
import StatusBadge from "@/components/ui/status-badge";
import { formatDate, formatMoney, getErrorMessage } from "@/lib/utils";
import type { AccountDetailDTO, AccountLimitDTO } from "@/types/account-details";
import { useGetAccountDetailsQuery } from "./accounts-api";

const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600";
const localDate = (date: Date) => date.toLocaleDateString("en-CA");

function LimitItem({ label, limit }: { label: string; limit: AccountLimitDTO }) {
  return <div><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 text-sm font-medium text-slate-900">{formatMoney(limit.value)}</dd><p className="text-xs text-slate-400">{limit.isCustom ? "Set by the bank for this account" : "Bank default"}</p></div>;
}

function StatementDownload({ account }: { account: AccountDetailDTO }) {
  const [from, setFrom] = useState(() => localDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(() => localDate(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setError("");
    if (!from || !to) return setError("Choose both dates");
    if (from > to) return setError("From date must be before To date");
    setBusy(true);
    try {
      const res = await fetch(`/api/accounts/${account.id}/statement?from=${from}&to=${to}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not download the statement");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `statement-${account.accountNumber}-${from}-${to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-slate-100 p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Account statement (CSV)</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label htmlFor={`from-${account.id}`} className="mb-1 block text-xs font-medium text-slate-500">From</label><input id={`from-${account.id}`} type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={fieldClass} /></div>
        <div><label htmlFor={`to-${account.id}`} className="mb-1 block text-xs font-medium text-slate-500">To</label><input id={`to-${account.id}`} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={fieldClass} /></div>
        <div className="flex items-end"><button type="button" onClick={handleDownload} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"><FiDownload className="h-4 w-4" />{busy ? "Preparing..." : "Download"}</button></div>
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-500">Includes opening balance, every debit and credit with running balance, and closing balance. Up to 366 days at a time.</p>
    </div>
  );
}

function AccountCard({ account }: { account: AccountDetailDTO }) {
  const [copied, setCopied] = useState(false);
  async function copyNumber() {
    try {
      await navigator.clipboard.writeText(account.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-sm font-medium capitalize text-slate-500">{account.type.toLowerCase()} account</p><div className="mt-1 flex items-center gap-2"><p className="text-xl font-semibold tracking-wide text-slate-900">{account.accountNumber}</p><button type="button" onClick={copyNumber} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Copy account number">{copied ? <FiCheck className="h-4 w-4 text-emerald-600" /> : <FiCopy className="h-4 w-4" />}</button></div><p className="mt-1 text-xs text-slate-500">Opened {formatDate(account.createdAt)}</p></div>
        <div className="sm:text-right"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Available balance</p><p className="mt-1 text-2xl font-semibold text-slate-900">{formatMoney(account.balance)}</p><div className="mt-2"><StatusBadge status={account.status} /></div></div>
      </div>
      <div className="border-t border-slate-100 p-5"><h3 className="mb-3 text-sm font-semibold text-slate-900">Limits</h3><dl className="grid gap-4 sm:grid-cols-3"><LimitItem label="Daily transfer limit" limit={account.dailyTransferLimit} /><LimitItem label="Maximum per transaction" limit={account.maxTransactionAmount} /><LimitItem label="Minimum balance" limit={account.minBalance} /></dl><p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Used in the last 24 hours: <span className="font-medium">{formatMoney(account.usedLast24h)}</span>. You can still transfer up to <span className="font-medium">{formatMoney(account.remainingDaily)}</span> today.</p></div>
      <StatementDownload account={account} />
    </section>
  );
}

export default function AccountDetails() {
  const { data, isLoading, isError, refetch } = useGetAccountDetailsQuery();
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">My Accounts</h1><p className="text-sm text-slate-500">Account details, limits and statements.</p></div>
      {isError && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>Could not load your accounts.</span><button type="button" onClick={() => refetch()} className="rounded-lg bg-red-600 px-3 py-1.5 text-white">Retry</button></div>}
      {isLoading && <div className="space-y-4">{[0,1].map((i) => <div key={i} className="h-96 animate-pulse rounded-xl bg-slate-200" />)}</div>}
      {data && data.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">You do not have any account yet. Please contact the bank.</p>}
      {data?.map((account) => <AccountCard key={account.id} account={account} />)}
    </div>
  );
}
