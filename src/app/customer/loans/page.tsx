import LoanList from "@/features/loans/loan-list";

export default function CustomerLoansPage() {
  return <LoanList basePath="/customer/loans" reviewMode={false} />;
}
