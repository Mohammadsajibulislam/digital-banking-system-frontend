import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/auth-guard";
import { LOAN_LIMITS } from "@/lib/loan-math";
import { getSettings, verifyPin } from "@/lib/services/transfer";
import type { AppRole } from "@/lib/roles";

export interface Viewer {
  id: string;
  role: AppRole;
}

type LoanType = "PERSONAL" | "HOME" | "CAR" | "EDUCATION" | "BUSINESS";
type EmploymentStatus = "EMPLOYED" | "SELF_EMPLOYED" | "BUSINESS_OWNER" | "STUDENT" | "UNEMPLOYED";
type LoanStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ACTIVE" | "COMPLETED";

export type DecisionInput =
  | { decision: "APPROVE"; approvedAmount?: string; interestRate: string; note?: string }
  | { decision: "REJECT"; note: string };

function makeTxnId() {
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `TXN-${day}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function makeLoanNumber() {
  return `LN-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

function buildSchedule(principal: Prisma.Decimal, months: number, yearlyRate: Prisma.Decimal, start: Date) {
  const r = yearlyRate.div(12).div(100);
  const emi = r.isZero()
    ? principal.div(months).toDecimalPlaces(2)
    : principal.times(r).times(r.plus(1).pow(months)).div(r.plus(1).pow(months).minus(1)).toDecimalPlaces(2);
  let outstanding = principal;
  const rows: { installmentNo: number; dueDate: Date; amount: Prisma.Decimal; principalPart: Prisma.Decimal; interestPart: Prisma.Decimal }[] = [];

  for (let i = 1; i <= months; i++) {
    const interestPart = outstanding.times(r).toDecimalPlaces(2);
    let principalPart = emi.minus(interestPart);
    let amount = emi;
    if (i === months) {
      principalPart = outstanding;
      amount = principalPart.plus(interestPart);
    }
    outstanding = outstanding.minus(principalPart);
    rows.push({ installmentNo: i, dueDate: addMonths(start, i), amount, principalPart, interestPart });
  }
  return { emi, rows };
}

const dec = (value: Prisma.Decimal | null) => value ? value.toFixed(2) : null;
const listInclude = {
  applicant: { select: { name: true } },
  account: { select: { accountNumber: true } },
} satisfies Prisma.LoanInclude;
type ListRow = Prisma.LoanGetPayload<{ include: typeof listInclude }>;

function toListItem(row: ListRow) {
  return {
    id: row.id,
    loanNumber: row.loanNumber,
    type: row.type,
    status: row.status,
    requestedAmount: row.requestedAmount.toFixed(2),
    approvedAmount: dec(row.approvedAmount),
    durationMonths: row.durationMonths,
    monthlyInstallment: dec(row.monthlyInstallment),
    remainingBalance: dec(row.remainingBalance),
    createdAt: row.createdAt.toISOString(),
    applicantName: row.applicant.name,
    accountNumber: row.account.accountNumber,
  };
}

export async function applyForLoan(userId: string, input: {
  type: LoanType;
  accountId: string;
  requestedAmount: string;
  durationMonths: number;
  monthlyIncome: string;
  employmentStatus: EmploymentStatus;
  description?: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true } });
  if (!user?.isVerified) throw new HttpError(403, "Your profile is not verified yet. Please contact the bank to verify your information");

  const account = await prisma.account.findFirst({
    where: { id: input.accountId, ownerId: userId },
    select: { id: true, status: true },
  });
  if (!account) throw new HttpError(404, "Account not found");
  if (account.status !== "ACTIVE") throw new HttpError(422, `This account is ${account.status.toLowerCase()}`);

  const amount = new Prisma.Decimal(input.requestedAmount);
  if (amount.lt(LOAN_LIMITS.minAmount) || amount.gt(LOAN_LIMITS.maxAmount)) {
    throw new HttpError(422, `Loan amount must be between ${LOAN_LIMITS.minAmount} and ${LOAN_LIMITS.maxAmount} BDT`);
  }
  if (input.durationMonths < LOAN_LIMITS.minMonths || input.durationMonths > LOAN_LIMITS.maxMonths) {
    throw new HttpError(422, `Duration must be between ${LOAN_LIMITS.minMonths} and ${LOAN_LIMITS.maxMonths} months`);
  }

  const open = await prisma.loan.count({
    where: { applicantId: userId, status: { in: ["PENDING", "UNDER_REVIEW"] } },
  });
  if (open >= LOAN_LIMITS.maxOpenApplications) {
    throw new HttpError(429, `You already have ${LOAN_LIMITS.maxOpenApplications} applications under review`);
  }

  return prisma.loan.create({
    data: {
      loanNumber: makeLoanNumber(),
      type: input.type,
      requestedAmount: amount,
      durationMonths: input.durationMonths,
      monthlyIncome: new Prisma.Decimal(input.monthlyIncome),
      employmentStatus: input.employmentStatus,
      description: input.description?.trim() || null,
      applicantId: userId,
      accountId: account.id,
    },
    select: { id: true, loanNumber: true },
  });
}

export async function listLoans(viewer: Viewer, query: { page: number; pageSize: number; status?: LoanStatus }) {
  const where: Prisma.LoanWhereInput = {
    ...(viewer.role === "CUSTOMER" ? { applicantId: viewer.id } : {}),
    ...(query.status ? { status: query.status } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.loan.count({ where }),
    prisma.loan.findMany({
      where,
      include: listInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return {
    items: rows.map(toListItem),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getLoanDetail(viewer: Viewer, id: string) {
  const isCustomer = viewer.role === "CUSTOMER";
  const row = await prisma.loan.findFirst({
    where: { id, ...(isCustomer ? { applicantId: viewer.id } : {}) },
    include: {
      applicant: { select: { name: true, email: true } },
      account: { select: { accountNumber: true } },
      forwardedBy: { select: { name: true } },
      decidedBy: { select: { name: true } },
      installments: {
        orderBy: { installmentNo: "asc" },
        include: { transaction: { select: { txnId: true } } },
      },
    },
  });
  if (!row) throw new HttpError(404, "Loan not found");

  const notes = isCustomer ? [] : await prisma.loanNote.findMany({
    where: { loanId: id },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { name: true } } },
  });

  const now = new Date();
  const zero = new Prisma.Decimal(0);
  const totalPayable = row.installments.reduce((sum, item) => sum.plus(item.amount), zero);
  const paidTotal = row.installments.filter((item) => item.status === "PAID").reduce((sum, item) => sum.plus(item.amount), zero);

  return {
    ...toListItem(row),
    applicantEmail: row.applicant.email,
    employmentStatus: row.employmentStatus,
    monthlyIncome: row.monthlyIncome.toFixed(2),
    description: row.description,
    interestRate: dec(row.interestRate),
    decisionNote: row.decisionNote,
    forwardedByName: isCustomer ? null : row.forwardedBy?.name ?? null,
    decidedByName: isCustomer ? null : row.decidedBy?.name ?? null,
    forwardedAt: row.forwardedAt?.toISOString() ?? null,
    decidedAt: row.decidedAt?.toISOString() ?? null,
    disbursedAt: row.disbursedAt?.toISOString() ?? null,
    totalPayable: totalPayable.toFixed(2),
    paidTotal: paidTotal.toFixed(2),
    installments: row.installments.map((item) => ({
      id: item.id,
      installmentNo: item.installmentNo,
      dueDate: item.dueDate.toISOString(),
      amount: item.amount.toFixed(2),
      principalPart: item.principalPart.toFixed(2),
      interestPart: item.interestPart.toFixed(2),
      status: item.status === "PENDING" && item.dueDate < now ? "OVERDUE" : item.status,
      paidAt: item.paidAt?.toISOString() ?? null,
      txnId: item.transaction?.txnId ?? null,
    })),
    notes: notes.map((note) => ({
      id: note.id,
      note: note.note,
      authorName: note.author.name,
      createdAt: note.createdAt.toISOString(),
    })),
  };
}

export async function addLoanNote(authorId: string, loanId: string, note: string) {
  const loan = await prisma.loan.findUnique({ where: { id: loanId }, select: { status: true } });
  if (!loan) throw new HttpError(404, "Loan not found");
  if (loan.status !== "PENDING" && loan.status !== "UNDER_REVIEW") throw new HttpError(409, "Notes can only be added while the loan is under review");
  await prisma.loanNote.create({ data: { loanId, authorId, note } });
  return { ok: true };
}

export async function forwardLoan(staffId: string, loanId: string) {
  const noteCount = await prisma.loanNote.count({ where: { loanId } });
  if (noteCount < 1) throw new HttpError(422, "Add a review note before forwarding the application");

  const result = await prisma.loan.updateMany({
    where: { id: loanId, status: "PENDING" },
    data: { status: "UNDER_REVIEW", forwardedById: staffId, forwardedAt: new Date() },
  });
  if (result.count !== 1) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId }, select: { status: true } });
    if (!loan) throw new HttpError(404, "Loan not found");
    throw new HttpError(409, "This application has already been forwarded or decided");
  }
  await prisma.auditLog.create({ data: { actorId: staffId, action: "LOAN_FORWARDED", entity: "Loan", entityId: loanId } });
  return { ok: true };
}

export async function decideLoan(admin: Viewer, loanId: string, input: DecisionInput) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Loan" WHERE "id" = ${loanId} FOR UPDATE`;
    const loan = await tx.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new HttpError(404, "Loan not found");
    if (loan.applicantId === admin.id) throw new HttpError(403, "You cannot decide your own loan application");
    if (loan.status !== "PENDING" && loan.status !== "UNDER_REVIEW") throw new HttpError(409, `This loan is already ${loan.status.toLowerCase().replace("_", " ")}`);

    const now = new Date();
    if (input.decision === "REJECT") {
      await tx.loan.update({ where: { id: loan.id }, data: { status: "REJECTED", decisionNote: input.note, decidedById: admin.id, decidedAt: now } });
      await tx.notification.create({ data: { userId: loan.applicantId, type: "LOAN_REJECTED", title: "Loan application rejected", message: `Your loan application ${loan.loanNumber} was rejected. Reason: ${input.note}`, link: `/customer/loans/${loan.id}` } });
      await tx.auditLog.create({ data: { actorId: admin.id, action: "LOAN_REJECTED", entity: "Loan", entityId: loan.id, metadata: { loanNumber: loan.loanNumber } } });
      return { id: loan.id, status: "REJECTED" as const, txnId: null };
    }

    const approvedAmount = input.approvedAmount ? new Prisma.Decimal(input.approvedAmount) : loan.requestedAmount;
    if (approvedAmount.lte(0) || approvedAmount.gt(loan.requestedAmount)) throw new HttpError(422, "Approved amount must be more than 0 and not more than the requested amount");
    const rate = new Prisma.Decimal(input.interestRate);

    await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${loan.accountId} FOR UPDATE`;
    const account = await tx.account.findUniqueOrThrow({ where: { id: loan.accountId }, include: { owner: { select: { status: true } } } });
    if (account.status !== "ACTIVE" || account.owner.status !== "ACTIVE") throw new HttpError(422, "The disbursement account is not active");

    const schedule = buildSchedule(approvedAmount, loan.durationMonths, rate, now);
    await tx.account.update({ where: { id: account.id }, data: { balance: { increment: approvedAmount } } });
    const after = await tx.account.findUniqueOrThrow({ where: { id: account.id }, select: { balance: true } });

    const txn = await tx.transaction.create({
      data: {
        txnId: makeTxnId(),
        type: "LOAN_DISBURSEMENT",
        status: "COMPLETED",
        amount: approvedAmount,
        description: `Loan disbursement ${loan.loanNumber}`,
        receiverAccountId: account.id,
        initiatedById: admin.id,
        loanId: loan.id,
        completedAt: now,
      },
    });
    await tx.ledgerEntry.create({ data: { transactionId: txn.id, accountId: account.id, direction: "CREDIT", amount: approvedAmount, balanceAfter: after.balance } });
    await tx.loanInstallment.createMany({ data: schedule.rows.map((row) => ({ ...row, loanId: loan.id })) });
    await tx.loan.update({
      where: { id: loan.id },
      data: {
        status: "ACTIVE",
        approvedAmount,
        interestRate: rate,
        monthlyInstallment: schedule.emi,
        remainingBalance: schedule.rows.reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0)),
        decisionNote: input.note?.trim() || null,
        decidedById: admin.id,
        decidedAt: now,
        disbursedAt: now,
      },
    });
    await tx.notification.create({ data: { userId: loan.applicantId, type: "LOAN_APPROVED", title: "Loan approved", message: `Your loan ${loan.loanNumber} of ${approvedAmount.toFixed(2)} BDT was approved and credited to account ${account.accountNumber}. Ref: ${txn.txnId}`, link: `/customer/loans/${loan.id}` } });
    await tx.auditLog.create({ data: { actorId: admin.id, action: "LOAN_APPROVED", entity: "Loan", entityId: loan.id, metadata: { loanNumber: loan.loanNumber, amount: approvedAmount.toFixed(2), interestRate: rate.toString(), txnId: txn.txnId } } });
    return { id: loan.id, status: "ACTIVE" as const, txnId: txn.txnId };
  }, { maxWait: 10_000, timeout: 20_000 });
}

export async function repayInstallment(userId: string, loanId: string, installmentId: string, pin: string) {
  const owned = await prisma.loan.findFirst({ where: { id: loanId, applicantId: userId }, select: { id: true } });
  if (!owned) throw new HttpError(404, "Loan not found");
  await verifyPin(userId, pin);
  const settings = await getSettings();

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Loan" WHERE "id" = ${loanId} FOR UPDATE`;
    const loan = await tx.loan.findUniqueOrThrow({ where: { id: loanId } });
    if (loan.status !== "ACTIVE") throw new HttpError(409, "This loan is not active");

    await tx.$queryRaw`SELECT "id" FROM "Account" WHERE "id" = ${loan.accountId} FOR UPDATE`;
    const account = await tx.account.findUniqueOrThrow({ where: { id: loan.accountId } });
    const installment = await tx.loanInstallment.findFirst({ where: { id: installmentId, loanId } });
    if (!installment) throw new HttpError(404, "Installment not found");
    if (installment.status === "PAID") throw new HttpError(409, "This installment is already paid");

    const next = await tx.loanInstallment.findFirst({ where: { loanId, status: { not: "PAID" } }, orderBy: { installmentNo: "asc" } });
    if (next && next.id !== installment.id) throw new HttpError(422, "Please pay the earlier installment first");
    if (account.status !== "ACTIVE") throw new HttpError(422, `Your account is ${account.status.toLowerCase()}`);

    const amount = installment.amount;
    const minBalance = account.minBalance ?? settings.minAccountBalance;
    if (account.balance.minus(amount).lt(minBalance)) throw new HttpError(422, `A minimum balance of ${minBalance.toFixed(2)} BDT must remain in the account`);

    const debited = await tx.account.updateMany({ where: { id: account.id, balance: { gte: amount.plus(minBalance) } }, data: { balance: { decrement: amount } } });
    if (debited.count !== 1) throw new HttpError(422, "Insufficient balance in your account");
    const after = await tx.account.findUniqueOrThrow({ where: { id: account.id }, select: { balance: true } });
    const now = new Date();
    const txn = await tx.transaction.create({
      data: {
        txnId: makeTxnId(),
        type: "LOAN_REPAYMENT",
        status: "COMPLETED",
        amount,
        description: `Loan repayment ${loan.loanNumber} - installment ${installment.installmentNo}`,
        senderAccountId: account.id,
        initiatedById: userId,
        loanId: loan.id,
        completedAt: now,
      },
    });
    await tx.ledgerEntry.create({ data: { transactionId: txn.id, accountId: account.id, direction: "DEBIT", amount, balanceAfter: after.balance } });
    await tx.loanInstallment.update({ where: { id: installment.id }, data: { status: "PAID", paidAt: now, transactionId: txn.id } });

    const unpaid = await tx.loanInstallment.count({ where: { loanId, status: { not: "PAID" } } });
    const completed = unpaid === 0;
    const remaining = completed ? new Prisma.Decimal(0) : (loan.remainingBalance ?? new Prisma.Decimal(0)).minus(amount);
    await tx.loan.update({ where: { id: loan.id }, data: { remainingBalance: remaining, ...(completed ? { status: "COMPLETED" as const } : {}) } });
    await tx.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        title: completed ? "Loan fully repaid" : "Installment paid",
        message: completed ? `Congratulations! Loan ${loan.loanNumber} is fully repaid. Ref: ${txn.txnId}` : `Installment ${installment.installmentNo} of ${amount.toFixed(2)} BDT paid for loan ${loan.loanNumber}. Ref: ${txn.txnId}`,
        link: `/customer/loans/${loan.id}`,
      },
    });
    return { txnId: txn.txnId, loanStatus: completed ? "COMPLETED" as const : "ACTIVE" as const, remainingBalance: remaining.toFixed(2) };
  }, { maxWait: 10_000, timeout: 20_000 });
}
