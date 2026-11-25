"use client";

import { useState } from "react";
import { formatDateTime } from "@/features/transactions/helpers";
import { formatMoney, getErrorMessage } from "@/lib/utils";
import type { SettingsDTO } from "@/types/settings";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "./settings-api";

const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;
const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600";

function SettingsForm({ initial, onSaved }: { initial: SettingsDTO; onSaved: (message: string) => void }) {
  const [update, { isLoading }] = useUpdateSettingsMutation();
  const [daily, setDaily] = useState(initial.dailyTransferLimit);
  const [max, setMax] = useState(initial.maxSingleTransaction);
  const [min, setMin] = useState(initial.minAccountBalance);
  const [fee, setFee] = useState(initial.transferFee);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const values = [daily, max, min, fee].map((value) => value.trim());
    if (!values.every((value) => AMOUNT_PATTERN.test(value))) {
      setError("Enter valid amounts (up to 2 decimal places) in every field");
      return;
    }
    if (Number(values[0]) <= 0 || Number(values[1]) <= 0) {
      setError("Daily limit and maximum per transaction must be more than 0");
      return;
    }
    if (Number(values[1]) > Number(values[0])) {
      setError("Maximum per transaction cannot be more than the daily limit");
      return;
    }
    try {
      await update({
        dailyTransferLimit: values[0],
        maxSingleTransaction: values[1],
        minAccountBalance: values[2],
        transferFee: values[3],
      }).unwrap();
      onSaved("Settings saved. The new rules apply to every new transaction.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const fields = [
    ["set-daily", "Daily transfer limit (BDT)", "Total a single account can transfer in 24 hours.", daily, setDaily],
    ["set-max", "Maximum per transaction (BDT)", "Largest single transfer, deposit or withdrawal request.", max, setMax],
    ["set-min", "Minimum account balance (BDT)", "Every account must keep at least this much after a debit.", min, setMin],
    ["set-fee", "Transfer fee (BDT)", "Charged on transfers to other customers.", fee, setFee],
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {fields.map(([id, label, help, value, setValue]) => (
        <div key={id}><label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label><input id={id} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} /><p className="mt-1 text-xs text-slate-500">{help}</p></div>
      ))}
      <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-900">An account-specific limit takes priority over these bank-wide defaults.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Last updated {formatDateTime(initial.updatedAt)}</p><button type="submit" disabled={isLoading} className="rounded-lg bg-blue-700 px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60">{isLoading ? "Saving..." : "Save settings"}</button></div>
    </form>
  );
}

export default function SettingsPanel() {
  const { data, isLoading, isError, error, refetch } = useGetSettingsQuery();
  const [toast, setToast] = useState("");
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div><h1 className="text-2xl font-semibold text-slate-900">Bank Settings</h1><p className="text-sm text-slate-500">Bank-wide transaction limits. Only admins can change these.</p></div>
      {toast && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{toast}</p>}
      {isError && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{getErrorMessage(error)}</span><button type="button" onClick={() => refetch()} className="rounded-lg bg-red-600 px-3 py-1.5 text-white">Retry</button></div>}
      {isLoading && <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />}
      {data && <><SettingsForm key={data.updatedAt} initial={data} onSaved={setToast} /><p className="text-xs text-slate-500">Current defaults: daily {formatMoney(data.dailyTransferLimit)}, per transaction {formatMoney(data.maxSingleTransaction)}, minimum balance {formatMoney(data.minAccountBalance)}, fee {formatMoney(data.transferFee)}.</p></>}
    </div>
  );
}
