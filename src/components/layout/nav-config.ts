import type { IconType } from "react-icons";
import {
  FiBriefcase,
  FiCreditCard,
  FiHome,
  FiFlag,
  FiList,
  FiRepeat,
  FiSend,
  FiSettings,
  FiUsers,
} from "react-icons/fi";
import type { AppRole } from "@/lib/roles";

export interface NavItem {
  label: string;
  href: string;
  icon: IconType;
}

// Page gulo dhire dhire banabo. Ekhon shudhu Dashboard ache.
export const NAV_ITEMS: Record<AppRole, NavItem[]> = {
  CUSTOMER: [
    { label: "Dashboard", href: "/customer", icon: FiHome },
    { label: "Accounts", href: "/customer/accounts", icon: FiCreditCard },
    { label: "Transfer", href: "/customer/transfer", icon: FiSend },
    { label: "Transactions", href: "/customer/transactions", icon: FiList },
    { label: "Deposit & Withdraw", href: "/customer/requests", icon: FiRepeat },
    { label: "Loans", href: "/customer/loans", icon: FiBriefcase },
  ],
  STAFF: [
    { label: "Dashboard", href: "/staff", icon: FiHome },
    { label: "Customers", href: "/staff/customers", icon: FiUsers },
    { label: "Transactions", href: "/staff/transactions", icon: FiList },
    { label: "Requests", href: "/staff/requests", icon: FiRepeat },
    { label: "Loans", href: "/staff/loans", icon: FiBriefcase },
    { label: "Flagged", href: "/staff/flags", icon: FiFlag },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin", icon: FiHome },
    { label: "Customers", href: "/admin/customers", icon: FiUsers },
    { label: "Accounts", href: "/admin/accounts", icon: FiCreditCard },
    { label: "Transactions", href: "/admin/transactions", icon: FiList },
    { label: "Requests", href: "/admin/requests", icon: FiRepeat },
    { label: "Loans", href: "/admin/loans", icon: FiBriefcase },
    { label: "Flags", href: "/admin/flags", icon: FiFlag },
    { label: "Settings", href: "/admin/settings", icon: FiSettings },
  ],
};