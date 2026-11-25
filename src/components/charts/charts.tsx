"use client";

import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatMoney } from "@/lib/utils";

export const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
export interface Series { key: string; label: string; color: string }
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const axisText = { fontSize: 12, fill: "#64748b" };

function formatValue(value: unknown, money: boolean) {
  return money ? formatMoney(Number(value)) : String(value);
}

export function ChartCard({ title, subtitle, isEmpty, children }: { title: string; subtitle?: string; isEmpty?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4 h-64">{isEmpty ? <div className="flex h-full items-center justify-center text-sm text-slate-500">No data yet</div> : children}</div>
    </section>
  );
}

export function MonthlyBarChart({ data, series, money = true }: { data: object[]; series: Series[]; money?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={axisText} tickLine={false} axisLine={false} />
        <YAxis tick={axisText} tickLine={false} axisLine={false} width={48} tickFormatter={(value) => compact.format(Number(value))} />
        <Tooltip formatter={(value) => formatValue(value, money)} />
        {series.length > 1 && <Legend />}
        {series.map((item) => <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color} radius={[4, 4, 0, 0]} />)}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyLineChart({ data, series, money = true }: { data: object[]; series: Series[]; money?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="label" tick={axisText} tickLine={false} axisLine={false} />
        <YAxis tick={axisText} tickLine={false} axisLine={false} width={48} allowDecimals={false} tickFormatter={(value) => compact.format(Number(value))} />
        <Tooltip formatter={(value) => formatValue(value, money)} />
        {series.length > 1 && <Legend />}
        {series.map((item) => <Line key={item.key} type="monotone" dataKey={item.key} name={item.label} stroke={item.color} strokeWidth={2} dot={{ r: 3 }} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, colors = CHART_COLORS, money = false }: { data: { name: string; value: number }[]; colors?: string[]; money?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((entry, index) => <Cell key={entry.name} fill={colors[index % colors.length]} />)}
        </Pie>
        <Tooltip formatter={(value) => formatValue(value, money)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
