import LoanList from "@/features/loans/loan-list";

export default function AdminLoansPage() {
  return <LoanList basePath="/admin/loans" reviewMode />;
}
