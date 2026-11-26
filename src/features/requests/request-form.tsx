"use client";

import { useState } from "react";
import { useGetMyAccountsQuery } from "@/features/accounts/accounts-api";
import { formatMoney, getErrorMessage } from "@/lib/utils";
import type { RequestType } from "@/types/requests";
import { useCreateRequestMutation } from "./requests-api";

const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;
const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function RequestForm() {
  const { data: accounts } = useGetMyAccountsQuery();
  const [createRequest, { isLoading }] = useCreateRequestMutation();
  const [type, setType] = useState<RequestType>("DEPOSIT");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeAccounts = accounts?.filter((account) => account.status === "ACTIVE") ?? [];
  const account =
    activeAccounts.find((item) => item.id === accountId) ??
    activeAccounts[0] ??
    null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!account) {
      setError("You need an active account to submit a request");
      return;
    }
    if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
      setError("Enter a valid amount");
      return;
    }

    try {
      await createRequest({
        type,
        accountId: account.id,
        amount,
        description: description.trim() || undefined,
      }).unwrap();
      setAmount("");
      setDescription("");
      setSuccess("Your request was submitted for review.");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-4 font-semibold text-slate-900">Submit a request</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="request-type" className={labelClass}>
            Request type
          </label>
          <select
            id="request-type"
            value={type}
            onChange={(event) => setType(event.target.value as RequestType)}
            className={inputClass}
          >
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
          </select>
        </div>

        <div>
          <label htmlFor="request-account" className={labelClass}>
            Account
          </label>
          <select
            id="request-account"
            value={account?.id ?? ""}
            onChange={(event) => setAccountId(event.target.value)}
            className={inputClass}
          >
            {activeAccounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.type.charAt(0) + item.type.slice(1).toLowerCase()} -{" "}
                {item.accountNumber}
              </option>
            ))}
          </select>
          {account && (
            <p className="mt-1 text-xs text-slate-500">
              Balance: {formatMoney(account.balance)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="request-amount" className={labelClass}>
            Amount (BDT)
          </label>
          <input
            id="request-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="request-description" className={labelClass}>
          Description (optional)
        </label>
        <textarea
          id="request-description"
          rows={2}
          maxLength={140}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-3 text-sm text-emerald-600">
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="mt-4 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {isLoading ? "Submitting..." : "Submit request"}
      </button>
    </form>
  );
}
