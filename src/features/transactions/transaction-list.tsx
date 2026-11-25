"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiSearch, FiX } from "react-icons/fi";
import Pagination from "@/components/ui/pagination";
import StatusBadge from "@/components/ui/status-badge";
import { useGetMyAccountsQuery } from "@/features/accounts/accounts-api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { formatMoney } from "@/lib/utils";
import { STATUS_OPTIONS, TYPE_LABELS, describeTransaction, formatDateTime } from "./helpers";
import { useGetTransactionsQuery } from "./transactions-api";
import { resetFilters, setFilters, setPage } from "./transactions-slice";
import type { TransactionDTO } from "@/types/transactions";

const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

function AmountText({ tx, isCustomer }: { tx: TransactionDTO; isCustomer: boolean }) {
  if (!isCustomer) return <span className="font-semibold text-slate-900">{formatMoney(tx.amount)}</span>;
  const credit = tx.direction === "CREDIT";
  return <span className={`font-semibold ${credit ? "text-emerald-600" : "text-rose-600"}`}>{credit ? "+" : "-"}{formatMoney(tx.amount)}</span>;
}

export default function TransactionList({ basePath }: { basePath: string }) {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.transactions);
  const role = useAppSelector((state) => state.auth.user?.role);
  const isCustomer = role === "CUSTOMER";
  const { data: accounts } = useGetMyAccountsQuery(undefined, { skip: !isCustomer });
  const { data, isLoading, isFetching, isError, refetch } = useGetTransactionsQuery(filters);
  const [qInput, setQInput] = useState(filters.q);

  useEffect(() => {
    if (qInput.trim() === filters.q) return;
    const timer = setTimeout(() => dispatch(setFilters({ q: qInput.trim() })), 400);
    return () => clearTimeout(timer);
  }, [qInput, filters.q, dispatch]);

  const hasFilters = Boolean(filters.q || filters.type || filters.status || filters.from || filters.to || filters.accountId);
  function clearAll() {
    setQInput("");
    dispatch(resetFilters());
  }
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div><h1 className="text-2xl font-semibold text-slate-900">Transactions</h1><p className="text-sm text-slate-500">Search and filter your transaction history.</p></div>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <label htmlFor="search" className={labelClass}>Search by transaction ID</label>
          <div className="relative"><FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="search" placeholder="TXN-20261123-ABC123" value={qInput} onChange={(e) => setQInput(e.target.value)} className={`${fieldClass} pl-9`} /></div>
        </div>
        <div><label htmlFor="type" className={labelClass}>Type</label><select id="type" value={filters.type} onChange={(e) => dispatch(setFilters({ type: e.target.value }))} className={fieldClass}><option value="">All types</option>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div><label htmlFor="status" className={labelClass}>Status</label><select id="status" value={filters.status} onChange={(e) => dispatch(setFilters({ status: e.target.value }))} className={fieldClass}><option value="">All statuses</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status.charAt(0) + status.slice(1).toLowerCase()}</option>)}</select></div>
        <div><label htmlFor="from" className={labelClass}>From date</label><input id="from" type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => dispatch(setFilters({ from: e.target.value }))} className={fieldClass} /></div>
        <div><label htmlFor="to" className={labelClass}>To date</label><input id="to" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => dispatch(setFilters({ to: e.target.value }))} className={fieldClass} /></div>
        {isCustomer && <div><label htmlFor="account" className={labelClass}>Account</label><select id="account" value={filters.accountId} onChange={(e) => dispatch(setFilters({ accountId: e.target.value }))} className={fieldClass}><option value="">All accounts</option>{accounts?.map((account) => <option key={account.id} value={account.id}>{account.type.charAt(0) + account.type.slice(1).toLowerCase()} - {account.accountNumber}</option>)}</select></div>}
        <div className="flex items-end"><button type="button" onClick={clearAll} disabled={!hasFilters} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"><FiX className="h-4 w-4" />Clear filters</button></div>
      </div>
      {isError && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>Could not load transactions.</span><button type="button" onClick={() => refetch()} className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">Retry</button></div>}
      <div className={`rounded-xl border border-slate-200 bg-white shadow-sm transition-opacity ${isFetching ? "opacity-60" : ""}`}>
        {isLoading ? <div className="space-y-3 p-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200" />)}</div> : items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{hasFilters ? "No transactions match your filters." : "No transactions yet."}</p> : <>
          <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Transaction ID</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Details</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((tx) => <tr key={tx.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(tx.createdAt)}</td><td className="whitespace-nowrap px-4 py-3"><Link href={`${basePath}/${tx.txnId}`} className="font-medium text-blue-700 hover:underline">{tx.txnId}</Link></td><td className="whitespace-nowrap px-4 py-3 text-slate-700">{TYPE_LABELS[tx.type] ?? tx.type}</td><td className="max-w-xs truncate px-4 py-3 text-slate-600">{describeTransaction(tx, isCustomer)}</td><td className="whitespace-nowrap px-4 py-3 text-right"><AmountText tx={tx} isCustomer={isCustomer} /></td><td className="px-4 py-3"><StatusBadge status={tx.status} /></td></tr>)}</tbody></table></div>
          <ul className="divide-y divide-slate-100 md:hidden">{items.map((tx) => <li key={tx.id}><Link href={`${basePath}/${tx.txnId}`} className="block space-y-1 px-4 py-3 hover:bg-slate-50"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium text-slate-900">{TYPE_LABELS[tx.type] ?? tx.type}</span><AmountText tx={tx} isCustomer={isCustomer} /></div><p className="truncate text-xs text-slate-500">{describeTransaction(tx, isCustomer)}</p><div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{tx.txnId} | {formatDateTime(tx.createdAt)}</span><StatusBadge status={tx.status} /></div></Link></li>)}</ul>
        </>}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} disabled={isFetching} onPageChange={(page) => dispatch(setPage(page))} />}
      </div>
    </div>
  );
}
