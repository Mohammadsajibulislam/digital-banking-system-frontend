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
}