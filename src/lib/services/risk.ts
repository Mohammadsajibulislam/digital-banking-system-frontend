import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const RISK_RULES = {
  largeAmount: 50_000,
  newRecipientAmount: 20_000,
  rapidCount: 5,
  rapidWindowMinutes: 10,
} as const;

const fmt = (value: Prisma.Decimal | number) =>
  Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export async function screenTransfer(transactionId: string) {
  try {
    const txn = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        senderAccount: { select: { id: true, ownerId: true } },
        receiverAccount: { select: { id: true, ownerId: true } },
      },
    });
    if (
      !txn ||
      txn.type !== "TRANSFER" ||
      txn.status !== "COMPLETED" ||
      !txn.senderAccount ||
      !txn.receiverAccount
    ) return;
    if (txn.senderAccount.ownerId === txn.receiverAccount.ownerId) return;

    const reasons: string[] = [];
    if (txn.amount.gte(RISK_RULES.largeAmount)) {
      reasons.push(`Large transfer of ${fmt(txn.amount)} BDT (rule: ${fmt(RISK_RULES.largeAmount)} BDT or more)`);
    }

    const windowStart = new Date(txn.createdAt.getTime() - RISK_RULES.rapidWindowMinutes * 60_000);
    const recent = await prisma.transaction.count({
      where: {
        type: "TRANSFER",
        status: "COMPLETED",
        senderAccountId: txn.senderAccount.id,
        createdAt: { gte: windowStart, lte: txn.createdAt },
      },
    });
    if (recent >= RISK_RULES.rapidCount) {
      reasons.push(`${recent} transfers from this account within ${RISK_RULES.rapidWindowMinutes} minutes`);
    }

    if (txn.amount.gte(RISK_RULES.newRecipientAmount)) {
      const earlier = await prisma.transaction.count({
        where: {
          type: "TRANSFER",
          status: "COMPLETED",
          senderAccountId: txn.senderAccount.id,
          receiverAccountId: txn.receiverAccount.id,
          id: { not: txn.id },
          createdAt: { lt: txn.createdAt },
        },
      });
      if (earlier === 0) {
        reasons.push(`Transfer of ${fmt(txn.amount)} BDT to a recipient this account has never paid before`);
      }
    }
    if (reasons.length === 0) return;

    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Transaction" WHERE "id" = ${txn.id} FOR UPDATE`;
      const open = await tx.transactionFlag.findFirst({
        where: { transactionId: txn.id, status: "OPEN" },
        select: { id: true },
      });
      if (open) return;
      await tx.transactionFlag.create({
        data: {
          transactionId: txn.id,
          source: "SYSTEM",
          reason: reasons.join("; "),
          raisedById: null,
        },
      });
      const admins = await tx.user.findMany({
        where: { role: "ADMIN", status: "ACTIVE" },
        select: { id: true },
      });
      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: "SYSTEM" as const,
            title: "Transaction flagged automatically",
            message: `${txn.txnId}: ${reasons.join("; ")}`,
            link: "/admin/flags",
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: "TRANSACTION_AUTO_FLAGGED",
          entity: "Transaction",
          entityId: txn.id,
          metadata: { txnId: txn.txnId, reasons },
        },
      });
    });
  } catch (error) {
    console.error("Risk screening failed", error);
  }
}
