import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/auth-guard";

type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";
type RequestType = "DEPOSIT" | "WITHDRAWAL";

function makeTxnId() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `TXN-${day}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function listRequests(viewer: { id: string; role: "CUSTOMER" | "STAFF" | "ADMIN" }, query: { page: number; pageSize: number; status?: RequestStatus; type?: RequestType }) {
  const where: Prisma.DepositWithdrawRequestWhereInput = {
    ...(viewer.role === "CUSTOMER" ? { requestedById: viewer.id } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.depositWithdrawRequest.count({ where }),
    prisma.depositWithdrawRequest.findMany({
      where,
      include: {
        account: { select: { id: true, accountNumber: true } },
        requestedBy: { select: { id: true, name: true } },
        transaction: { select: { txnId: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    items: rows.map((row) => ({
      id: row.id,
      type: row.type,
      status: row.status,
      amount: row.amount.toFixed(2),
      description: row.description,
      reviewNote: row.reviewNote,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      accountId: row.account.id,
      accountNumber: row.account.accountNumber,
      requesterId: row.requestedBy.id,
      requesterName: row.requestedBy.name,
      txnId: row.transaction?.txnId ?? null,
    })),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function createRequest(userId: string, input: { type: RequestType; accountId: string; amount: string; description?: string }) {
  const account = await prisma.account.findFirst({
    where: { id: input.accountId, ownerId: userId },
    select: { id: true, status: true },
  });
  if (!account) throw new HttpError(404, "Account not found");
  if (account.status !== "ACTIVE") throw new HttpError(422, `This account is ${account.status.toLowerCase()}`);

  const request = await prisma.depositWithdrawRequest.create({
    data: {
      type: input.type,
      amount: new Prisma.Decimal(input.amount),
      description: input.description?.trim() || null,
      accountId: account.id,
      requestedById: userId,
    },
    select: { id: true },
  });
  return request;
}

export async function decideRequest(reviewerId: string, requestId: string, decision: "APPROVE" | "REJECT", note: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "DepositWithdrawRequest" WHERE "id" = ${requestId} FOR UPDATE`;
    const request = await tx.depositWithdrawRequest.findUnique({
      where: { id: requestId },
      include: { account: { include: { owner: { select: { status: true } } } } },
    });
    if (!request) throw new HttpError(404, "Request not found");
    if (request.status !== "PENDING") throw new HttpError(409, "This request has already been reviewed");
    if (request.requestedById === reviewerId) throw new HttpError(403, "You cannot review your own request");

    const now = new Date();
    if (decision === "REJECT") {
      await tx.depositWithdrawRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", reviewedById: reviewerId, reviewNote: note, reviewedAt: now },
      });
      await tx.notification.create({
        data: {
          userId: request.requestedById,
          type: "WITHDRAWAL_REJECTED",
          title: "Request rejected",
          message: `Your ${request.type.toLowerCase()} request was rejected. Reason: ${note}`,
          link: "/customer/requests",
        },
      });
      return { id: requestId, status: "REJECTED" as const, txnId: null };
    }

    if (request.account.status !== "ACTIVE" || request.account.owner.status !== "ACTIVE") {
      throw new HttpError(422, "The account is not active");
    }
    await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${request.accountId} FOR UPDATE`;

    let balanceAfter: Prisma.Decimal;
    if (request.type === "WITHDRAWAL") {
      const minBalance = request.account.minBalance ?? new Prisma.Decimal(500);
      if (request.account.balance.minus(request.amount).lt(minBalance)) {
        throw new HttpError(422, `A minimum balance of ${minBalance.toFixed(2)} BDT must remain in the account`);
      }
      const updated = await tx.account.update({
        where: { id: request.accountId },
        data: { balance: { decrement: request.amount } },
        select: { balance: true },
      });
      balanceAfter = updated.balance;
    } else {
      const updated = await tx.account.update({
        where: { id: request.accountId },
        data: { balance: { increment: request.amount } },
        select: { balance: true },
      });
      balanceAfter = updated.balance;
    }

    const txn = await tx.transaction.create({
      data: {
        txnId: makeTxnId(),
        type: request.type,
        status: "COMPLETED",
        amount: request.amount,
        description: request.description,
        senderAccountId: request.type === "WITHDRAWAL" ? request.accountId : null,
        receiverAccountId: request.type === "DEPOSIT" ? request.accountId : null,
        initiatedById: reviewerId,
        completedAt: now,
      },
    });
    await tx.ledgerEntry.create({
      data: {
        transactionId: txn.id,
        accountId: request.accountId,
        direction: request.type === "WITHDRAWAL" ? "DEBIT" : "CREDIT",
        amount: request.amount,
        balanceAfter,
      },
    });
    await tx.depositWithdrawRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedById: reviewerId,
        reviewNote: note || null,
        reviewedAt: now,
        transactionId: txn.id,
      },
    });
    await tx.notification.create({
      data: {
        userId: request.requestedById,
        type: request.type === "WITHDRAWAL" ? "WITHDRAWAL_APPROVED" : "DEPOSIT_APPROVED",
        title: `${request.type === "WITHDRAWAL" ? "Withdrawal" : "Deposit"} approved`,
        message: `Your ${request.type.toLowerCase()} request of ${request.amount.toFixed(2)} BDT was approved. Ref: ${txn.txnId}`,
        link: "/customer/transactions",
      },
    });
    return { id: requestId, status: "APPROVED" as const, txnId: txn.txnId };
  });
}
