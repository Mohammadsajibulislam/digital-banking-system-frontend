"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import Pagination from "@/components/ui/pagination";
import StatusBadge from "@/components/ui/status-badge";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { formatDateTime } from "@/features/transactions/helpers";
import { formatMoney, getErrorMessage } from "@/lib/utils";
import type { RequestDTO } from "@/types/requests";
import { useDecideRequestMutation, useGetRequestsQuery } from "./requests-api";
import { setRequestPage, setRequestStatus, setRequestType } from "./requests-slice";

export default function RequestList({ reviewMode }: { reviewMode: boolean }) {
  const dispatch = useAppDispatch();
  const role = useAppSelector((state) => state.auth.user?.role);
  const filters = useAppSelector((state) => state.requests);
  const { data, isLoading, isFetching, isError, refetch } = useGetRequestsQuery(filters);
  const [decide, { isLoading: deciding }] = useDecideRequestMutation();
  const [target, setTarget] = useState<{ request: RequestDTO; decision: "APPROVE" | "REJECT" } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const items = data?.items ?? [];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 sm:max-w-lg">
        <div><label htmlFor="request-status" className="mb-1 block text-xs font-medium text-slate-500">Status</label><select id="request-status" value={filters.status} onChange={(e) => dispatch(setRequestStatus(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></div>
        <div><label htmlFor="request-type" className="mb-1 block text-xs font-medium text-slate-500">Type</label><select id="request-type" value={filters.type} onChange={(e) => dispatch(setRequestType(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All types</option><option value="DEPOSIT">Deposit</option><option value="WITHDRAWAL">Withdrawal</option></select></div>
      </div>
      {isError && <div role="alert" className="flex justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>Could not load requests.</span><button type="button" onClick={() => refetch()} className="rounded bg-red-600 px-3 py-1 text-white">Retry</button></div>}
      <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${isFetching ? "opacity-60" : ""}`}>
        {isLoading ? <div className="space-y-3 p-5">{[0,1,2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200" />)}</div> : items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No requests found.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Account</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Created</th><th className="px-4 py-3">Status</th>{reviewMode && <th className="px-4 py-3">Action</th>}</tr></thead><tbody className="divide-y divide-slate-100">{items.map((request) => <tr key={request.id} className="hover:bg-slate-50"><td className="px-4 py-3">{request.requesterName}</td><td className="px-4 py-3">{request.type}</td><td className="px-4 py-3">{request.accountNumber}</td><td className="px-4 py-3 text-right font-semibold">{formatMoney(request.amount)}</td><td className="px-4 py-3 text-slate-600">{formatDateTime(request.createdAt)}</td><td className="px-4 py-3"><StatusBadge status={request.status} /></td>{reviewMode && <td className="px-4 py-3">{request.status === "PENDING" && role !== "CUSTOMER" ? <div className="flex gap-2"><button type="button" onClick={() => { setTarget({ request, decision: "APPROVE" }); setNote(""); setError(""); }} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">Approve</button><button type="button" onClick={() => { setTarget({ request, decision: "REJECT" }); setNote(""); setError(""); }} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white">Reject</button></div> : <span className="text-xs text-slate-400">-</span>}</td>}</tr>)}</tbody></table></div>
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} disabled={isFetching} onPageChange={(page) => dispatch(setRequestPage(page))} />}
      </div>
      <Modal open={target !== null} title={target?.decision === "APPROVE" ? "Approve request" : "Reject request"} onClose={() => { if (!deciding) setTarget(null); }}>
        {target && <form onSubmit={async (event) => {
          event.preventDefault();
          if (target.decision === "REJECT" && note.trim().length < 3) {
            setError("Please write a rejection reason");
            return;
          }
          setError("");
          try {
            await decide({ id: target.request.id, decision: target.decision, note: note.trim() }).unwrap();
            setTarget(null);
          } catch (err) { setError(getErrorMessage(err)); }
        }} className="space-y-4"><p className="text-sm text-slate-600">{target.request.requesterName} requested {formatMoney(target.request.amount)} via {target.request.accountNumber}.</p><label htmlFor="review-note" className="mb-1 block text-sm font-medium">Note</label><textarea id="review-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" />{error && <p role="alert" className="text-sm text-red-600">{error}</p>}<div className="flex gap-3"><button type="button" disabled={deciding} onClick={() => setTarget(null)} className="flex-1 rounded-lg border py-2.5">Cancel</button><button type="submit" disabled={deciding} className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white ${target.decision === "APPROVE" ? "bg-emerald-600" : "bg-red-600"}`}>{deciding ? "Please wait..." : target.decision}</button></div></form>}
      </Modal>
    </div>
  );
}
