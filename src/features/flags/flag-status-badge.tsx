const STYLES: Record<string, string> = {
  OPEN: "bg-red-50 text-red-700 ring-red-600/20",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DISMISSED: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export default function FlagStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${STYLES[status] ?? STYLES.DISMISSED}`}>
      {status.toLowerCase()}
    </span>
  );
}
