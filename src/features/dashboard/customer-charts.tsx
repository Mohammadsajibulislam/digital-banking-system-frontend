"use client";

import { ChartCard, DonutChart, MonthlyBarChart } from "@/components/charts/charts";
import type { CustomerChartsDTO } from "@/types/analytics";

export default function CustomerCharts({ charts }: { charts: CustomerChartsDTO }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard title="Monthly Spending" subtitle="Money sent out, excluding transfers between your own accounts" isEmpty={!charts.monthlySpending.some((month) => month.amount > 0)}><MonthlyBarChart data={charts.monthlySpending} series={[{ key: "amount", label: "Spending", color: "#ef4444" }]} /></ChartCard>
      <ChartCard title="Monthly Deposit History" subtitle="Approved deposits by month" isEmpty={!charts.monthlyDeposits.some((month) => month.amount > 0)}><MonthlyBarChart data={charts.monthlyDeposits} series={[{ key: "amount", label: "Deposits", color: "#10b981" }]} /></ChartCard>
      <ChartCard title="Transaction Distribution" subtitle="Number of transactions by type" isEmpty={charts.distribution.length === 0}><DonutChart data={charts.distribution} /></ChartCard>
    </div>
  );
}
