"use client";

import { useState } from "react";
import { FiFlag } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import { formatDateTime } from "@/features/transactions/helpers";
import { getErrorMessage } from "@/lib/utils";
import FlagStatusBadge from "./flag-status-badge";
import { useCreateFlagMutation, useGetTransactionFlagsQuery } from "./flags-api";

export default function TransactionFlagPanel({ txnId }: { txnId: string }) {
  const { data, isLoading } = useGetTransactionFlagsQuery(txnId);
  const [createFlag, { isLoading: flagging }] = useCreateFlagMutation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const flags = data?.items ?? [];
  const hasOpenFlag = flags.some((flag) => flag.status === "OPEN");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (flagging) return;
    if (reason.trim().length < 5) {
      setError("Please explain why this looks suspicious");
      return;
    }
    setError("");
    try {
      await createFlag({ txnId, reason: reason.trim() }).unwrap();
      setOpen(false);
      setReason("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="border-t border-slate-100 p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Suspicious activity review</h2>
        <button type="button" disabled={hasOpenFlag || isLoading} onClick={() => { setOpen(true); setError(""); }} className="inline-flex items-center gap-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
          <FiFlag className="h-4 w-4" />
          {hasOpenFlag ? "Waiting for admin review" : "Flag as suspicious"}
        </button>
      </div>
      {flags.length === 0 ? <p className="text-sm text-slate-500">This transaction has not been flagged.</p> : (
        <ul className="space-y-2">{flags.map((flag) => <li key={flag.id} className="rounded-lg bg-slate-50 p-3 text-sm"><div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-500">{flag.raisedByName} | {formatDateTime(flag.createdAt)}</span><FlagStatusBadge status={flag.status} /></div><p className="mt-1 text-slate-800">{flag.reason}</p>{flag.resolutionNote && <p className="mt-1 text-xs text-slate-600">Decision: {flag.resolutionNote}{flag.resolvedByName ? ` (${flag.resolvedByName})` : ""}</p>}</li>)}</ul>
      )}
      <Modal open={open} title="Flag as suspicious" onClose={() => { if (!flagging) setOpen(false); }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">An admin will review {txnId}. The customer is not notified and the transaction is not changed.</p>
          <div><label htmlFor="flag-reason" className="mb-1 block text-sm font-medium text-slate-700">Reason</label><textarea id="flag-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" /></div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3"><button type="button" disabled={flagging} onClick={() => setOpen(false)} className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm">Cancel</button><button type="submit" disabled={flagging} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white disabled:opacity-60">{flagging ? "Flagging..." : "Flag transaction"}</button></div>
        </form>
      </Modal>
    </div>
  );
}
