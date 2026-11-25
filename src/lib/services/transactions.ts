import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/auth-guard";
import { maskName } from "@/lib/services/transfer";
import type { AppRole } from "@/lib/roles";

export interface Viewer {
  id: string;
  role: AppRole;
}

export interface TransactionQuery {
  page: number;
  pageSize: number;
  q?: string;
  type?: "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "LOAN_DISBURSEMENT" | "LOAN_REPAYMENT";
  status?: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  from?: string;
  to?: string;
  accountId?: string;
}

const accountSelect = {
  select: {
    accountNumber: true,
    ownerId: true,
    owner: { select: { name: true } },
  },
} as const;

const include = {
  senderAccount: accountSelect,
  receiverAccount: accountSelect,
} satisfies Prisma.TransactionInclude;

type Row = Prisma.TransactionGetPayload<{ include: typeof include }>;

const dayStart = (date: string) => new Date(`${date}T00:00:00.000+06:00`);
const dayEnd = (date: string) => new Date(`${date}T23:59:59.999+06:00`);

async function ownedAccountIds(userId: string) {
  const accounts = await prisma.account.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });
  return accounts.map((account) => account.id);
}

function customerScope(accountIds: string[]): Prisma.TransactionWhereInput {
  return {
    OR: [
      { senderAccountId: { in: accountIds } },
      {
        receiverAccountId: { in: accountIds },
        status: { in: ["COMPLETED", "REVERSED"] },
      },
    ],
  };
}

export interface TransactionItem {
  id: string;
  txnId: string;
  type: string;
  status: string;
  amount: string;
  fee: string;
  description: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  fromAccountNumber: string | null;
  fromName: string | null;
  toAccountNumber: string | null;
  toName: string | null;
  direction: "DEBIT" | "CREDIT" | null;
}

function toItem(row: Row, viewer: Viewer, scopeIds: string[]): TransactionItem {
  const isCustomer = viewer.role === "CUSTOMER";
  const nameOf = (account: Row["senderAccount"]) => {
    if (!account) return null;
    return isCustomer && account.ownerId !== viewer.id
      ? maskName(account.owner.name)
      : account.owner.name;
  };

  let direction: TransactionItem["direction"] = null;
  if (isCustomer) {
    direction =
      row.senderAccountId && scopeIds.includes(row.senderAccountId)
        ? "DEBIT"
        : "CREDIT";
  }

  return {
    id: row.id,
    txnId: row.txnId,
    type: row.type,
    status: row.status,
    amount: row.amount.toFixed(2),
    fee: row.fee.toFixed(2),
    description: row.description,
    failureReason: row.failureReason,
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    fromAccountNumber: row.senderAccount?.accountNumber ?? null,
    fromName: nameOf(row.senderAccount),
    toAccountNumber: row.receiverAccount?.accountNumber ?? null,
    toName: nameOf(row.receiverAccount),
    direction,
  };
}

export async function listTransactions(viewer: Viewer, query: TransactionQuery) {
  const conditions: Prisma.TransactionWhereInput[] = [];
  let scopeIds: string[] = [];

  if (viewer.role === "CUSTOMER") {
    const owned = await ownedAccountIds(viewer.id);
    scopeIds = owned;

    if (query.accountId) {
      if (!owned.includes(query.accountId)) {
        throw new HttpError(404, "Account not found");
      }
      scopeIds = [query.accountId];
    }
    conditions.push(customerScope(scopeIds));
  }

  if (query.q) conditions.push({ txnId: { contains: query.q, mode: "insensitive" } });
  if (query.type) conditions.push({ type: query.type });
  if (query.status) conditions.push({ status: query.status });
  if (query.from) conditions.push({ createdAt: { gte: dayStart(query.from) } });
  if (query.to) conditions.push({ createdAt: { lte: dayEnd(query.to) } });

  const where: Prisma.TransactionWhereInput = { AND: conditions };
  const [total, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      include,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    items: rows.map((row) => toItem(row, viewer, scopeIds)),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getTransactionDetail(viewer: Viewer, txnId: string) {
  const conditions: Prisma.TransactionWhereInput[] = [{ txnId }];
  let scopeIds: string[] = [];

  if (viewer.role === "CUSTOMER") {
    scopeIds = await ownedAccountIds(viewer.id);
    conditions.push(customerScope(scopeIds));
  }

  const row = await prisma.transaction.findFirst({
    where: { AND: conditions },
    include: {
      ...include,
      ledgerEntries: {
        include: { account: { select: { accountNumber: true, ownerId: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!row) throw new HttpError(404, "Transaction not found");

  const ledger = row.ledgerEntries
    .filter((entry) => viewer.role !== "CUSTOMER" || entry.account.ownerId === viewer.id)
    .map((entry) => ({
      id: entry.id,
      accountNumber: entry.account.accountNumber,
      direction: entry.direction,
      amount: entry.amount.toFixed(2),
      balanceAfter: entry.balanceAfter.toFixed(2),
    }));

  return { ...toItem(row, viewer, scopeIds), ledger };
}
