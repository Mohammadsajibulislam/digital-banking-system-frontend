import TransactionDetail from "@/features/transactions/transaction-detail";

export default async function CustomerTransactionDetailPage({ params }: { params: Promise<{ txnId: string }> }) {
  const { txnId } = await params;
  return <TransactionDetail txnId={txnId} backHref="/customer/transactions" />;
}
