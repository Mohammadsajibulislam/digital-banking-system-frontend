import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/auth-guard";

const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCK_MINUTES = 15;

export interface TransferInput {
  fromAccountId: string;
  toAccountNumber: string;
  amount: string; // "1500.50" . string, jate float-er bhul na hoy
  description?: string;
  pin: string;
  idempotencyKey: string;
}

export interface TransferResult {
  id: string;
  txnId: string;
  status: string;
  amount: string;
  fee: string;
  total: string;
  description: string | null;
  createdAt: Date;
  fromAccountNumber: string;
  toAccountNumber: string;
  toName: string;
  duplicate: boolean;
}

// Business rule fail (balance, limit ityadi). Eta hole FAILED record rakhi.
class TransferRuleError extends HttpError {}
const rule = (message: string) => new TransferRuleError(422, message);

// "Karim Ahmed" -> "Karim A***"
export function maskName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  return [first, ...rest.map((part) => `${part[0]}***`)].join(" ");
}

function makeTxnId() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `TXN-${day}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

// Admin-er set kora global setting. Row na thakle default.
export async function getSettings() {
  const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  return (
    settings ?? {
      dailyTransferLimit: new Prisma.Decimal(200000),
      maxSingleTransaction: new Prisma.Decimal(100000),
      minAccountBalance: new Prisma.Decimal(500),
      transferFee: new Prisma.Decimal(5),
    }
  );
}

// ---------------------------------------------------------------------------
// PIN verification
// Eta money-transaction-er BAHIRE chole, jate ulta PIN-er attempt count
// transfer fail holeo database-e thake.
// ---------------------------------------------------------------------------
async function verifyPin(userId: string, pin: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pinHash: true, pinFailedAttempts: true, pinLockedUntil: true },
  });

  if (!user?.pinHash) {
    throw new HttpError(400, "Transaction PIN is not set for your account");
  }
  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    throw new HttpError(
      429,
      "PIN is locked because of too many wrong attempts. Please try again later"
    );
  }

  const isValid = await bcrypt.compare(pin, user.pinHash);

  if (!isValid) {
    // increment atomic, tai ekshathe onek request ashleo count thik thake
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { pinFailedAttempts: { increment: 1 } },
      select: { pinFailedAttempts: true },
    });

    if (updated.pinFailedAttempts >= MAX_PIN_ATTEMPTS) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          pinFailedAttempts: 0,
          pinLockedUntil: new Date(Date.now() + PIN_LOCK_MINUTES * 60_000),
        },
      });
      throw new HttpError(
        429,
        `Too many wrong attempts. PIN locked for ${PIN_LOCK_MINUTES} minutes`
      );
    }
    throw new HttpError(
      400,
      `Invalid PIN. ${MAX_PIN_ATTEMPTS - updated.pinFailedAttempts} attempt(s) left`
    );
  }

  if (user.pinFailedAttempts > 0 || user.pinLockedUntil) {
    await prisma.user.update({
      where: { id: userId },
      data: { pinFailedAttempts: 0, pinLockedUntil: null },
    });
  }
}

// ---------------------------------------------------------------------------
// Idempotency: ekই key diye abar request ashle ager result-i fire dei
// ---------------------------------------------------------------------------
async function findExisting(userId: string, key: string) {
  return prisma.transaction.findUnique({
    where: {
      initiatedById_idempotencyKey: {
        initiatedById: userId,
        idempotencyKey: key,
      },
    },
    include: {
      senderAccount: { select: { accountNumber: true } },
      receiverAccount: {
        select: { accountNumber: true, owner: { select: { name: true } } },
      },
    },
  });
}

type ExistingTransaction = NonNullable<Awaited<ReturnType<typeof findExisting>>>;

function resultFromExisting(txn: ExistingTransaction): TransferResult {
  return {
    id: txn.id,
    txnId: txn.txnId,
    status: txn.status,
    amount: txn.amount.toString(),
    fee: txn.fee.toString(),
    total: txn.amount.plus(txn.fee).toString(),
    description: txn.description,
    createdAt: txn.createdAt,
    fromAccountNumber: txn.senderAccount?.accountNumber ?? "",
    toAccountNumber: txn.receiverAccount?.accountNumber ?? "",
    toName: maskName(txn.receiverAccount?.owner.name ?? ""),
    duplicate: true,
  };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

// ---------------------------------------------------------------------------
// MAIN: fund transfer
// ---------------------------------------------------------------------------
export async function executeTransfer(
  userId: string,
  input: TransferInput
): Promise<TransferResult> {
  // 1. Duplicate request?
  const existing = await findExisting(userId, input.idempotencyKey);
  if (existing) return resultFromExisting(existing);

  // 2. Account gulo khuje ber kora. Source account OBOSSHYO ei user-er hote hobe.
  const sender = await prisma.account.findFirst({
    where: { id: input.fromAccountId, ownerId: userId },
    select: { id: true },
  });
  if (!sender) throw new HttpError(404, "Source account not found");

  const receiver = await prisma.account.findUnique({
    where: { accountNumber: input.toAccountNumber },
    select: { id: true },
  });
  if (!receiver) throw new HttpError(404, "Recipient account not found");
  if (receiver.id === sender.id) {
    throw new HttpError(400, "You cannot transfer to the same account");
  }

  // 3. PIN (money transaction-er bahire)
  await verifyPin(userId, input.pin);

  const settings = await getSettings();
  const amount = new Prisma.Decimal(input.amount);
  const description = input.description?.trim() || null;

  try {
    // 4. Atomic part. Ekhane ja ja hobe sob ek sathe hobe, noile kichui na.
    return await prisma.$transaction(
      async (tx) => {
        // 4a. Duita account row lock. id sort kore lock kori, jate
        // A->B ar B->A ekshathe ashle deadlock na hoy.
        const ids = [sender.id, receiver.id].sort();
        await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" IN (${Prisma.join(
          ids
        )}) ORDER BY "id" FOR UPDATE`;

        // 4b. Lock-er por FRESH data (frontend-er balance kokhono bishash kori na)
        const from = await tx.account.findUniqueOrThrow({
          where: { id: sender.id },
          include: { owner: { select: { id: true, status: true } } },
        });
        const to = await tx.account.findUniqueOrThrow({
          where: { id: receiver.id },
          include: { owner: { select: { id: true, name: true, status: true } } },
        });

        // 4c. Validation
        if (from.ownerId !== userId) throw rule("Source account not found");
        if (from.status !== "ACTIVE") {
          throw rule(`Your account is ${from.status.toLowerCase()}`);
        }
        if (to.status !== "ACTIVE" || to.owner.status !== "ACTIVE") {
          throw rule("Recipient account cannot receive funds right now");
        }

        const isOwnTransfer = to.ownerId === userId;
        // Nijer duita account-er moddhe fee nai
        const fee = isOwnTransfer ? new Prisma.Decimal(0) : settings.transferFee;
        const total = amount.plus(fee);

        // Account-e alada limit thakle seta, noile global setting
        const maxSingle = from.maxTransactionAmount ?? settings.maxSingleTransaction;
        if (amount.gt(maxSingle)) {
          throw rule(`Maximum per transaction is ${maxSingle.toFixed(2)} BDT`);
        }

        // Daily limit: last 24 ghontar completed transfer-er jog
        const dailyLimit = from.dailyTransferLimit ?? settings.dailyTransferLimit;
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const usedToday = await tx.transaction.aggregate({
          where: {
            type: "TRANSFER",
            status: "COMPLETED",
            senderAccountId: from.id,
            createdAt: { gte: since },
          },
          _sum: { amount: true },
        });
        const used = usedToday._sum.amount ?? new Prisma.Decimal(0);
        if (used.plus(amount).gt(dailyLimit)) {
          throw rule(
            `Daily transfer limit of ${dailyLimit.toFixed(2)} BDT would be exceeded`
          );
        }

        const minBalance = from.minBalance ?? settings.minAccountBalance;
        if (from.balance.lt(total)) throw rule("Insufficient balance");
        if (from.balance.minus(total).lt(minBalance)) {
          throw rule(
            `A minimum balance of ${minBalance.toFixed(2)} BDT must remain in the account`
          );
        }

        // 4d. Balance update. increment/decrement use kori, "set" na.
        // Sender-er update-e extra guard: balance kom hole 0 row update hobe.
        const debited = await tx.account.updateMany({
          where: { id: from.id, balance: { gte: total.plus(minBalance) } },
          data: { balance: { decrement: total } },
        });
        if (debited.count !== 1) throw rule("Insufficient balance");

        await tx.account.update({
          where: { id: to.id },
          data: { balance: { increment: amount } },
        });

        const fromAfter = await tx.account.findUniqueOrThrow({
          where: { id: from.id },
          select: { balance: true },
        });
        const toAfter = await tx.account.findUniqueOrThrow({
          where: { id: to.id },
          select: { balance: true },
        });

        // 4e. Transaction record
        const created = await tx.transaction.create({
          data: {
            txnId: makeTxnId(),
            type: "TRANSFER",
            status: "COMPLETED",
            amount,
            fee,
            description,
            senderAccountId: from.id,
            receiverAccountId: to.id,
            initiatedById: userId,
            idempotencyKey: input.idempotencyKey,
            completedAt: new Date(),
          },
        });

        // 4f. Duita ledger entry: sender DEBIT (amount + fee), receiver CREDIT (amount)
        await tx.ledgerEntry.createMany({
          data: [
            {
              transactionId: created.id,
              accountId: from.id,
              direction: "DEBIT",
              amount: total,
              balanceAfter: fromAfter.balance,
            },
            {
              transactionId: created.id,
              accountId: to.id,
              direction: "CREDIT",
              amount,
              balanceAfter: toAfter.balance,
            },
          ],
        });

        // 4g. Notification
        await tx.notification.create({
          data: {
            userId,
            type: "TRANSFER_COMPLETED",
            title: "Transfer completed",
            message: `You sent ${amount.toFixed(2)} BDT to account ${to.accountNumber}. Ref: ${created.txnId}`,
            link: "/customer/transactions",
          },
        });
        if (!isOwnTransfer) {
          await tx.notification.create({
            data: {
              userId: to.ownerId,
              type: "MONEY_RECEIVED",
              title: "Money received",
              message: `You received ${amount.toFixed(2)} BDT in account ${to.accountNumber}. Ref: ${created.txnId}`,
              link: "/customer/transactions",
            },
          });
        }

        return {
          id: created.id,
          txnId: created.txnId,
          status: created.status,
          amount: amount.toFixed(2),
          fee: fee.toFixed(2),
          total: total.toFixed(2),
          description,
          createdAt: created.createdAt,
          fromAccountNumber: from.accountNumber,
          toAccountNumber: to.accountNumber,
          toName: isOwnTransfer ? to.owner.name : maskName(to.owner.name),
          duplicate: false,
        };
      },
      { maxWait: 10_000, timeout: 20_000 }
    );
  } catch (error) {
    // Business rule fail: transaction rollback hoye geche, taka kothao jayni.
    // Admin jate dekhte pare tai FAILED record rakhi.
    if (error instanceof TransferRuleError) {
      try {
        await prisma.transaction.create({
          data: {
            txnId: makeTxnId(),
            type: "TRANSFER",
            status: "FAILED",
            amount,
            description,
            failureReason: error.message,
            senderAccountId: sender.id,
            receiverAccountId: receiver.id,
            initiatedById: userId,
          },
        });
      } catch {
        // Failed record na rakha gele-o asol error-i user-ke dekhabo
      }
      throw error;
    }

    // Ekই shomoy duita same-key request: database-er unique constraint ekta-ke atkay
    if (isUniqueViolation(error)) {
      const again = await findExisting(userId, input.idempotencyKey);
      if (again) return resultFromExisting(again);
    }
    throw error;
  }
}