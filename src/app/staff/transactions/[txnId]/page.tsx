import TransactionDetail from "@/features/transactions/transaction-detail";
export default async function StaffTransactionDetailPage({ params }: { params: Promise<{ txnId: string }> }) {
  const { txnId } = await params;
  return <TransactionDetail txnId={txnId} backHref="/staff/transactions" />;
}
