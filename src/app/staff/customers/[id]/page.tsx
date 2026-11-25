import CustomerDetail from "@/features/customers/customer-detail";
export default async function StaffCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetail customerId={id} backHref="/staff/customers" />;
}
