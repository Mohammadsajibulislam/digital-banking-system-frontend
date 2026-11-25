"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AccountType } from "@/types/banking";
import { getErrorMessage } from "@/lib/utils";
import { useRegisterCustomerMutation } from "./customers-api";

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export default function CustomerRegisterForm({ basePath }: { basePath: string }) {
  const router = useRouter();
  const [register, { isLoading }] = useRegisterCustomerMutation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("SAVINGS");
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState<{ password: string; pin: string } | null>(null);
  const [customerId, setCustomerId] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!/^01\d{9}$/.test(phone)) return setError("Phone must be 11 digits and start with 01");
    try {
      const result = await register({ name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), address: address.trim() || undefined, accountType }).unwrap();
      setCredentials(result.credentials);
      setCustomerId(result.customer.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  if (credentials) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Customer registered</h2>
        <p className="mt-1 text-sm text-slate-600">Give these temporary credentials to the customer once. They will not be shown again.</p>
        <dl className="mt-5 space-y-3 rounded-lg bg-slate-50 p-4 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Email</dt><dd className="font-medium">{email}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Password</dt><dd className="font-mono font-semibold">{credentials.password}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Transaction PIN</dt><dd className="font-mono font-semibold">{credentials.pin}</dd></div></dl>
        <div className="mt-5 flex gap-3"><button type="button" onClick={() => setCredentials(null)} className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium">Register another</button><button type="button" onClick={() => router.push(`${basePath}/${customerId}`)} className="flex-1 rounded-lg bg-blue-700 py-2.5 text-sm font-medium text-white">View customer</button></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="reg-name" className="mb-1 block text-sm font-medium text-slate-700">Full name</label><input id="reg-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></div>
        <div><label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-slate-700">Email</label><input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></div>
        <div><label htmlFor="reg-phone" className="mb-1 block text-sm font-medium text-slate-700">Phone</label><input id="reg-phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))} className={inputClass} /></div>
        <div><label htmlFor="reg-type" className="mb-1 block text-sm font-medium text-slate-700">First account type</label><select id="reg-type" value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)} className={inputClass}><option value="SAVINGS">Savings</option><option value="CURRENT">Current</option><option value="BUSINESS">Business</option></select></div>
      </div>
      <div><label htmlFor="reg-address" className="mb-1 block text-sm font-medium text-slate-700">Address (optional)</label><textarea id="reg-address" rows={3} maxLength={200} value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} /></div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3"><Link href={basePath} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700">Cancel</Link><button type="submit" disabled={isLoading} className="flex-1 rounded-lg bg-blue-700 py-2.5 font-medium text-white disabled:opacity-60">{isLoading ? "Registering..." : "Register customer"}</button></div>
    </form>
  );
}
