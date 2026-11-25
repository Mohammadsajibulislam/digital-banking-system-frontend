import CustomerRegisterForm from "@/features/customers/customer-register-form";
export default function StaffRegisterCustomerPage() {
  return <div className="mx-auto max-w-3xl space-y-6"><div><h1 className="text-2xl font-semibold text-slate-900">Register customer</h1><p className="text-sm text-slate-500">Create a customer profile and their first bank account.</p></div><CustomerRegisterForm basePath="/staff/customers" /></div>;
}
