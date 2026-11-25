"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import { useAppSelector } from "@/store/hooks";
import { INDICATIVE_RATE, estimateEmi } from "@/lib/loan-math";
import { formatDate, formatMoney, getErrorMessage } from "@/lib/utils";
import type { LoanDetailDTO } from "@/types/loans";
import { useAddLoanNoteMutation, useDecideLoanMutation, useForwardLoanMutation } from "./loans-api";

const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;
const RATE_PATTERN = /^\d{1,2}(\.\d{1,2})?$/;
const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export default function LoanReviewPanel({ loan }: { loan: LoanDetailDTO }) {
  const role = useAppSelector((state) => state.auth.user?.role);
  const [addNote, { isLoading: addingNote }] = useAddLoanNoteMutation();
  const [forward, { isLoading: forwarding }] = useForwardLoanMutation();
  const [decide, { isLoading: deciding }] = useDecideLoanMutation();
  const [note, setNote] = useState("");
  const [panelError, setPanelError] = useState("");
  const [toast, setToast] = useState("");
  const [decision, setDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const [approvedAmount, setApprovedAmount] = useState(loan.requestedAmount);
  const [interestRate, setInterestRate] = useState(String(INDICATIVE_RATE));
  const [decisionNote, setDecisionNote] = useState("");
  const [dialogError, setDialogError] = useState("");

  const canReview = loan.status === "PENDING" || loan.status === "UNDER_REVIEW";
  const isStaff = role === "STAFF";
  const isAdmin = role === "ADMIN";

  async function handleAddNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPanelError("");
    if (note.trim().length < 3) {
      setPanelError("Note is too short");
      return;
    }
    try {
      await addNote({ id: loan.id, note: note.trim() }).unwrap();
      setNote("");
    } catch (err) {
      setPanelError(getErrorMessage(err));
    }
  }

  async function handleForward() {
    setPanelError("");
    try {
      await forward(loan.id).unwrap();
      setToast("Application forwarded to admin for approval");
    } catch (err) {
      setPanelError(getErrorMessage(err));
    }
  }

  function openDecision(value: "APPROVE" | "REJECT") {
    setDecision(value);
    setApprovedAmount(loan.requestedAmount);
    setInterestRate(String(INDICATIVE_RATE));
    setDecisionNote("");
    setDialogError("");
  }

  async function handleDecision(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!decision || deciding) return;
    setDialogError("");
    try {
      if (decision === "REJECT") {
        if (decisionNote.trim().length < 3) {
          setDialogError("Please write a reason for rejection");
          return;
        }
        await decide({ id: loan.id, decision: "REJECT", note: decisionNote.trim() }).unwrap();
        setToast("Loan application rejected");
      } else {
        if (!AMOUNT_PATTERN.test(approvedAmount) || Number(approvedAmount) <= 0) {
          setDialogError("Enter a valid approved amount");
          return;
        }
        if (Number(approvedAmount) > Number(loan.requestedAmount)) {
          setDialogError("Approved amount cannot exceed the requested amount");
          return;
        }
        if (!RATE_PATTERN.test(interestRate) || Number(interestRate) > 36) {
          setDialogError("Interest rate must be between 0 and 36");
          return;
        }
        const res = await decide({
          id: loan.id,
          decision: "APPROVE",
          approvedAmount,
          interestRate,
          note: decisionNote.trim() || undefined,
        }).unwrap();
        setToast(`Loan approved and disbursed. Transaction ${res.txnId}`);
      }
      setDecision(null);
    } catch (err) {
      setDialogError(getErrorMessage(err));
    }
  }

  const emi = decision === "APPROVE" && AMOUNT_PATTERN.test(approvedAmount)
    ? estimateEmi(Number(approvedAmount), loan.durationMonths, Number(interestRate) || 0)
    : 0;

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Review</h2>
      {toast && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{toast}</p>}
      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-700">Internal notes ({loan.notes.length})</h3>
        {loan.notes.length === 0 ? <p className="text-sm text-slate-500">No notes yet.</p> : (
          <ul className="space-y-2">{loan.notes.map((item) => <li key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="text-slate-800">{item.note}</p><p className="mt-1 text-xs text-slate-500">{item.authorName} | {formatDate(item.createdAt)}</p></li>)}</ul>
        )}
        {canReview && (
          <form onSubmit={handleAddNote} className="mt-3 space-y-2">
            <label htmlFor="loan-note" className="sr-only">Add an internal note</label>
            <textarea id="loan-note" rows={2} maxLength={500} placeholder="Add an internal note (customer cannot see this)" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
            <button type="submit" disabled={addingNote} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">{addingNote ? "Saving..." : "Add note"}</button>
          </form>
        )}
      </div>
      {panelError && <p role="alert" className="text-sm text-red-600">{panelError}</p>}

      {isStaff && loan.status === "PENDING" && (
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-sm text-slate-600">Staff cannot approve or reject. Forward this application to an admin after adding your review note.</p>
          <button type="button" onClick={handleForward} disabled={forwarding || loan.notes.length === 0} className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">{forwarding ? "Forwarding..." : "Forward to admin"}</button>
          {loan.notes.length === 0 && <p className="mt-2 text-xs text-slate-500">Add at least one note to enable forwarding.</p>}
        </div>
      )}
      {isStaff && loan.status === "UNDER_REVIEW" && <p className="border-t border-slate-100 pt-4 text-sm text-slate-600">Forwarded to admin{loan.forwardedAt ? ` on ${formatDate(loan.forwardedAt)}` : ""}.</p>}

      {isAdmin && canReview && (
        <div className="border-t border-slate-100 pt-4">
          {loan.status === "PENDING" && <p className="mb-2 text-xs text-amber-700">Staff has not forwarded this application yet.</p>}
          <div className="flex gap-3">
            <button type="button" onClick={() => openDecision("APPROVE")} className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">Approve</button>
            <button type="button" onClick={() => openDecision("REJECT")} className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700">Reject</button>
          </div>
        </div>
      )}

      <Modal open={decision !== null} title={decision === "APPROVE" ? "Approve loan" : "Reject loan"} onClose={() => { if (!deciding) setDecision(null); }}>
        <form onSubmit={handleDecision} className="space-y-4">
          {decision === "APPROVE" && (
            <>
              <div><label htmlFor="approved-amount" className="mb-1 block text-sm font-medium text-slate-700">Approved amount (BDT)</label><input id="approved-amount" inputMode="decimal" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} className={inputClass} /><p className="mt-1 text-xs text-slate-500">Requested: {formatMoney(loan.requestedAmount)}</p></div>
              <div><label htmlFor="interest-rate" className="mb-1 block text-sm font-medium text-slate-700">Interest rate (% yearly)</label><input id="interest-rate" inputMode="decimal" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className={inputClass} /></div>
              {emi > 0 && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Monthly installment about <strong>{formatMoney(emi)}</strong> for {loan.durationMonths} months.</p>}
              <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Approving credits the amount to account {loan.accountNumber} immediately and creates the repayment schedule.</p>
            </>
          )}
          <div><label htmlFor="decision-note" className="mb-1 block text-sm font-medium text-slate-700">Note {decision === "REJECT" ? "(required, customer will see it)" : "(optional)"}</label><textarea id="decision-note" rows={3} maxLength={300} value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} className={inputClass} /></div>
          {dialogError && <p role="alert" className="text-sm text-red-600">{dialogError}</p>}
          <div className="flex gap-3">
            <button type="button" disabled={deciding} onClick={() => setDecision(null)} className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button>
            <button type="submit" disabled={deciding} className={`flex-1 rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-60 ${decision === "APPROVE" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}>{deciding ? "Please wait..." : decision === "APPROVE" ? "Approve and disburse" : "Reject"}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
