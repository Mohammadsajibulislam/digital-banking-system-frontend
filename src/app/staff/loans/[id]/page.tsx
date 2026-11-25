import LoanDetail from "@/features/loans/loan-detail";

export default async function StaffLoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LoanDetail loanId={id} backHref="/staff/loans" />;
}
