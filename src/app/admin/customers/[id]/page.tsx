import CustomerDetail from "@/features/customers/customer-detail";
export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetail customerId={id} backHref="/admin/customers" />;
}
