"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiPlus, FiSearch, FiX } from "react-icons/fi";
import Pagination from "@/components/ui/pagination";
import StatusBadge from "@/components/ui/status-badge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { formatDate, formatMoney } from "@/lib/utils";
import { useGetCustomersQuery } from "./customers-api";
import { setCustomerFilters, setCustomerPage } from "./customers-slice";
import VerifiedBadge from "./verified-badge";

const fieldClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export default function CustomerList({ basePath }: { basePath: string }) {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.customers);
  const { data, isLoading, isFetching, isError, refetch } = useGetCustomersQuery(filters);
  const [qInput, setQInput] = useState(filters.q);
  useEffect(() => {
    if (qInput.trim() === filters.q) return;
    const timer = setTimeout(() => dispatch(setCustomerFilters({ q: qInput.trim() })), 400);
    return () => clearTimeout(timer);
  }, [qInput, filters.q, dispatch]);

  const items = data?.items ?? [];
  const hasFilters = Boolean(filters.q || filters.status || filters.verified);
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="text-2xl font-semibold text-slate-900">Customers</h1><p className="text-sm text-slate-500">Search customers by name, email, phone or account number.</p></div>
        <Link href={`${basePath}/new`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"><FiPlus className="h-4 w-4" />Register customer</Link>
      </div>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2"><label htmlFor="cust-search" className="mb-1 block text-xs font-medium text-slate-500">Search</label><div className="relative"><FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="cust-search" placeholder="Name, email, phone or account number" value={qInput} onChange={(e) => setQInput(e.target.value)} className={`${fieldClass} pl-9`} /></div></div>
        <div><label htmlFor="cust-status" className="mb-1 block text-xs font-medium text-slate-500">Status</label><select id="cust-status" value={filters.status} onChange={(e) => dispatch(setCustomerFilters({ status: e.target.value }))} className={fieldClass}><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="BLOCKED">Blocked</option></select></div>
        <div><label htmlFor="cust-verified" className="mb-1 block text-xs font-medium text-slate-500">Verification</label><select id="cust-verified" value={filters.verified} onChange={(e) => dispatch(setCustomerFilters({ verified: e.target.value }))} className={fieldClass}><option value="">All</option><option value="true">Verified</option><option value="false">Unverified</option></select></div>
        {hasFilters && <button type="button" onClick={() => { setQInput(""); dispatch(setCustomerFilters({ q: "", status: "", verified: "" })); }} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 sm:col-span-2 lg:col-span-4"><FiX className="h-4 w-4" />Clear filters</button>}
      </div>
      {isError && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>Could not load customers.</span><button type="button" onClick={() => refetch()} className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">Retry</button></div>}
      <div className={`rounded-xl border border-slate-200 bg-white shadow-sm transition-opacity ${isFetching ? "opacity-60" : ""}`}>
        {isLoading ? <div className="space-y-3 p-5">{[0,1,2,3,4].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200" />)}</div> : items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">{hasFilters ? "No customers match your filters." : "No customers yet."}</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3 text-right">Accounts</th><th className="px-4 py-3 text-right">Total balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Verification</th><th className="px-4 py-3">Joined</th></tr></thead><tbody className="divide-y divide-slate-100">{items.map((customer) => <tr key={customer.id} className="hover:bg-slate-50"><td className="px-4 py-3"><Link href={`${basePath}/${customer.id}`} className="font-medium text-blue-700 hover:underline">{customer.name}</Link><p className="text-xs text-slate-500">{customer.email}</p></td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{customer.phone ?? "-"}</td><td className="px-4 py-3 text-right">{customer.accountCount}</td><td className="whitespace-nowrap px-4 py-3 text-right font-semibold">{formatMoney(customer.totalBalance)}</td><td className="px-4 py-3"><StatusBadge status={customer.status} /></td><td className="px-4 py-3"><VerifiedBadge verified={customer.isVerified} /></td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(customer.createdAt)}</td></tr>)}</tbody></table></div>
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} disabled={isFetching} onPageChange={(page) => dispatch(setCustomerPage(page))} />}
      </div>
    </div>
  );
}
