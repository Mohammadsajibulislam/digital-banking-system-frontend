import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { HttpError, handleApiError, requireUser } from "@/lib/auth-guard";

// Decimal ba null ke string-e ni
const str = (value: { toString(): string } | null | undefined) =>
  value ? value.toString() : "0";

// GET /api/dashboard/customer            -> sob account-er hishab
// GET /api/dashboard/customer?accountId=  -> ekta account-er hishab
export async function GET(req: Request) {
  try {
    const user = await requireUser(["CUSTOMER"]);

    // 1. Ei user-er nijer account gulo
    const owned = await prisma.account.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });
    const ownedIds = owned.map((a) => a.id);

    // 2. Frontend je accountId pathalo, seta ei user-er kina verify kori.
    // Onno-r account-er ID dile 404 (exist kore kina seta-o jante dei na).
    const requested = new URL(req.url).searchParams.get("accountId");
    let ids = ownedIds;
    let selectedAccountId: string | null = null;

    if (requested && requested !== "all") {
      if (!ownedIds.includes(requested)) {
        throw new HttpError(404, "Account not found");
      }
      ids = [requested];
      selectedAccountId = requested;
    }

    // 3. Sob hishab server-e database theke, frontend-er kono value bishash kori na
    const [balance, deposits, withdrawals, ledger, loans] = await Promise.all([
      prisma.account.aggregate({
        where: { id: { in: ids } },
        _sum: { balance: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: "DEPOSIT",
          status: "COMPLETED",
          receiverAccountId: { in: ids },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: "WITHDRAWAL",
          status: "COMPLETED",
          senderAccountId: { in: ids },
        },
        _sum: { amount: true },
      }),
      prisma.ledgerEntry.findMany({
        where: { accountId: { in: ids } },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          transaction: {
            select: { txnId: true, type: true, status: true, description: true },
          },
          account: { select: { accountNumber: true } },
        },
      }),
      prisma.loan.findMany({
        where: { applicantId: user.id, status: "ACTIVE" },
        select: {
          id: true,
          loanNumber: true,
          type: true,
          approvedAmount: true,
          remainingBalance: true,
          monthlyInstallment: true,
        },
      }),
    ]);

    return NextResponse.json({
      selectedAccountId,
      totalBalance: str(balance._sum.balance),
      totalDeposits: str(deposits._sum.amount),
      totalWithdrawals: str(withdrawals._sum.amount),
      recentTransactions: ledger.map((entry) => ({
        id: entry.id,
        txnId: entry.transaction.txnId,
        type: entry.transaction.type,
        status: entry.transaction.status,
        description: entry.transaction.description,
        direction: entry.direction,
        amount: str(entry.amount),
        balanceAfter: str(entry.balanceAfter),
        accountNumber: entry.account.accountNumber,
        createdAt: entry.createdAt,
      })),
      activeLoans: loans.map((loan) => ({
        id: loan.id,
        loanNumber: loan.loanNumber,
        type: loan.type,
        approvedAmount: str(loan.approvedAmount),
        remainingBalance: str(loan.remainingBalance),
        monthlyInstallment: str(loan.monthlyInstallment),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}