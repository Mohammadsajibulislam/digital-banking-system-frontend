import FlagList from "@/features/flags/flag-list";

export default function StaffFlagsPage() {
  return <div className="mx-auto max-w-6xl space-y-5"><div><h1 className="text-2xl font-semibold text-slate-900">My Flagged Transactions</h1><p className="text-sm text-slate-500">Transactions you flagged and the admin&apos;s decision.</p></div><FlagList reviewMode={false} txnBasePath="/staff/transactions" /></div>;
}
