"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FiCheckCircle, FiSend } from "react-icons/fi";
import Modal from "@/components/ui/modal";
import StatusBadge from "@/components/ui/status-badge";
import { useGetMyAccountsQuery } from "@/features/accounts/accounts-api";
import {
  useCreateTransferMutation,
  useLazyLookupAccountQuery,
} from "@/features/transfers/transfers-api";
import { formatDate, formatMoney, getErrorMessage } from "@/lib/utils";
import type { RecipientLookupDTO, TransferResultDTO } from "@/types/banking";

type Mode = "other" | "own";

const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;
const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function TransferForm() {
  const { data: accounts, isLoading } = useGetMyAccountsQuery();
  const [lookup, { isFetching: looking }] = useLazyLookupAccountQuery();
  const [createTransfer, { isLoading: sending }] = useCreateTransferMutation();

  const [fromId, setFromId] = useState("");
  const [mode, setMode] = useState<Mode>("other");
  const [toNumber, setToNumber] = useState("");
  const [ownTargetId, setOwnTargetId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [pin, setPin] = useState("");

  const [formError, setFormError] = useState("");
  const [dialogError, setDialogError] = useState("");
  const [recipient, setRecipient] = useState<RecipientLookupDTO | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<TransferResultDTO | null>(null);

  // Duplicate transfer thamanor key. Confirm dialog khulle toiri hoy.
  const idempotencyKey = useRef("");

  const activeAccounts = accounts?.filter((a) => a.status === "ACTIVE") ?? [];
  const fromAccount =
    activeAccounts.find((a) => a.id === fromId) ?? activeAccounts[0] ?? null;
  const ownTargets = activeAccounts.filter((a) => a.id !== fromAccount?.id);
  const ownTarget =
    ownTargets.find((a) => a.id === ownTargetId) ?? ownTargets[0] ?? null;

  function resetAll() {
    setResult(null);
    setRecipient(null);
    setToNumber("");
    setAmount("");
    setDescription("");
    setPin("");
    setFormError("");
    setDialogError("");
  }

  async function handleContinue(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");

    if (!fromAccount) {
      setFormError("You do not have an active account to transfer from");
      return;
    }

    const target =
      mode === "own" ? ownTarget?.accountNumber : toNumber.trim();

    if (!target) {
      setFormError(
        mode === "own"
          ? "You need another active account to transfer between your own accounts"
          : "Enter the recipient account number"
      );
      return;
    }
    if (!/^\d{10}$/.test(target)) {
      setFormError("Account number must be 10 digits");
      return;
    }
    if (target === fromAccount.accountNumber) {
      setFormError("You cannot transfer to the same account");
      return;
    }
    if (!AMOUNT_PATTERN.test(amount) || Number(amount) <= 0) {
      setFormError("Enter a valid amount (up to 2 decimal places)");
      return;
    }
    if (Number(amount) > Number(fromAccount.balance)) {
      setFormError("Amount is more than your available balance");
      return;
    }

    // Server theke recipient verify kori (naam dekhanor jonno)
    const res = await lookup(target);
    if (res.isError || !res.data) {
      setFormError(getErrorMessage(res.error));
      return;
    }

    setRecipient(res.data);
    setPin("");
    setDialogError("");
    idempotencyKey.current = crypto.randomUUID();
    setConfirmOpen(true);
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fromAccount || !recipient || sending) return;

    if (!/^\d{4}$/.test(pin)) {
      setDialogError("Enter your 4-digit transaction PIN");
      return;
    }

    setDialogError("");
    try {
      const res = await createTransfer({
        fromAccountId: fromAccount.id,
        toAccountNumber: recipient.accountNumber,
        amount,
        description: description.trim() || undefined,
        pin,
        idempotencyKey: idempotencyKey.current,
      }).unwrap();

      setResult(res);
      setConfirmOpen(false);
    } catch (err) {
      setDialogError(getErrorMessage(err));
      setPin("");
      // Server error response dile notun key, karon oi request shesh.
      // Network error hole ager key-i rakhi, jate retry holeo duplicate na hoy.
      if (typeof (err as { status?: unknown }).status === "number") {
        idempotencyKey.current = crypto.randomUUID();
      }
    }
  }

  // ---------------- Success ----------------
  if (result) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <FiCheckCircle className="h-12 w-12 text-emerald-600" />
          <h2 className="mt-3 text-xl font-semibold text-slate-900">
            Transfer successful
          </h2>
          <p className="text-sm text-slate-500">
            {formatMoney(result.amount)} sent to {result.toName}
          </p>
        </div>

        <dl className="mt-6 space-y-3 border-t border-slate-100 pt-4 text-sm">
          <Row label="Transaction ID" value={result.txnId} />
          <Row label="From account" value={result.fromAccountNumber} />
          <Row label="To account" value={result.toAccountNumber} />
          <Row label="Amount" value={formatMoney(result.amount)} />
          <Row label="Fee" value={formatMoney(result.fee)} />
          <Row label="Total debited" value={formatMoney(result.total)} />
          <Row label="Date" value={formatDate(result.createdAt)} />
          {result.description && (
            <Row label="Description" value={result.description} />
          )}
          <div className="flex justify-between">
            <dt className="text-slate-500">Status</dt>
            <dd>
              <StatusBadge status={result.status} />
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={resetAll}
            className="flex-1 rounded-lg bg-blue-700 py-2.5 text-sm font-medium text-white hover:bg-blue-800"
          >
            New transfer
          </button>
          <Link
            href="/customer"
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ---------------- Form ----------------
  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-slate-200" />;
  }

  if (!fromAccount) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        You do not have an active account. Please contact the bank.
      </div>
    );
  }

  const fee = Number(recipient?.fee ?? 0);
  const total = Number(amount || 0) + fee;

  return (
    <>
      <form
        onSubmit={handleContinue}
        className="mx-auto max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label htmlFor="from" className={labelClass}>
            From account
          </label>
          <select
            id="from"
            value={fromAccount.id}
            onChange={(e) => setFromId(e.target.value)}
            className={inputClass}
          >
            {activeAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.type.charAt(0) + account.type.slice(1).toLowerCase()} -{" "}
                {account.accountNumber}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Available balance: {formatMoney(fromAccount.balance)}
          </p>
        </div>

        <div>
          <span className={labelClass}>Transfer to</span>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            {(
              [
                ["other", "Another customer"],
                ["own", "My own account"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-md py-1.5 text-sm font-medium transition ${
                  mode === value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {mode === "other" ? (
          <div>
            <label htmlFor="to" className={labelClass}>
              Recipient account number
            </label>
            <input
              id="to"
              inputMode="numeric"
              maxLength={10}
              placeholder="10 digit account number"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value.replace(/\D/g, ""))}
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <label htmlFor="own" className={labelClass}>
              To my account
            </label>
            {ownTargets.length === 0 ? (
              <p className="text-sm text-slate-500">
                You have only one active account.
              </p>
            ) : (
              <select
                id="own"
                value={ownTarget?.id ?? ""}
                onChange={(e) => setOwnTargetId(e.target.value)}
                className={inputClass}
              >
                {ownTargets.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.type.charAt(0) + account.type.slice(1).toLowerCase()}{" "}
                    - {account.accountNumber}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <div>
          <label htmlFor="amount" className={labelClass}>
            Amount (BDT)
          </label>
          <input
            id="amount"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Description (optional)
          </label>
          <input
            id="description"
            maxLength={140}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>

        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={looking}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-2.5 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
        >
          <FiSend className="h-4 w-4" />
          {looking ? "Checking recipient..." : "Continue"}
        </button>
      </form>

      {/* Confirmation dialog + PIN */}
      <Modal
        open={confirmOpen}
        title="Confirm transfer"
        onClose={() => {
          if (!sending) setConfirmOpen(false);
        }}
      >
        {recipient && (
          <form onSubmit={handleConfirm} className="space-y-4">
            <dl className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <Row label="From" value={fromAccount.accountNumber} />
              <Row
                label="To"
                value={`${recipient.ownerName} (${recipient.accountNumber})`}
              />
              <Row label="Amount" value={formatMoney(amount)} />
              <Row label="Fee" value={formatMoney(fee)} />
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
                <dt>Total</dt>
                <dd>{formatMoney(total)}</dd>
              </div>
            </dl>

            <div>
              <label htmlFor="pin" className={labelClass}>
                Transaction PIN
              </label>
              <input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className={`${inputClass} tracking-[0.5em]`}
              />
            </div>

            {dialogError && (
              <p role="alert" className="text-sm text-red-600">
                {dialogError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                disabled={sending}
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="flex-1 rounded-lg bg-blue-700 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {sending ? "Sending..." : "Confirm & send"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}