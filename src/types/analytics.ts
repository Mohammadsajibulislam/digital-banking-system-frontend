export type MonthlyPoint = {
  month: string;
  label: string;
  volume: number;
  count: number;
  deposits: number;
  withdrawals: number;
  transfers: number;
  loanApplications: number;
};

export type NamedValue = { name: string; value: number };

export type AdminDashboardDTO = {
  stats: {
    totalCustomers: number;
    totalAccounts: number;
    totalBalance: string;
    totalDeposits: string;
    totalWithdrawals: string;
    totalTransactions: number;
    pendingLoans: number;
  };
  monthly: MonthlyPoint[];
  accountDistribution: NamedValue[];
  loanStats: NamedValue[];
};

export type MonthAmount = { month: string; label: string; amount: number };

export type CustomerChartsDTO = {
  monthlySpending: MonthAmount[];
  monthlyDeposits: MonthAmount[];
  distribution: NamedValue[];
};

export type StaffDashboardDTO = {
  pendingRequests: number;
  loansToForward: number;
  unverifiedCustomers: number;
  todayTransactions: number;
  recentRequests: {
    id: string;
    type: string;
    amount: string;
    requesterName: string;
    accountNumber: string;
    createdAt: string;
  }[];
};
