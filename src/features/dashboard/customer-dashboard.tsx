"use client";

import type { IconType } from "react-icons";
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiBriefcase,
  FiCreditCard,
} from "react-icons/fi";
import StatusBadge from "@/components/ui/status-badge";
import {
  useGetCustomerDashboardQuery,
  useGetMyAccountsQuery,
} from "@/features/accounts/accounts-api";
import { selectAccount } from "@/features/accounts/accounts-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { formatDate, formatMoney } from "@/lib/utils";

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconType;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`rounded-lg p-2 ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export default function CustomerDashboard() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const selectedAccountId = useAppSelector(
    (state) => state.accounts.selectedAccountId
  );

  const { data: accounts } = useGetMyAccountsQuery();
  const { data, isLoading, isError, refetch } = useGetCustomerDashboardQuery(
    selectedAccountId ?? "all"
  );

  const selectedAccount =
    accounts?.find((account) => account.id === selectedAccountId) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header + account switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-slate-500">
            Here is an overview of your accounts.
          </p>
        </div>

        <div>
          <label
            htmlFor="account-switcher"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Account
          </label>
          <select
            id="account-switcher"
            value={selectedAccountId ?? "all"}
            onChange={(e) =>
              dispatch(
                selectAccount(e.target.value === "all" ? null : e.target.value)
              )
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 sm:w-72"
          >
            <option value="all">All accounts</option>
            {accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.type.charAt(0) + account.type.slice(1).toLowerCase()}{" "}
                - {account.accountNumber}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isError && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <span>Could not load your dashboard.</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        data && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Balance"
              value={formatMoney(data.totalBalance)}
              hint={
                selectedAccount
                  ? `Account ${selectedAccount.accountNumber}`
                  : `${accounts?.length ?? 0} account(s)`
              }
              icon={FiCreditCard}
              tone="bg-blue-50 text-blue-600"
            />
            <StatCard
              label="Total Deposits"
              value={formatMoney(data.totalDeposits)}
              hint="Approved deposits"
              icon={FiArrowDownLeft}
              tone="bg-emerald-50 text-emerald-600"
            />
            <StatCard
              label="Total Withdrawals"
              value={formatMoney(data.totalWithdrawals)}
              hint="Approved withdrawals"
              icon={FiArrowUpRight}
              tone="bg-rose-50 text-rose-600"
            />
            <StatCard
              label="Active Loans"
              value={String(data.activeLoans.length)}
              hint={
                data.activeLoans.length > 0
                  ? `${formatMoney(
                      data.activeLoans.reduce(
                        (sum, loan) => sum + Number(loan.remainingBalance),
                        0
                      )
                    )} remaining`
                  : "No active loan"
              }
              icon={FiBriefcase}
              tone="bg-amber-50 text-amber-600"
            />
          </div>
        )
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent transactions */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-2">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Recent Transactions
            </h2>
          </div>

          {isLoading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : data && data.recentTransactions.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {data.recentTransactions.map((tx) => {
                const credit = tx.direction === "CREDIT";
                return (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {tx.description ??
                          tx.type.replace(/_/g, " ").toLowerCase()}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {tx.txnId} | {formatDate(tx.createdAt)} | Acc{" "}
                        {tx.accountNumber.slice(-4)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-semibold ${
                          credit ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {credit ? "+" : "-"}
                        {formatMoney(tx.amount)}
                      </p>
                      <StatusBadge status={tx.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-5 text-sm text-slate-500">No transactions yet.</p>
          )}
        </section>

        {/* Account information */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Account Information
            </h2>
          </div>

          {selectedAccount ? (
            <dl className="space-y-3 p-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Account number</dt>
                <dd className="font-medium text-slate-900">
                  {selectedAccount.accountNumber}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Type</dt>
                <dd className="font-medium capitalize text-slate-900">
                  {selectedAccount.type.toLowerCase()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <StatusBadge status={selectedAccount.status} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Available balance</dt>
                <dd className="font-semibold text-slate-900">
                  {formatMoney(selectedAccount.balance)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Opened</dt>
                <dd className="text-slate-900">
                  {formatDate(selectedAccount.createdAt)}
                </dd>
              </div>
            </dl>
          ) : (
            <ul className="divide-y divide-slate-100">
              {accounts?.map((account) => (
                <li key={account.id}>
                  <button
                    type="button"
                    onClick={() => dispatch(selectAccount(account.id))}
                    className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize text-slate-900">
                        {account.type.toLowerCase()}
                      </p>
                      <p className="text-xs text-slate-500">
                        {account.accountNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatMoney(account.balance)}
                      </p>
                      <StatusBadge status={account.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Active loans */}
      {data && data.activeLoans.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Active Loans</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {data.activeLoans.map((loan) => (
              <li
                key={loan.id}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {loan.loanNumber}{" "}
                    <span className="capitalize text-slate-500">
                      ({loan.type.toLowerCase()})
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Monthly installment {formatMoney(loan.monthlyInstallment)}
                  </p>
                </div>
                <div className="text-sm sm:text-right">
                  <p className="font-semibold text-slate-900">
                    {formatMoney(loan.remainingBalance)} remaining
                  </p>
                  <p className="text-xs text-slate-500">
                    of {formatMoney(loan.approvedAmount)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}