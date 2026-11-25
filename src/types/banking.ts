import type { CustomerChartsDTO } from "./analytics";

// Taka (Decimal) API theke string hishebe ashe, tai ekhane string

export type AccountType = "SAVINGS" | "CURRENT" | "BUSINESS";
export type AccountStatus = "ACTIVE" | "FROZEN" | "CLOSED";

export interface AccountDTO {
  id: string;
  accountNumber: string;
  type: AccountType;
  status: AccountStatus;
  balance: string;
  currency: string;
  createdAt: string;
}

export interface RecentTransactionDTO {
  id: string;
  txnId: string;
  type: string;
  status: string;
  description: string | null;
  direction: "DEBIT" | "CREDIT";
  amount: string;
  balanceAfter: string;
  accountNumber: string;
  createdAt: string;
}

export interface ActiveLoanDTO {
  id: string;
  loanNumber: string;
  type: string;
  approvedAmount: string;
  remainingBalance: string;
  monthlyInstallment: string;
}

export interface CustomerDashboardDTO {
  selectedAccountId: string | null;
  totalBalance: string;
  totalDeposits: string;
  totalWithdrawals: string;
  recentTransactions: RecentTransactionDTO[];
  activeLoans: ActiveLoanDTO[];
  charts: CustomerChartsDTO;
}

// ---- Fund transfer ----

export interface RecipientLookupDTO {
  accountNumber: string;
  accountType: AccountType;
  ownerName: string; // masked, jemon "Karim A***"
  isOwnAccount: boolean;
  fee: string;
}

export interface TransferRequestDTO {
  fromAccountId: string;
  toAccountNumber: string;
  amount: string;
  description?: string;
  pin: string;
  idempotencyKey: string;
}

export interface TransferResultDTO {
  id: string;
  txnId: string;
  status: string;
  amount: string;
  fee: string;
  total: string;
  description: string | null;
  createdAt: string;
  fromAccountNumber: string;
  toAccountNumber: string;
  toName: string;
  duplicate: boolean;
}