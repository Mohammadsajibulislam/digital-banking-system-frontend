"use client";

import Link from "next/link";
import { FiActivity, FiBriefcase, FiRepeat, FiUserCheck } from "react-icons/fi";
import StatCard from "@/components/ui/stat-card";
import { formatDateTime } from "@/features/transactions/helpers";
import { formatMoney } from "@/lib/utils";
import { useGetStaffDashboardQuery } from "./dashboard-api";

export default function StaffDashboard() {
  const { data, isLoading, isError, refetch } = useGetStaffDashboardQuery();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">Staff Dashboard</h1><p className="text-sm text-slate-500">Your work queue for today.</p></div>
      {isError && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>Could not load the dashboard.</span><button type="button" onClick={() => refetch()} className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">Retry</button></div>}
      {isLoading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200" />)}</div>}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Pending Requests" value={String(data.pendingRequests)} hint="Deposits and withdrawals to review" icon={FiRepeat} tone="bg-amber-50 text-amber-600" href="/staff/requests" />
            <StatCard label="Loans to Forward" value={String(data.loansToForward)} hint="Add a note, then forward to admin" icon={FiBriefcase} tone="bg-blue-50 text-blue-600" href="/staff/loans" />
            <StatCard label="Unverified Customers" value={String(data.unverifiedCustomers)} hint="Waiting for information check" icon={FiUserCheck} tone="bg-violet-50 text-violet-600" href="/staff/customers" />
            <StatCard label="Transactions Today" value={String(data.todayTransactions)} hint="Completed today" icon={FiActivity} tone="bg-emerald-50 text-emerald-600" />
          </div>
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Oldest pending requests</h2><Link href="/staff/requests" className="text-sm font-medium text-blue-700 hover:underline">View all</Link></div>
            {data.recentRequests.length === 0 ? <p className="p-5 text-sm text-slate-500">No pending requests. You are all caught up.</p> : (
              <ul className="divide-y divide-slate-100">{data.recentRequests.map((request) => <li key={request.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="text-sm font-medium text-slate-900">{request.requesterName} <span className="font-normal text-slate-500">requested a {request.type === "DEPOSIT" ? "deposit" : "withdrawal"}</span></p><p className="text-xs text-slate-500">Account {request.accountNumber} | {formatDateTime(request.createdAt)}</p></div><span className="font-semibold text-slate-900">{formatMoney(request.amount)}</span></li>)}</ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
