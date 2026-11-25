"use client";

import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import Pagination from "@/components/ui/pagination";
import StatusBadge from "@/components/ui/status-badge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { formatDate, formatMoney } from "@/lib/utils";
import { useGetLoansQuery } from "./loans-api";
import { LOAN_STATUS_OPTIONS, LOAN_TYPE_LABELS } from "./loan-labels";
import { setLoanPage, setLoanStatus } from "./loans-slice";

export default function LoanList({ basePath, reviewMode }: { basePath: string; reviewMode: boolean }) {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.loans);
  const { data, isLoading, isFetching, isError, refetch } = useGetLoansQuery(filters);
  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{reviewMode ? "Loan Applications" : "My Loans"}</h1>
          <p className="text-sm text-slate-500">{reviewMode ? "Review customer applications." : "Track your applications, repayment schedule and balance."}</p>
        </div>
        {!reviewMode && <Link href="/customer/loans/apply" className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800"><FiPlus className="h-4 w-4" />Apply for a loan</Link>}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:w-64">
        <label htmlFor="loan-status" className="mb-1 block text-xs font-medium text-slate-500">Status</label>
        <select id="loan-status" value={filters.status} onChange={(e) => dispatch(setLoanStatus(e.target.value))} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100">
          <option value="">All statuses</option>
          {LOAN_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status.replace("_", " ").charAt(0) + status.replace("_", " ").slice(1).toLowerCase()}</option>)}
        </select>
      </div>

      {isError && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>Could not load loans.</span><button type="button" onClick={() => refetch()} className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">Retry</button></div>}

      <div className={`rounded-xl border border-slate-200 bg-white shadow-sm transition-opacity ${isFetching ? "opacity-60" : ""}`}>
        {isLoading ? <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200" />)}</div> : items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No loans found.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Loan</th>{reviewMode && <th className="px-4 py-3">Applicant</th>}<th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Term</th><th className="px-4 py-3 text-right">Remaining</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Applied</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{items.map((loan) => <tr key={loan.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3"><Link href={`${basePath}/${loan.id}`} className="font-medium text-blue-700 hover:underline">{loan.loanNumber}</Link></td>{reviewMode && <td className="whitespace-nowrap px-4 py-3 text-slate-900">{loan.applicantName}</td>}<td className="whitespace-nowrap px-4 py-3 text-slate-700">{LOAN_TYPE_LABELS[loan.type] ?? loan.type}</td><td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">              {formatMoney(loan.approvedAmount ?? loan.requestedAmount)}</td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{loan.durationMonths} months</td><td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">{loan.remainingBalance ? formatMoney(loan.remainingBalance) : "-"}</td><td className="px-4 py-3"><StatusBadge status={loan.status} /></td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(loan.createdAt)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} disabled={isFetching} onPageChange={(page) => dispatch(setLoanPage(page))} />}
      </div>
    </div>
  );
}
