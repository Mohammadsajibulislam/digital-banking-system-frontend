import FlagList from "@/features/flags/flag-list";

export default function AdminFlagsPage() {
  return <div className="mx-auto max-w-6xl space-y-5"><div><h1 className="text-2xl font-semibold text-slate-900">Flagged Transactions</h1><p className="text-sm text-slate-500">Review transactions that staff flagged as suspicious.</p></div><FlagList reviewMode txnBasePath="/admin/transactions" /></div>;
}
