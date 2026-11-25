import LoanDetail from "@/features/loans/loan-detail";

export default async function CustomerLoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LoanDetail loanId={id} backHref="/customer/loans" />;
}
