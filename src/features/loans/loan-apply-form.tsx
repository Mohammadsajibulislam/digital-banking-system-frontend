"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGetMyAccountsQuery } from "@/features/accounts/accounts-api";
import { LOAN_LIMITS, INDICATIVE_RATE, estimateEmi } from "@/lib/loan-math";
import { formatMoney, getErrorMessage } from "@/lib/utils";
import type { EmploymentStatus, LoanType } from "@/types/loans";
import { useApplyLoanMutation } from "./loans-api";
import { EMPLOYMENT_LABELS, LOAN_TYPE_LABELS } from "./loan-labels";

const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;
const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function LoanApplyForm() {
  const router = useRouter();
  const { data: accounts } = useGetMyAccountsQuery();
  const [applyLoan, { isLoading }] = useApplyLoanMutation();
  const [accountId, setAccountId] = useState("");
  const [type, setType] = useState<LoanType>("PERSONAL");
  const [amount, setAmount] = useState("");
  const [months, setMonths] = useState("12");
  const [income, setIncome] = useState("");
  const [employment, setEmployment] = useState<EmploymentStatus>("EMPLOYED");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const activeAccounts = accounts?.filter((a) => a.status === "ACTIVE") ?? [];
  const account = activeAccounts.find((a) => a.id === accountId) ?? activeAccounts[0] ?? null;
  const monthsNumber = Number(months);
  const emi = AMOUNT_PATTERN.test(amount) ? estimateEmi(Number(amount), monthsNumber, INDICATIVE_RATE) : 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!account) return setError("You need an active account to apply for a loan");
    if (!AMOUNT_PATTERN.test(amount)) return setError("Enter a valid loan amount");
    if (Number(amount) < LOAN_LIMITS.minAmount || Number(amount) > LOAN_LIMITS.maxAmount) return setError(`Loan amount must be between ${formatMoney(LOAN_LIMITS.minAmount)} and ${formatMoney(LOAN_LIMITS.maxAmount)}`);
    if (!Number.isInteger(monthsNumber) || monthsNumber < LOAN_LIMITS.minMonths || monthsNumber > LOAN_LIMITS.maxMonths) return setError(`Duration must be between ${LOAN_LIMITS.minMonths} and ${LOAN_LIMITS.maxMonths} months`);
    if (!AMOUNT_PATTERN.test(income) || Number(income) <= 0) return setError("Enter your monthly income");

    try {
      const loan = await applyLoan({ type, accountId: account.id, requestedAmount: amount, durationMonths: monthsNumber, monthlyIncome: income, employmentStatus: employment, description: description.trim() || undefined }).unwrap();
      router.push(`/customer/loans/${loan.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="loan-type" className={labelClass}>Loan type</label><select id="loan-type" value={type} onChange={(e) => setType(e.target.value as LoanType)} className={inputClass}>{Object.entries(LOAN_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <div><label htmlFor="loan-account" className={labelClass}>Disbursement account</label><select id="loan-account" value={account?.id ?? ""} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>{activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.type.charAt(0) + a.type.slice(1).toLowerCase()} - {a.accountNumber}</option>)}</select></div>
        <div><label htmlFor="loan-amount" className={labelClass}>Requested amount (BDT)</label><input id="loan-amount" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} /><p className="mt-1 text-xs text-slate-500">{formatMoney(LOAN_LIMITS.minAmount)} to {formatMoney(LOAN_LIMITS.maxAmount)}</p></div>
        <div><label htmlFor="loan-months" className={labelClass}>Duration (months)</label><input id="loan-months" type="number" min={LOAN_LIMITS.minMonths} max={LOAN_LIMITS.maxMonths} value={months} onChange={(e) => setMonths(e.target.value)} className={inputClass} /><p className="mt-1 text-xs text-slate-500">{LOAN_LIMITS.minMonths} to {LOAN_LIMITS.maxMonths} months</p></div>
        <div><label htmlFor="loan-income" className={labelClass}>Monthly income (BDT)</label><input id="loan-income" inputMode="decimal" placeholder="0.00" value={income} onChange={(e) => setIncome(e.target.value)} className={inputClass} /></div>
        <div><label htmlFor="loan-employment" className={labelClass}>Employment status</label><select id="loan-employment" value={employment} onChange={(e) => setEmployment(e.target.value as EmploymentStatus)} className={inputClass}>{Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      </div>
      <div><label htmlFor="loan-desc" className={labelClass}>Application description (optional)</label><textarea id="loan-desc" rows={3} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></div>
      {emi > 0 && <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">Estimated monthly installment: <strong>{formatMoney(emi)}</strong><p className="mt-1 text-xs text-blue-800">This is an estimate at {INDICATIVE_RATE}% yearly interest. The bank decides the final interest rate when approving.</p></div>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3"><Link href="/customer/loans" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</Link><button type="submit" disabled={isLoading} className="flex-1 rounded-lg bg-blue-700 py-2.5 font-medium text-white hover:bg-blue-800 disabled:opacity-60">{isLoading ? "Submitting..." : "Submit application"}</button></div>
    </form>
  );
}
