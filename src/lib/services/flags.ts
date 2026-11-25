import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/auth-guard";
import type { AppRole } from "@/lib/roles";

export interface Viewer { id: string; role: AppRole }
type FlagStatus = "OPEN" | "RESOLVED" | "DISMISSED";

const accountSelect = {
  select: { accountNumber: true, owner: { select: { name: true } } },
} as const;
const include = {
  transaction: {
    select: {
      txnId: true,
      type: true,
      status: true,
      amount: true,
      senderAccount: accountSelect,
      receiverAccount: accountSelect,
    },
  },
  raisedBy: { select: { name: true } },
  resolvedBy: { select: { name: true } },
} satisfies Prisma.TransactionFlagInclude;

type Row = Prisma.TransactionFlagGetPayload<{ include: typeof include }>;

function toDto(row: Row) {
  return {
    id: row.id,
    status: row.status,
    source: row.source,
    reason: row.reason,
    resolutionNote: row.resolutionNote,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    raisedByName: row.raisedBy?.name ?? "System",
    resolvedByName: row.resolvedBy?.name ?? null,
    txnId: row.transaction.txnId,
    txnType: row.transaction.type,
    txnStatus: row.transaction.status,
    amount: row.transaction.amount.toFixed(2),
    fromAccountNumber: row.transaction.senderAccount?.accountNumber ?? null,
    fromName: row.transaction.senderAccount?.owner.name ?? null,
    toAccountNumber: row.transaction.receiverAccount?.accountNumber ?? null,
    toName: row.transaction.receiverAccount?.owner.name ?? null,
  };
}

export async function listFlags(
  viewer: Viewer,
  query: { page: number; pageSize: number; status?: FlagStatus; txnId?: string }
) {
  const where: Prisma.TransactionFlagWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.txnId ? { transaction: { txnId: query.txnId } } : {}),
    ...(viewer.role === "STAFF" && !query.txnId ? { raisedById: viewer.id } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.transactionFlag.count({ where }),
    prisma.transactionFlag.findMany({
      where,
      include,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    items: rows.map(toDto),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function createFlag(actor: Viewer, txnId: string, reason: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { txnId },
    select: { id: true },
  });
  if (!transaction) throw new HttpError(404, "Transaction not found");

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Transaction" WHERE "id" = ${transaction.id} FOR UPDATE`;
    const open = await tx.transactionFlag.findFirst({
      where: { transactionId: transaction.id, status: "OPEN" },
      select: { id: true },
    });
    if (open) throw new HttpError(409, "This transaction is already flagged and waiting for admin review");

    const flag = await tx.transactionFlag.create({
      data: {
        transactionId: transaction.id,
        source: "STAFF",
        reason,
        raisedById: actor.id,
      },
      select: { id: true },
    });
    const admins = await tx.user.findMany({
      where: { role: "ADMIN", status: "ACTIVE", id: { not: actor.id } },
      select: { id: true },
    });
    if (admins.length > 0) {
      await tx.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: "SYSTEM" as const,
          title: "Transaction flagged for review",
          message: `${txnId} was flagged as suspicious: ${reason}`,
          link: "/admin/flags",
        })),
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "TRANSACTION_FLAGGED",
        entity: "Transaction",
        entityId: transaction.id,
        metadata: { txnId, reason },
      },
    });
    return { id: flag.id };
  });
}

export async function resolveFlag(
  admin: Viewer,
  flagId: string,
  decision: "RESOLVE" | "DISMISS",
  note: string
) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "TransactionFlag" WHERE "id" = ${flagId} FOR UPDATE`;
    const flag = await tx.transactionFlag.findUnique({
      where: { id: flagId },
      include: { transaction: { select: { txnId: true } } },
    });
    if (!flag) throw new HttpError(404, "Flag not found");
    if (flag.status !== "OPEN") throw new HttpError(409, `This flag is already ${flag.status.toLowerCase()}`);

    const status = decision === "RESOLVE" ? "RESOLVED" : "DISMISSED";
    await tx.transactionFlag.update({
      where: { id: flagId },
      data: {
        status,
        resolutionNote: note,
        resolvedById: admin.id,
        resolvedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: admin.id,
        action: `FLAG_${status}`,
        entity: "TransactionFlag",
        entityId: flagId,
        metadata: { txnId: flag.transaction.txnId, note },
      },
    });
    return { id: flagId, status };
  });
}
