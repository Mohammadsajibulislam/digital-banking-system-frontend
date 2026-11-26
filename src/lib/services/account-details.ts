import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/services/transfer";

const limit = (custom: Prisma.Decimal | null, fallback: Prisma.Decimal) => ({
  value: (custom ?? fallback).toFixed(2),
  isCustom: custom !== null,
});

export async function getAccountDetails(userId: string) {
  const [accounts, settings] = await Promise.all([
    prisma.account.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } }),
    getSettings(),
  ]);
  const ids = accounts.map((account) => account.id);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const usedRows = ids.length
    ? await prisma.transaction.groupBy({
        by: ["senderAccountId"],
        where: {
          type: "TRANSFER",
          status: "COMPLETED",
          senderAccountId: { in: ids },
          createdAt: { gte: since },
        },
        _sum: { amount: true },
      })
    : [];
  const used = new Map(usedRows.map((row) => [row.senderAccountId, row._sum.amount]));

  return accounts.map((account) => {
    const daily = account.dailyTransferLimit ?? settings.dailyTransferLimit;
    const usedAmount = used.get(account.id) ?? new Prisma.Decimal(0);
    const remaining = daily.minus(usedAmount);
    return {
      id: account.id,
      accountNumber: account.accountNumber,
      type: account.type,
      status: account.status,
      balance: account.balance.toFixed(2),
      currency: account.currency,
      createdAt: account.createdAt.toISOString(),
      dailyTransferLimit: limit(account.dailyTransferLimit, settings.dailyTransferLimit),
      maxTransactionAmount: limit(account.maxTransactionAmount, settings.maxSingleTransaction),
      minBalance: limit(account.minBalance, settings.minAccountBalance),
      usedLast24h: usedAmount.toFixed(2),
      remainingDaily: (remaining.lt(0) ? new Prisma.Decimal(0) : remaining).toFixed(2),
    };
  });
}
