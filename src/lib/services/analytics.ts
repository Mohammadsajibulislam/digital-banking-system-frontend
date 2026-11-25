import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminDashboardDTO, CustomerChartsDTO, NamedValue, StaffDashboardDTO } from "@/types/analytics";

const MONTHS = 6;
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const windowStart = Prisma.sql`date_trunc('month', NOW() AT TIME ZONE 'Asia/Dhaka') - (${MONTHS - 1}::int * interval '1 month')`;

const TYPE_NAMES: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  TRANSFER: "Transfer",
  LOAN_DISBURSEMENT: "Loan disbursement",
  LOAN_REPAYMENT: "Loan repayment",
};
const ACCOUNT_TYPE_NAMES: Record<string, string> = {
  SAVINGS: "Savings",
  CURRENT: "Current",
  BUSINESS: "Business",
};
const money = (value: Prisma.Decimal | null) =>
  (value ?? new Prisma.Decimal(0)).toFixed(2);

function lastMonths() {
  const nowDhaka = new Date(Date.now() + DHAKA_OFFSET_MS);
  const year = nowDhaka.getUTCFullYear();
  const month = nowDhaka.getUTCMonth();
  const labelFormat = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
  return Array.from({ length: MONTHS }, (_, i) => {
    const date = new Date(Date.UTC(year, month - (MONTHS - 1 - i), 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return { key, label: labelFormat.format(date) };
  });
}

export async function getAdminAnalytics(): Promise<AdminDashboardDTO> {
  const months = lastMonths();
  const [
    customers,
    accounts,
    balance,
    deposits,
    withdrawals,
    transactions,
    pendingLoans,
    txnRows,
    loanRows,
    accountGroups,
    loanGroups,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.account.count(),
    prisma.account.aggregate({ _sum: { balance: true } }),
    prisma.transaction.aggregate({ where: { type: "DEPOSIT", status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { type: "WITHDRAWAL", status: "COMPLETED" }, _sum: { amount: true } }),
    prisma.transaction.count({ where: { status: "COMPLETED" } }),
    prisma.loan.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    prisma.$queryRaw<{ month: string; type: string; count: number; total: string }[]>`
      SELECT to_char(date_trunc('month', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka'), 'YYYY-MM') AS month,
             "type"::text AS type, COUNT(*)::int AS count, COALESCE(SUM("amount"), 0)::text AS total
      FROM "Transaction"
      WHERE "status" = 'COMPLETED'
        AND ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka' >= ${windowStart}
      GROUP BY 1, 2
    `,
    prisma.$queryRaw<{ month: string; count: number }[]>`
      SELECT to_char(date_trunc('month', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka'), 'YYYY-MM') AS month,
             COUNT(*)::int AS count
      FROM "Loan"
      WHERE ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka' >= ${windowStart}
      GROUP BY 1
    `,
    prisma.account.groupBy({ by: ["type"], _count: { _all: true } }),
    prisma.loan.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const monthly = months.map(({ key, label }) => {
    const rows = txnRows.filter((row) => row.month === key);
    const sum = (type?: string) => rows.filter((row) => !type || row.type === type).reduce((total, row) => total + Number(row.total), 0);
    return {
      month: key,
      label,
      volume: sum(),
      count: rows.reduce((total, row) => total + row.count, 0),
      deposits: sum("DEPOSIT"),
      withdrawals: sum("WITHDRAWAL"),
      transfers: sum("TRANSFER"),
      loanApplications: loanRows.find((row) => row.month === key)?.count ?? 0,
    };
  });

  const accountDistribution: NamedValue[] = accountGroups.map((group) => ({
    name: ACCOUNT_TYPE_NAMES[group.type] ?? group.type,
    value: group._count._all,
  }));
  const countOf = (...statuses: string[]) => loanGroups.filter((group) => statuses.includes(group.status)).reduce((total, group) => total + group._count._all, 0);
  const loanStats: NamedValue[] = [
    { name: "Approved", value: countOf("APPROVED", "ACTIVE", "COMPLETED") },
    { name: "Rejected", value: countOf("REJECTED") },
    { name: "Pending", value: countOf("PENDING", "UNDER_REVIEW") },
  ];

  return {
    stats: {
      totalCustomers: customers,
      totalAccounts: accounts,
      totalBalance: money(balance._sum.balance),
      totalDeposits: money(deposits._sum.amount),
      totalWithdrawals: money(withdrawals._sum.amount),
      totalTransactions: transactions,
      pendingLoans,
    },
    monthly,
    accountDistribution,
    loanStats,
  };
}

export async function getCustomerCharts(userId: string, accountIds: string[]): Promise<CustomerChartsDTO> {
  const months = lastMonths();
  const fill = (rows: { month: string; total: string }[]) => months.map(({ key, label }) => ({
    month: key,
    label,
    amount: Number(rows.find((row) => row.month === key)?.total ?? 0),
  }));
  if (accountIds.length === 0) return { monthlySpending: fill([]), monthlyDeposits: fill([]), distribution: [] };
  const ids = Prisma.join(accountIds);

  const [spendingRows, depositRows, distributionRows] = await Promise.all([
    prisma.$queryRaw<{ month: string; total: string }[]>`
      SELECT to_char(date_trunc('month', (le."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka'), 'YYYY-MM') AS month,
             COALESCE(SUM(le."amount"), 0)::text AS total
      FROM "LedgerEntry" le
      JOIN "Transaction" t ON t."id" = le."transactionId"
      LEFT JOIN "Account" ra ON ra."id" = t."receiverAccountId"
      WHERE le."accountId" IN (${ids})
        AND le."direction" = 'DEBIT'
        AND t."status" = 'COMPLETED'
        AND (ra."ownerId" IS NULL OR ra."ownerId" <> ${userId})
        AND (le."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka' >= ${windowStart}
      GROUP BY 1
    `,
    prisma.$queryRaw<{ month: string; total: string }[]>`
      SELECT to_char(date_trunc('month', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka'), 'YYYY-MM') AS month,
             COALESCE(SUM("amount"), 0)::text AS total
      FROM "Transaction"
      WHERE "type" = 'DEPOSIT'
        AND "status" = 'COMPLETED'
        AND "receiverAccountId" IN (${ids})
        AND ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka' >= ${windowStart}
      GROUP BY 1
    `,
    prisma.$queryRaw<{ type: string; count: number }[]>`
      SELECT t."type"::text AS type, COUNT(DISTINCT t."id")::int AS count
      FROM "LedgerEntry" le
      JOIN "Transaction" t ON t."id" = le."transactionId"
      WHERE le."accountId" IN (${ids}) AND t."status" = 'COMPLETED'
      GROUP BY 1
      ORDER BY 2 DESC
    `,
  ]);

  return {
    monthlySpending: fill(spendingRows),
    monthlyDeposits: fill(depositRows),
    distribution: distributionRows.map((row) => ({
      name: TYPE_NAMES[row.type] ?? row.type,
      value: row.count,
    })),
  };
}

export async function getStaffOverview(): Promise<StaffDashboardDTO> {
  const nowDhaka = new Date(Date.now() + DHAKA_OFFSET_MS);
  const todayStart = new Date(
    Date.UTC(nowDhaka.getUTCFullYear(), nowDhaka.getUTCMonth(), nowDhaka.getUTCDate()) - DHAKA_OFFSET_MS
  );
  const [pendingRequests, loansToForward, unverifiedCustomers, todayTransactions, recent] = await Promise.all([
    prisma.depositWithdrawRequest.count({ where: { status: "PENDING" } }),
    prisma.loan.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "CUSTOMER", isVerified: false } }),
    prisma.transaction.count({ where: { status: "COMPLETED", createdAt: { gte: todayStart } } }),
    prisma.depositWithdrawRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: {
        requestedBy: { select: { name: true } },
        account: { select: { accountNumber: true } },
      },
    }),
  ]);
  return {
    pendingRequests,
    loansToForward,
    unverifiedCustomers,
    todayTransactions,
    recentRequests: recent.map((request) => ({
      id: request.id,
      type: request.type,
      amount: request.amount.toFixed(2),
      requesterName: request.requestedBy.name,
      accountNumber: request.account.accountNumber,
      createdAt: request.createdAt.toISOString(),
    })),
  };
}
