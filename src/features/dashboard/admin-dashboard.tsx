"use client";

import { FiActivity, FiArrowDownLeft, FiArrowUpRight, FiClock, FiCreditCard, FiLayers, FiUsers } from "react-icons/fi";
import { ChartCard, DonutChart, MonthlyBarChart, MonthlyLineChart } from "@/components/charts/charts";
import StatCard from "@/components/ui/stat-card";
import { formatMoney } from "@/lib/utils";
import { useGetAdminDashboardQuery } from "./dashboard-api";

export default function AdminDashboard() {
  const { data, isLoading, isError, refetch } = useGetAdminDashboardQuery();
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1><p className="text-sm text-slate-500">Bank-wide overview. All figures are calculated live from the database.</p></div>
      {isError && <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>Could not load the dashboard.</span><button type="button" onClick={() => refetch()} className="rounded-lg bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">Retry</button></div>}
      {isLoading && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0,1,2,3,4,5,6].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200" />)}</div>}
      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Registered Customers" value={String(data.stats.totalCustomers)} icon={FiUsers} tone="bg-blue-50 text-blue-600" />
            <StatCard label="Bank Accounts" value={String(data.stats.totalAccounts)} icon={FiCreditCard} tone="bg-violet-50 text-violet-600" />
            <StatCard label="Total Bank Balance" value={formatMoney(data.stats.totalBalance)} hint="Across all accounts" icon={FiLayers} tone="bg-sky-50 text-sky-600" />
            <StatCard label="Total Transactions" value={String(data.stats.totalTransactions)} hint="Completed" icon={FiActivity} tone="bg-slate-100 text-slate-600" />
            <StatCard label="Total Deposits" value={formatMoney(data.stats.totalDeposits)} icon={FiArrowDownLeft} tone="bg-emerald-50 text-emerald-600" />
            <StatCard label="Total Withdrawals" value={formatMoney(data.stats.totalWithdrawals)} icon={FiArrowUpRight} tone="bg-rose-50 text-rose-600" />
            <StatCard label="Pending Loan Applications" value={String(data.stats.pendingLoans)} hint="Pending and under review" icon={FiClock} tone="bg-amber-50 text-amber-600" href="/admin/loans" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Monthly Transaction Volume" subtitle="Total amount of completed transactions, last 6 months" isEmpty={!data.monthly.some((month) => month.volume > 0)}>
              <MonthlyBarChart data={data.monthly} series={[{ key: "volume", label: "Volume", color: "#2563eb" }]} />
            </ChartCard>
            <ChartCard title="Deposit vs Withdrawal" subtitle="Approved deposits and withdrawals by month" isEmpty={!data.monthly.some((month) => month.deposits > 0 || month.withdrawals > 0)}>
              <MonthlyBarChart data={data.monthly} series={[{ key: "deposits", label: "Deposits", color: "#10b981" }, { key: "withdrawals", label: "Withdrawals", color: "#ef4444" }]} />
            </ChartCard>
            <ChartCard title="Monthly Banking Activity" subtitle="Number of transactions and new loan applications" isEmpty={!data.monthly.some((month) => month.count > 0 || month.loanApplications > 0)}>
              <MonthlyLineChart data={data.monthly} money={false} series={[{ key: "count", label: "Transactions", color: "#2563eb" }, { key: "loanApplications", label: "Loan applications", color: "#f59e0b" }]} />
            </ChartCard>
            <ChartCard title="Account Distribution" subtitle="Accounts by type" isEmpty={data.accountDistribution.length === 0}><DonutChart data={data.accountDistribution} /></ChartCard>
            <ChartCard title="Loan Approval Statistics" subtitle="All loan applications by outcome" isEmpty={data.loanStats.every((item) => item.value === 0)}><DonutChart data={data.loanStats} colors={["#10b981", "#ef4444", "#f59e0b"]} /></ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
