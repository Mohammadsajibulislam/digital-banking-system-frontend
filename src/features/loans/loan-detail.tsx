"use client";

import { useState } from "react";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import StatusBadge from "@/components/ui/status-badge";
import { useAppSelector } from "@/store/hooks";
import { formatDate, formatMoney, getErrorMessage } from "@/lib/utils";
import type { InstallmentDTO } from "@/types/loans";
import { useGetLoanQuery, useRepayInstallmentMutation } from "./loans-api";
import { EMPLOYMENT_LABELS, LOAN_TYPE_LABELS } from "./loan-labels";
import LoanReviewPanel from "./loan-review-panel";

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-slate-900">{value}</p></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-slate-500">{label}</dt><dd className="text-right font-medium text-slate-900">{value}</dd></div>;
}

export default function LoanDetail({ loanId, backHref }: { loanId: string; backHref: string }) {
  const role = useAppSelector((state) => state.auth.user?.role);
  const isCustomer = role === "CUSTOMER";
  const { data: loan, isLoading, isError, error } = useGetLoanQuery(loanId);
  const [repay, { isLoading: paying }] = useRepayInstallmentMutation();
  const [payTarget, setPayTarget] = useState<InstallmentDTO | null>(null);
  const [pin, setPin] = useState("");
  const [payError, setPayError] = useState("");
  const [toast, setToast] = useState("");

  const backLink = <Link href={backHref} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"><FiArrowLeft className="h-4 w-4" />Back to loans</Link>;
  if (isLoading) return <div className="mx-auto max-w-5xl space-y-4">{backLink}<div className="h-96 animate-pulse rounded-2xl bg-slate-200" /></div>;
  if (isError || !loan) return <div className="mx-auto max-w-5xl space-y-4">{backLink}<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{getErrorMessage(error)}</div></div>;

  const paidPercent = Number(loan.totalPayable) > 0 ? Math.min(100, Number(loan.paidTotal) / Number(loan.totalPayable) * 100) : 0;
  const nextInstallment = loan.status === "ACTIVE" ? loan.installments.find((item) => item.status !== "PAID") : undefined;
  const paidInstallments = loan.installments.filter((item) => item.status === "PAID");

  async function handlePay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!payTarget || paying) return;
    if (!/^\d{4}$/.test(pin)) {
      setPayError("Enter your 4-digit transaction PIN");
      return;
    }
    setPayError("");
    try {
      const result = await repay({ loanId, installmentId: payTarget.id, pin }).unwrap();
      setPayTarget(null);
      setPin("");
      setToast(result.loanStatus === "COMPLETED" ? `Loan fully repaid. Ref: ${result.txnId}` : `Installment paid. Ref: ${result.txnId}`);
    } catch (err) {
      setPayError(getErrorMessage(err));
      setPin("");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {backLink}
      {toast && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{toast}</div>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-semibold text-slate-900">{loan.loanNumber}</h1><p className="text-sm text-slate-500">{LOAN_TYPE_LABELS[loan.type] ?? loan.type} loan | Account {loan.accountNumber}</p></div>
        <StatusBadge status={loan.status} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={loan.approvedAmount ? "Approved amount" : "Requested amount"} value={formatMoney(loan.approvedAmount ?? loan.requestedAmount)} />
        <Stat label="Duration" value={`${loan.durationMonths} months`} />
        <Stat label="Monthly installment" value={loan.monthlyInstallment ? formatMoney(loan.monthlyInstallment) : "-"} />
        <Stat label="Remaining balance" value={loan.remainingBalance ? formatMoney(loan.remainingBalance) : "-"} />
      </div>
      {loan.installments.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex justify-between text-sm"><span className="text-slate-600">Repaid {formatMoney(loan.paidTotal)} of {formatMoney(loan.totalPayable)}</span><span className="font-medium text-slate-900">{paidPercent.toFixed(0)}%</span></div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${paidPercent}%` }} /></div>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold text-slate-900">Loan details</h2>
          <dl className="divide-y divide-slate-100">
            {!isCustomer && <Info label="Applicant" value={loan.applicantName} />}
            {!isCustomer && <Info label="Email" value={loan.applicantEmail} />}
            <Info label="Monthly income" value={formatMoney(loan.monthlyIncome)} />
            <Info label="Employment" value={EMPLOYMENT_LABELS[loan.employmentStatus] ?? loan.employmentStatus} />
            <Info label="Interest rate" value={loan.interestRate ? `${loan.interestRate}% yearly` : "-"} />
            <Info label="Applied on" value={formatDate(loan.createdAt)} />
            {loan.disbursedAt && <Info label="Disbursed on" value={formatDate(loan.disbursedAt)} />}
            {!isCustomer && loan.forwardedByName && <Info label="Forwarded by" value={loan.forwardedByName} />}
            {!isCustomer && loan.decidedByName && <Info label="Decided by" value={loan.decidedByName} />}
          </dl>
          {loan.description && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{loan.description}</p>}
          {loan.decisionNote && <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900"><span className="font-medium">Bank note:</span> {loan.decisionNote}</p>}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Repayment history</h2></div>
          {paidInstallments.length === 0 ? <p className="p-5 text-sm text-slate-500">No repayments yet.</p> : (
            <ul className="divide-y divide-slate-100">{paidInstallments.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm"><div><p className="font-medium text-slate-900">Installment {item.installmentNo}</p><p className="text-xs text-slate-500">{item.paidAt ? formatDate(item.paidAt) : ""}{item.txnId ? ` | ${item.txnId}` : ""}</p></div><span className="font-semibold text-slate-900">{formatMoney(item.amount)}</span></li>)}</ul>
          )}
        </section>
      </div>
      {loan.installments.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Repayment schedule</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3 text-right">Principal</th><th className="px-4 py-3 text-right">Interest</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th>{isCustomer && <th className="px-4 py-3">Action</th>}</tr></thead>
              <tbody className="divide-y divide-slate-100">{loan.installments.map((item) => <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-slate-600">{item.installmentNo}</td><td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(item.dueDate)}</td><td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">{formatMoney(item.principalPart)}</td><td className="whitespace-nowrap px-4 py-3 text-right text-slate-600">{formatMoney(item.interestPart)}</td><td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">{formatMoney(item.amount)}</td><td className="px-4 py-3"><StatusBadge status={item.status} /></td>{isCustomer && <td className="px-4 py-3">{nextInstallment?.id === item.id ? <button type="button" onClick={() => { setPayTarget(item); setPin(""); setPayError(""); }} className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800">Pay now</button> : <span className="text-xs text-slate-400">-</span>}</td>}</tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
      {!isCustomer && <LoanReviewPanel loan={loan} />}
      <Modal open={payTarget !== null} title="Pay installment" onClose={() => { if (!paying) setPayTarget(null); }}>
        {payTarget && (
          <form onSubmit={handlePay} className="space-y-4">
            <dl className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Loan</dt><dd className="font-medium text-slate-900">{loan.loanNumber}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Installment</dt><dd className="font-medium text-slate-900">#{payTarget.installmentNo}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Debited from</dt><dd className="font-medium text-slate-900">{loan.accountNumber}</dd></div><div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900"><dt>Amount</dt><dd>{formatMoney(payTarget.amount)}</dd></div></dl>
            <div><label htmlFor="pay-pin" className="mb-1 block text-sm font-medium text-slate-700">Transaction PIN</label><input id="pay-pin" type="password" inputMode="numeric" maxLength={4} autoComplete="off" autoFocus value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} className="w-full rounded-lg border border-slate-300 px-3 py-2 tracking-[0.5em] text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" /></div>
            {payError && <p role="alert" className="text-sm text-red-600">{payError}</p>}
            <div className="flex gap-3"><button type="button" disabled={paying} onClick={() => setPayTarget(null)} className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">Cancel</button><button type="submit" disabled={paying} className="flex-1 rounded-lg bg-blue-700 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60">{paying ? "Paying..." : "Confirm payment"}</button></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
