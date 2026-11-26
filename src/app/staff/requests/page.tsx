import RequestList from "@/features/requests/request-list";

export default function StaffRequestsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">Deposit and Withdrawal Requests</h1><p className="text-sm text-slate-500">Review customer deposit and withdrawal requests.</p></div>
      <RequestList reviewMode />
    </div>
  );
}
