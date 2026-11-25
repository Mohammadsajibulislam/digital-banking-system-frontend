import LoanDetail from "@/features/loans/loan-detail";

export default async function AdminLoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LoanDetail loanId={id} backHref="/admin/loans" />;
}
