import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/auth-guard";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_DAYS = 366;
const MAX_ROWS = 10_000;
const dayStart = (date: string) => new Date(`${date}T00:00:00.000+06:00`);
const dayEnd = (date: string) => new Date(`${date}T23:59:59.999+06:00`);
const dhakaDate = (ms: number) => new Date(ms + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);

const stampFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  TRANSFER: "Fund transfer",
  LOAN_DISBURSEMENT: "Loan disbursement",
  LOAN_REPAYMENT: "Loan repayment",
};

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[,\"\r\n]/.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function buildStatementCsv(userId: string, accountId: string, fromInput?: string, toInput?: string) {
  const account = await prisma.account.findFirst({
    where: { id: accountId, ownerId: userId },
    select: { accountNumber: true, type: true, currency: true },
  });
  if (!account) throw new HttpError(404, "Account not found");

  const now = Date.now();
  const to = toInput ?? dhakaDate(now);
  const from = fromInput ?? dhakaDate(now - 30 * DAY_MS);
  const start = dayStart(from);
  const end = dayEnd(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new HttpError(400, "Invalid date");
  if (start > end) throw new HttpError(400, "From date must be before To date");
  if ((end.getTime() - start.getTime()) / DAY_MS > MAX_DAYS) throw new HttpError(422, `Please choose a period of at most ${MAX_DAYS} days`);

  const before = await prisma.ledgerEntry.findFirst({
    where: { accountId, createdAt: { lt: start } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { balanceAfter: true },
  });
  const opening = before?.balanceAfter ?? new Prisma.Decimal(0);
  const entries = await prisma.ledgerEntry.findMany({
    where: { accountId, createdAt: { gte: start, lte: end } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: MAX_ROWS + 1,
    include: { transaction: { select: { txnId: true, type: true, description: true } } },
  });
  if (entries.length > MAX_ROWS) throw new HttpError(422, "Too many transactions. Please choose a shorter period");

  let totalDebit = new Prisma.Decimal(0);
  let totalCredit = new Prisma.Decimal(0);
  const rows = entries.map((entry) => {
    const isDebit = entry.direction === "DEBIT";
    if (isDebit) totalDebit = totalDebit.plus(entry.amount);
    else totalCredit = totalCredit.plus(entry.amount);
    return [
      stampFormatter.format(entry.createdAt),
      entry.transaction.txnId,
      TYPE_LABELS[entry.transaction.type] ?? entry.transaction.type,
      entry.transaction.description ?? "",
      isDebit ? entry.amount.toFixed(2) : "",
      isDebit ? "" : entry.amount.toFixed(2),
      entry.balanceAfter.toFixed(2),
    ];
  });
  const closing = entries.length ? entries[entries.length - 1].balanceAfter : opening;
  const lines: (string | number)[][] = [
    ["Digital Bank - Account Statement"],
    ["Account number", account.accountNumber],
    ["Account type", account.type],
    ["Currency", account.currency],
    ["Period", `${from} to ${to}`],
    ["Generated", stampFormatter.format(new Date())],
    [],
    ["Opening balance", opening.toFixed(2)],
    [],
    ["Date", "Transaction ID", "Type", "Description", "Debit", "Credit", "Balance"],
    ...rows,
    [],
    ["Total debit", totalDebit.toFixed(2)],
    ["Total credit", totalCredit.toFixed(2)],
    ["Closing balance", closing.toFixed(2)],
    ["Transactions", entries.length],
  ];
  const csv = lines.map((row) => row.map(csvCell).join(",")).join("\r\n");
  return { csv, filename: `statement-${account.accountNumber}-${from}-${to}.csv` };
}
