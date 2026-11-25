import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/auth-guard";
import { getSettings } from "@/lib/services/transfer";

type AccountType = "SAVINGS" | "CURRENT" | "BUSINESS";
type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";
const MAX_ACCOUNTS_PER_CUSTOMER = 5;
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function randomPassword(length = 10) {
  let result = "";
  for (let i = 0; i < length; i++) result += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)];
  return result;
}
function randomPin() {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

async function generateAccountNumber(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = `1001${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
    const exists = await tx.account.findUnique({ where: { accountNumber: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new HttpError(500, "Could not generate an account number. Please try again");
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
}
const dec = (value: Prisma.Decimal | null) => value ? value.toFixed(2) : null;

type AccountRow = {
  id: string;
  accountNumber: string;
  type: string;
  status: string;
  balance: Prisma.Decimal;
  dailyTransferLimit: Prisma.Decimal | null;
  maxTransactionAmount: Prisma.Decimal | null;
  minBalance: Prisma.Decimal | null;
  createdAt: Date;
};

function toAccountDto(account: AccountRow) {
  return {
    id: account.id,
    accountNumber: account.accountNumber,
    type: account.type,
    status: account.status,
    balance: account.balance.toFixed(2),
    dailyTransferLimit: dec(account.dailyTransferLimit),
    maxTransactionAmount: dec(account.maxTransactionAmount),
    minBalance: dec(account.minBalance),
    createdAt: account.createdAt.toISOString(),
  };
}

const pagingOf = (total: number, page: number, pageSize: number) => ({
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});

export async function listCustomers(query: { page: number; pageSize: number; q?: string; status?: UserStatus; verified?: boolean }) {
  const q = query.q;
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(query.status ? { status: query.status } : {}),
    ...(query.verified !== undefined ? { isVerified: query.verified } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { accounts: { some: { accountNumber: { contains: q } } } },
    ] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true, name: true, email: true, phone: true, status: true,
        isVerified: true, createdAt: true, accounts: { select: { balance: true } },
      },
    }),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      isVerified: row.isVerified,
      createdAt: row.createdAt.toISOString(),
      accountCount: row.accounts.length,
      totalBalance: row.accounts.reduce((sum, account) => sum.plus(account.balance), new Prisma.Decimal(0)).toFixed(2),
    })),
    ...pagingOf(total, query.page, query.pageSize),
  };
}

export async function getCustomerDetail(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, role: "CUSTOMER" },
    include: {
      accounts: { orderBy: { createdAt: "asc" } },
      registeredBy: { select: { name: true } },
      verifiedBy: { select: { name: true } },
      _count: { select: { loans: true } },
    },
  });
  if (!user) throw new HttpError(404, "Customer not found");
  const ids = user.accounts.map((account) => account.id);
  const transactions = ids.length ? await prisma.transaction.findMany({
    where: { OR: [{ senderAccountId: { in: ids } }, { receiverAccountId: { in: ids } }] },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: {
      senderAccount: { select: { accountNumber: true } },
      receiverAccount: { select: { accountNumber: true } },
    },
  }) : [];

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    status: user.status,
    isVerified: user.isVerified,
    verifiedAt: user.verifiedAt?.toISOString() ?? null,
    verifiedByName: user.verifiedBy?.name ?? null,
    registeredByName: user.registeredBy?.name ?? null,
    createdAt: user.createdAt.toISOString(),
    loanCount: user._count.loans,
    accounts: user.accounts.map(toAccountDto),
    recentTransactions: transactions.map((txn) => {
      const isDebit = txn.senderAccountId !== null && ids.includes(txn.senderAccountId);
      return {
        id: txn.id,
        txnId: txn.txnId,
        type: txn.type,
        status: txn.status,
        amount: txn.amount.toFixed(2),
        description: txn.description,
        direction: isDebit ? ("DEBIT" as const) : ("CREDIT" as const),
        accountNumber: (isDebit ? txn.senderAccount?.accountNumber : txn.receiverAccount?.accountNumber) ?? "",
        createdAt: txn.createdAt.toISOString(),
      };
    }),
  };
}

export async function setCustomerStatus(adminId: string, userId: string, status: UserStatus, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({ where: { id: userId, role: "CUSTOMER" }, select: { id: true, status: true } });
    if (!user) throw new HttpError(404, "Customer not found");
    if (user.status === status) throw new HttpError(409, `Customer is already ${status.toLowerCase()}`);
    await tx.user.update({ where: { id: userId }, data: { status } });
    await tx.auditLog.create({ data: { actorId: adminId, action: `CUSTOMER_${status}`, entity: "User", entityId: userId, metadata: { from: user.status, to: status, reason: reason ?? null } } });
    await tx.notification.create({
      data: {
        userId,
        type: "ACCOUNT_STATUS",
        title: `Your profile is now ${status.toLowerCase()}`,
        message: reason ? `Your profile status was changed to ${status.toLowerCase()}. Reason: ${reason}` : `Your profile status was changed to ${status.toLowerCase()}.`,
      },
    });
    return { id: userId, status };
  });
}

export async function registerCustomer(actorId: string, input: { name: string; email: string; phone: string; address?: string; accountType: AccountType }) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw new HttpError(409, "A user with this email already exists");
  const password = randomPassword();
  const pin = randomPin();
  const [passwordHash, pinHash] = await Promise.all([bcrypt.hash(password, 10), bcrypt.hash(pin, 10)]);
  try {
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name, email: input.email, phone: input.phone, address: input.address || null,
          passwordHash, pinHash, role: "CUSTOMER", registeredById: actorId,
        },
        select: { id: true, name: true, email: true },
      });
      const accountNumber = await generateAccountNumber(tx);
      const account = await tx.account.create({
        data: { accountNumber, type: input.accountType, ownerId: user.id, openedById: actorId },
        select: { accountNumber: true, type: true },
      });
      await tx.notification.create({
        data: { userId: user.id, type: "SYSTEM", title: "Welcome to Digital Bank", message: `Your account ${accountNumber} is ready. Visit the bank to verify your information.` },
      });
      await tx.auditLog.create({ data: { actorId, action: "CUSTOMER_REGISTERED", entity: "User", entityId: user.id, metadata: { accountNumber, accountType: input.accountType } } });
      return { user, account };
    });
    return { customer: created.user, account: created.account, credentials: { password, pin } };
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "A user with this email already exists");
    throw error;
  }
}

export async function verifyCustomer(actorId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findFirst({ where: { id: userId, role: "CUSTOMER" }, select: { id: true, isVerified: true } });
    if (!user) throw new HttpError(404, "Customer not found");
    if (user.isVerified) throw new HttpError(409, "Customer is already verified");
    await tx.user.update({ where: { id: userId }, data: { isVerified: true, verifiedAt: new Date(), verifiedById: actorId } });
    await tx.notification.create({ data: { userId, type: "SYSTEM", title: "Profile verified", message: "Your information has been verified. You can now apply for loans." } });
    await tx.auditLog.create({ data: { actorId, action: "CUSTOMER_VERIFIED", entity: "User", entityId: userId } });
    return { id: userId, isVerified: true };
  });
}

export async function createCustomerAccount(actorId: string, customerId: string, type: AccountType) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.user.findFirst({ where: { id: customerId, role: "CUSTOMER" }, select: { id: true, status: true } });
    if (!customer) throw new HttpError(404, "Customer not found");
    if (customer.status !== "ACTIVE") throw new HttpError(422, `This customer is ${customer.status.toLowerCase()}`);
    const count = await tx.account.count({ where: { ownerId: customerId } });
    if (count >= MAX_ACCOUNTS_PER_CUSTOMER) throw new HttpError(422, `A customer can have at most ${MAX_ACCOUNTS_PER_CUSTOMER} accounts`);
    const accountNumber = await generateAccountNumber(tx);
    const account = await tx.account.create({ data: { accountNumber, type, ownerId: customerId, openedById: actorId }, select: { id: true, accountNumber: true, type: true } });
    await tx.notification.create({ data: { userId: customerId, type: "ACCOUNT_STATUS", title: "New account opened", message: `A new ${type.toLowerCase()} account ${accountNumber} was opened for you.` } });
    await tx.auditLog.create({ data: { actorId, action: "ACCOUNT_CREATED", entity: "Account", entityId: account.id, metadata: { accountNumber, type, customerId } } });
    return account;
  });
}

export async function listAllAccounts(query: { page: number; pageSize: number; q?: string; status?: "ACTIVE" | "FROZEN" | "CLOSED"; type?: AccountType }) {
  const q = query.q;
  const where: Prisma.AccountWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(q ? { OR: [
      { accountNumber: { contains: q } },
      { owner: { name: { contains: q, mode: "insensitive" } } },
      { owner: { email: { contains: q, mode: "insensitive" } } },
    ] } : {}),
  };
  const [total, rows, settings] = await Promise.all([
    prisma.account.count({ where }),
    prisma.account.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { owner: { select: { id: true, name: true, email: true } } } }),
    getSettings(),
  ]);
  return {
    items: rows.map((row) => ({ ...toAccountDto(row), ownerId: row.owner.id, ownerName: row.owner.name, ownerEmail: row.owner.email })),
    ...pagingOf(total, query.page, query.pageSize),
    defaults: {
      dailyTransferLimit: settings.dailyTransferLimit.toFixed(2),
      maxSingleTransaction: settings.maxSingleTransaction.toFixed(2),
      minAccountBalance: settings.minAccountBalance.toFixed(2),
    },
  };
}

export interface UpdateAccountInput {
  status?: "ACTIVE" | "FROZEN";
  type?: AccountType;
  dailyTransferLimit?: string | null;
  maxTransactionAmount?: string | null;
  minBalance?: string | null;
  reason?: string;
}

export async function updateAccount(adminId: string, accountId: string, input: UpdateAccountInput) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${accountId} FOR UPDATE`;
    const account = await tx.account.findUnique({ where: { id: accountId } });
    if (!account) throw new HttpError(404, "Account not found");
    if (account.status === "CLOSED") throw new HttpError(409, "Closed accounts cannot be changed");
    const data: Prisma.AccountUpdateInput = {};
    const changes: Record<string, { from: string | null; to: string | null }> = {};
    if (input.status !== undefined && input.status !== account.status) {
      data.status = input.status;
      changes.status = { from: account.status, to: input.status };
    }
    if (input.type !== undefined && input.type !== account.type) {
      data.type = input.type;
      changes.type = { from: account.type, to: input.type };
    }
    const fields = ["dailyTransferLimit", "maxTransactionAmount", "minBalance"] as const;
    for (const field of fields) {
      const value = input[field];
      if (value === undefined) continue;
      const next = value === null ? null : new Prisma.Decimal(value);
      const current = account[field];
      const same = (next === null && current === null) || (next !== null && current !== null && next.equals(current));
      if (same) continue;
      if (next !== null && field !== "minBalance" && next.lte(0)) throw new HttpError(422, "Limits must be greater than 0");
      data[field] = next;
      changes[field] = { from: dec(current), to: dec(next) };
    }
    if (Object.keys(changes).length === 0) throw new HttpError(400, "Nothing was changed");
    const updated = await tx.account.update({ where: { id: accountId }, data });
    await tx.auditLog.create({
      data: {
        actorId: adminId,
        action: changes.status ? (input.status === "FROZEN" ? "ACCOUNT_FROZEN" : "ACCOUNT_UNFROZEN") : "ACCOUNT_UPDATED",
        entity: "Account",
        entityId: accountId,
        metadata: { changes, reason: input.reason ?? null },
      },
    });
    if (changes.status) {
      const frozen = input.status === "FROZEN";
      await tx.notification.create({
        data: {
          userId: account.ownerId,
          type: "ACCOUNT_STATUS",
          title: frozen ? "Account frozen" : "Account unfrozen",
          message: frozen ? `Your account ${account.accountNumber} has been frozen.${input.reason ? ` Reason: ${input.reason}` : ""}` : `Your account ${account.accountNumber} is active again.`,
        },
      });
    }
    return { id: updated.id, status: updated.status };
  });
}
