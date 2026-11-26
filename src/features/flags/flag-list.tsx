"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiCheck, FiX } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Pagination from "@/components/ui/pagination";
import { formatDateTime } from "@/features/transactions/helpers";
import { formatMoney, getErrorMessage } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { FlagDTO } from "@/types/flags";
import FlagStatusBadge from "./flag-status-badge";
import { useGetFlagsQuery, useResolveFlagMutation } from "./flags-api";
import { setFlagPage, setFlagStatus } from "./flags-slice";

export default function FlagList({ reviewMode, txnBasePath }: { reviewMode: boolean; txnBasePath: string }) {
  const dispatch = useAppDispatch();
  const filters = useAppSelector((state) => state.flags);
  const { data, isLoading, isFetching, isError, refetch } = useGetFlagsQuery(filters);
  const [resolveFlag, { isLoading: resolving }] = useResolveFlagMutation();
  const [target, setTarget] = useState<{ flag: FlagDTO; decision: "RESOLVE" | "DISMISS" } | null>(null);
  const [note, setNote] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [toast, setToast] = useState("");
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!target || resolving) return;
    if (note.trim().length < 3) {
      setDialogError("Please write a note");
      return;
    }
    setDialogError("");
    try {
      await resolveFlag({ id: target.flag.id, decision: target.decision, note: note.trim() }).unwrap();
      setTarget(null);
      setToast(target.decision === "RESOLVE" ? "Flag marked as resolved" : "Flag dismissed");
    } catch (err) {
      setDialogError(getErrorMessage(err));
    }
  }

  const items = data?.items ?? [];
  return (
    <div className="space-y-4">
      {toast && <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><span>{toast}</span><button type="button" onClick={() => setToast("")}><FiX className="h-4 w-4" /></button></div>}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:w-64"><label htmlFor="flag-status" className="mb-1 block text-xs font-medium text-slate-500">Status</label><select id="flag-status" value={filters.status} onChange={(e) => dispatch(setFlagStatus(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All statuses</option><option value="OPEN">Open</option><option value="RESOLVED">Resolved</option><option value="DISMISSED">Dismissed</option></select></div>
      {isError && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>Could not load flags.</span><button type="button" onClick={() => refetch()} className="rounded-lg bg-red-600 px-3 py-1.5 text-white">Retry</button></div>}
      <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${isFetching ? "opacity-60" : ""}`}>
        {isLoading ? <div className="space-y-3 p-5">{[0,1,2,3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200" />)}</div> : items.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No flagged transactions found.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Flagged</th><th className="px-4 py-3">Transaction</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Accounts</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Status</th>{reviewMode && <th className="px-4 py-3">Action</th>}</tr></thead><tbody className="divide-y divide-slate-100">{items.map((flag) => <tr key={flag.id} className="hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3"><p>{formatDateTime(flag.createdAt)}</p><p className="text-xs text-slate-500">by {flag.raisedByName}</p></td><td className="px-4 py-3"><Link href={`${txnBasePath}/${flag.txnId}`} className="font-medium text-blue-700 hover:underline">{flag.txnId}</Link></td><td className="px-4 py-3 text-right font-semibold">{formatMoney(flag.amount)}</td><td className="px-4 py-3 text-xs"><p>From: {flag.fromAccountNumber ?? "Bank"}</p><p>To: {flag.toAccountNumber ?? "Bank"}</p></td><td className="max-w-xs px-4 py-3 text-xs"><p>{flag.reason}</p>{flag.resolutionNote && <p className="mt-1 text-slate-500">Decision: {flag.resolutionNote}</p>}</td><td className="px-4 py-3"><FlagStatusBadge status={flag.status} /></td>{reviewMode && <td className="px-4 py-3">{flag.status === "OPEN" ? <div className="flex gap-2"><button type="button" onClick={() => { setTarget({ flag, decision: "RESOLVE" }); setNote(""); setDialogError(""); }} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"><FiCheck className="h-3.5 w-3.5" />Resolve</button><button type="button" onClick={() => { setTarget({ flag, decision: "DISMISS" }); setNote(""); setDialogError(""); }} className="rounded-lg border px-3 py-1.5 text-xs">Dismiss</button></div> : <span className="text-xs text-slate-400">Done</span>}</td>}</tr>)}</tbody></table></div>
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} disabled={isFetching} onPageChange={(page) => dispatch(setFlagPage(page))} />}
      </div>
      <Modal open={target !== null} title={target?.decision === "RESOLVE" ? "Resolve flag" : "Dismiss flag"} onClose={() => { if (!resolving) setTarget(null); }}>
        {target && <form onSubmit={handleReview} className="space-y-4"><dl className="rounded-lg bg-slate-50 p-4 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Transaction</dt><dd className="font-medium">{target.flag.txnId}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Amount</dt><dd className="font-semibold">{formatMoney(target.flag.amount)}</dd></div></dl><div><label htmlFor="flag-note" className="mb-1 block text-sm font-medium">Note (required)</label><textarea id="flag-note" rows={3} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm" /></div>{dialogError && <p role="alert" className="text-sm text-red-600">{dialogError}</p>}<div className="flex gap-3"><button type="button" disabled={resolving} onClick={() => setTarget(null)} className="flex-1 rounded-lg border py-2.5">Cancel</button>        <button type="submit" disabled={resolving} className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white ${target.decision === "RESOLVE" ? "bg-emerald-600" : "bg-zinc-700 hover:bg-zinc-800"}`}>{resolving ? "Please wait..." : target.decision === "RESOLVE" ? "Mark resolved" : "Dismiss flag"}</button></div></form>}
      </Modal>
    </div>
  );
}
