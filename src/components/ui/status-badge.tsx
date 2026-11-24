const STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  UNDER_REVIEW: "bg-amber-50 text-amber-700 ring-amber-600/20",
  FROZEN: "bg-sky-50 text-sky-700 ring-sky-600/20",
  INACTIVE: "bg-slate-100 text-slate-600 ring-slate-500/20",
  REVERSED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  FAILED: "bg-red-50 text-red-700 ring-red-600/20",
  REJECTED: "bg-red-50 text-red-700 ring-red-600/20",
  BLOCKED: "bg-red-50 text-red-700 ring-red-600/20",
  CLOSED: "bg-red-50 text-red-700 ring-red-600/20",
  OVERDUE: "bg-red-50 text-red-700 ring-red-600/20",
};

export default function StatusBadge({ status }: { status: string }) {
  const style =
    STYLES[status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${style}`}
    >
      {status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}