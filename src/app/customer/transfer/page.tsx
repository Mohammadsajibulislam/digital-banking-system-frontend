import TransferForm from "@/features/transfers/transfer-form";

export default function TransferPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Fund Transfer</h1>
        <p className="text-sm text-slate-500">
          Send money to another customer or between your own accounts.
        </p>
      </div>
      <TransferForm />
    </div>
  );
}