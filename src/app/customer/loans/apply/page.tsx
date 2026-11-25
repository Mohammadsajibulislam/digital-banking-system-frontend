import LoanApplyForm from "@/features/loans/loan-apply-form";

export default function ApplyLoanPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Apply for a loan</h1>
        <p className="text-sm text-slate-500">Your application will be reviewed by bank staff and approved by an admin.</p>
      </div>
      <LoanApplyForm />
    </div>
  );
}
