import RequestForm from "@/features/requests/request-form";
import RequestList from "@/features/requests/request-list";

export default function CustomerRequestsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div><h1 className="text-2xl font-semibold text-slate-900">Deposit and Withdrawal</h1><p className="text-sm text-slate-500">Submit a request and track its approval status.</p></div>
      <RequestForm />
      <div><h2 className="mb-3 font-semibold text-slate-900">My requests</h2><RequestList reviewMode={false} /></div>
    </div>
  );
}
