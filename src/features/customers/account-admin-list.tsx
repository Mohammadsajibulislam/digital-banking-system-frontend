"use client";

import { useEffect, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Pagination from "@/components/ui/pagination";
import StatusBadge from "@/components/ui/status-badge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { formatMoney, getErrorMessage } from "@/lib/utils";
import type { AccountType } from "@/types/banking";
import type { AdminAccountDTO } from "@/types/customers";
import type { UpdateAccountBody } from "@/types/customers";
import { setAccountFilters, setAccountPage } from "./account-admin-slice";
import { useGetAllAccountsQuery, useUpdateAccountMutation } from "./customers-api";

const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600";

export default function AccountAdminList() {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.accountAdmin);
  const { data, isLoading, isFetching, isError, refetch } = useGetAllAccountsQuery(filters);
  const [updateAccount, { isLoading: saving }] = useUpdateAccountMutation();
  const [qInput, setQInput] = useState(filters.q);
  const [editing, setEditing] = useState<AdminAccountDTO | null>(null);
  const [status, setStatus] = useState<"ACTIVE" | "FROZEN">("ACTIVE");
  const [type, setType] = useState<AccountType>("SAVINGS");
  const [daily, setDaily] = useState("");
  const [max, setMax] = useState("");
  const [minBalance, setMinBalance] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (qInput.trim() === filters.q) return;
    const timer = setTimeout(() => dispatch(setAccountFilters({ q: qInput.trim() })), 400);
    return () => clearTimeout(timer);
  }, [qInput, filters.q, dispatch]);

  function openEdit(account: AdminAccountDTO) {
    setEditing(account);
    setStatus(account.status === "FROZEN" ? "FROZEN" : "ACTIVE");
    setType(account.type);
    setDaily(account.dailyTransferLimit ?? "");
    setMax(account.maxTransactionAmount ?? "");
    setMinBalance(account.minBalance ?? "");
    setReason("");
    setError("");
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError("");
    if (status === "FROZEN" && editing.status !== "FROZEN" && reason.trim().length < 3) {
      setError("Please write a reason for freezing");
      return;
    }
    const body: Partial<UpdateAccountBody> & { id: string } = { id: editing.id };
    if (status !== editing.status) body.status = status;
    if (type !== editing.type) body.type = type;
    if ((daily === "") !== (editing.dailyTransferLimit === null)) body.dailyTransferLimit = daily === "" ? null : daily;
    else if (daily !== "" && daily !== editing.dailyTransferLimit) body.dailyTransferLimit = daily;
    if ((max === "") !== (editing.maxTransactionAmount === null)) body.maxTransactionAmount = max === "" ? null : max;
    else if (max !== "" && max !== editing.maxTransactionAmount) body.maxTransactionAmount = max;
    if ((minBalance === "") !== (editing.minBalance === null)) body.minBalance = minBalance === "" ? null : minBalance;
    else if (minBalance !== "" && minBalance !== editing.minBalance) body.minBalance = minBalance;
    if (reason.trim()) body.reason = reason.trim();
    if (Object.keys(body).length === 1) {
      setError("Nothing was changed");
      return;
    }
    try {
      await updateAccount(body).unwrap();
      setToast(`Account ${editing.accountNumber} updated`);
      setEditing(null);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const items = data?.items ?? [];
  const hasFilters = Boolean(filters.q || filters.status || filters.type);
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div><h1 className="text-2xl font-semibold text-slate-900">Accounts</h1><p className="text-sm text-slate-500">Freeze or unfreeze accounts and set transaction limits.</p></div>
      {toast && <div role="status" className="flex justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><span>{toast}</span><button type="button" onClick={() => setToast("")}><FiX className="h-4 w-4" /></button></div>}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2"><label htmlFor="acc-search" className="mb-1 block text-xs font-medium text-slate-500">Search</label><div className="relative"><FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="acc-search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Account number, owner name or email" className={`${fieldClass} pl-9`} /></div></div>
        <div><label htmlFor="acc-status" className="mb-1 block text-xs font-medium text-slate-500">Status</label><select id="acc-status" value={filters.status} onChange={(e) => dispatch(setAccountFilters({ status: e.target.value }))} className={fieldClass}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="FROZEN">Frozen</option><option value="CLOSED">Closed</option></select></div>
        <div><label htmlFor="acc-type" className="mb-1 block text-xs font-medium text-slate-500">Type</label><select id="acc-type" value={filters.type} onChange={(e) => dispatch(setAccountFilters({ type: e.target.value }))} className={fieldClass}><option value="">All types</option><option value="SAVINGS">Savings</option><option value="CURRENT">Current</option><option value="BUSINESS">Business</option></select></div>
        {hasFilters && <button type="button" onClick={() => { setQInput(""); dispatch(setAccountFilters({ q: "", status: "", type: "" })); }} className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2 lg:col-span-4"><FiX className="h-4 w-4" />Clear filters</button>}
      </div>
      {isError && <div role="alert" className="flex justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>Could not load accounts.</span><button onClick={() => refetch()} className="rounded bg-red-600 px-3 py-1 text-white">Retry</button></div>}
      <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${isFetching ? "opacity-60" : ""}`}>
        {isLoading ? <div className="space-y-3 p-5">{[0,1,2,3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200" />)}</div> : items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No accounts found.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Account</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3">Limits</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((account) => <tr key={account.id} className="hover:bg-slate-50"><td className="px-4 py-3"><p className="font-medium">{account.accountNumber}</p><p className="text-xs capitalize text-slate-500">{account.type.toLowerCase()}</p></td><td className="px-4 py-3"><p>{account.ownerName}</p><p className="text-xs text-slate-500">{account.ownerEmail}</p></td><td className="px-4 py-3 text-right font-semibold">{formatMoney(account.balance)}</td><td className="px-4 py-3 text-xs text-slate-600"><p>Daily: {account.dailyTransferLimit ? formatMoney(account.dailyTransferLimit) : "default"}</p><p>Max: {account.maxTransactionAmount ? formatMoney(account.maxTransactionAmount) : "default"}</p><p>Min: {account.minBalance ? formatMoney(account.minBalance) : "default"}</p></td><td className="px-4 py-3"><StatusBadge status={account.status} /></td><td className="px-4 py-3"><button type="button" disabled={account.status === "CLOSED"} onClick={() => openEdit(account)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-50">Manage</button></td></tr>)}</tbody></table></div>
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} disabled={isFetching} onPageChange={(page) => dispatch(setAccountPage(page))} />}
      </div>
      <Modal open={editing !== null} title={editing ? `Manage ${editing.accountNumber}` : ""} onClose={() => { if (!saving) setEditing(null); }}>
        {editing && data && <form onSubmit={handleSave} className="space-y-4"><p className="text-sm">Owner: <strong>{editing.ownerName}</strong></p><div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-sm">Status</label><select value={status} onChange={(e) => setStatus(e.target.value as "ACTIVE" | "FROZEN")} className={fieldClass}><option value="ACTIVE">Active</option><option value="FROZEN">Frozen</option></select></div><div><label className="mb-1 block text-sm">Account type</label><select value={type} onChange={(e) => setType(e.target.value as AccountType)} className={fieldClass}><option value="SAVINGS">Savings</option><option value="CURRENT">Current</option><option value="BUSINESS">Business</option></select></div></div><fieldset className="space-y-3 rounded-lg bg-slate-50 p-4"><legend className="text-sm font-medium">Transaction limits (BDT)</legend><p className="text-xs text-slate-500">Leave empty for bank default.</p>{[
          ["daily", "Daily transfer limit", daily, setDaily, data.defaults.dailyTransferLimit],
          ["max", "Maximum per transaction", max, setMax, data.defaults.maxSingleTransaction],
          ["min", "Minimum balance", minBalance, setMinBalance, data.defaults.minAccountBalance],
        ].map(([id, label, value, setter, fallback]) => <div key={String(id)}><label htmlFor={String(id)} className="mb-1 block text-sm">{String(label)}</label><input id={String(id)} inputMode="decimal" placeholder={`Default: ${String(fallback)}`} value={String(value)} onChange={(e) => (setter as (value: string) => void)(e.target.value)} className={fieldClass} /></div>)}</fieldset><div><label htmlFor="freeze-reason" className="mb-1 block text-sm">Reason</label><textarea id="freeze-reason" rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} className={fieldClass} /></div>{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex gap-3"><button type="button" disabled={saving} onClick={() => setEditing(null)} className="flex-1 rounded-lg border border-slate-300 py-2.5">Cancel</button><button type="submit" disabled={saving} className="flex-1 rounded-lg bg-blue-700 py-2.5 text-white disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button></div></form>}
      </Modal>
    </div>
  );
}
