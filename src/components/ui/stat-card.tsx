import Link from "next/link";
import type { IconType } from "react-icons";

export default function StatCard({ label, value, hint, icon: Icon, tone, href }: { label: string; value: string; hint?: string; icon: IconType; tone: string; href?: string }) {
  const card = (
    <div className={`h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${href ? "transition hover:border-blue-300 hover:shadow" : ""}`}>
      <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className={`rounded-lg p-2 ${tone}`}><Icon className="h-5 w-5" /></span></div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{card}</Link> : card;
}
