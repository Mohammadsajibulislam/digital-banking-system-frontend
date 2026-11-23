import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Demo data seed. WARNING: eta cholale age-r sob data muche jabe (shudhu development-er jonno).

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// ---------- helpers ----------

const r2 = (n: number) => Math.round(n * 100) / 100;

// n din age-r ekta date (chart-e last 5 mash-er data dekhanor jonno)
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10, 30, 0, 0);
  return d;
}

// Jemon: TXN-20261123-A1B2C3
function makeTxnId(date: Date) {
  const day = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `TXN-${day}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

// Reducing-balance EMI schedule
function buildSchedule(
  principal: number,
  months: number,
  yearlyRate: number,
  start: Date
) {
  const r = yearlyRate / 12 / 100;
  const emi = r2(
    (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
  );
  let outstanding = principal;
  const rows: {
    installmentNo: number;
    dueDate: Date;
    amount: number;
    principalPart: number;
    interestPart: number;
  }[] = [];

  for (let i = 1; i <= months; i++) {
    const interestPart = r2(outstanding * r);
    let principalPart = r2(emi - interestPart);
    let amount = emi;
    if (i === months) {
      // shesh installment-e baki principal sesh kore dei
      principalPart = r2(outstanding);
      amount = r2(principalPart + interestPart);
    }
    outstanding = r2(outstanding - principalPart);
    const dueDate = new Date(start);
    dueDate.setDate(dueDate.getDate() + 30 * i);
    rows.push({ installmentNo: i, dueDate, amount, principalPart, interestPart });
  }
  return { emi, rows };
}

// ---------- main ----------

async function main() {
  console.log("Cleaning old data...");
  // Foreign key order-e delete korte hoy
  await prisma.transactionFlag.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.loanInstallment.deleteMany();
  await prisma.depositWithdrawRequest.deleteMany();
  await prisma.loanNote.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ----- Global settings -----
  await prisma.systemSetting.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      dailyTransferLimit: 200000,
      maxSingleTransaction: 100000,
      minAccountBalance: 500,
      transferFee: 5,
    },
  });
  const FEE = 5;

  // ----- Users -----
  const hash = (plain: string) => bcrypt.hash(plain, 10);
  const [adminPw, staffPw, customerPw] = await Promise.all([
    hash("Admin@123"),
    hash("Staff@123"),
    hash("Customer@123"),
  ]);

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@digitalbank.com",
      phone: "01700000001",
      passwordHash: adminPw,
      role: "ADMIN",
      isVerified: true,
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: "Staff Officer",
      email: "staff@digitalbank.com",
      phone: "01700000002",
      passwordHash: staffPw,
      role: "STAFF",
      isVerified: true,
    },
  });

  const customerBase = {
    passwordHash: customerPw,
    role: "CUSTOMER" as const,
    registeredById: staff.id,
  };

  const c1 = await prisma.user.create({
    data: {
      ...customerBase,
      name: "Rahim Uddin",
      email: "customer@digitalbank.com",
      phone: "01800000001",
      address: "Cox's Bazar, Chattogram",
      pinHash: await hash("1234"),
      isVerified: true,
      verifiedAt: daysAgo(160),
      verifiedById: staff.id,
    },
  });
  const c2 = await prisma.user.create({
    data: {
      ...customerBase,
      name: "Karim Ahmed",
      email: "karim@digitalbank.com",
      phone: "01800000002",
      address: "Dhaka",
      pinHash: await hash("4321"),
      isVerified: true,
      verifiedAt: daysAgo(160),
      verifiedById: staff.id,
    },
  });
  const c3 = await prisma.user.create({
    data: {
      ...customerBase,
      name: "Nusrat Jahan",
      email: "nusrat@digitalbank.com",
      phone: "01800000003",
      address: "Chattogram",
      pinHash: await hash("1111"),
      isVerified: true,
      verifiedAt: daysAgo(155),
      verifiedById: staff.id,
    },
  });
  // Unverified customer: staff-er "verify customer" feature test korar jonno
  await prisma.user.create({
    data: {
      ...customerBase,
      name: "Tania Akter",
      email: "tania@digitalbank.com",
      phone: "01800000004",
      address: "Bandarban",
      pinHash: await hash("2222"),
      isVerified: false,
    },
  });

  // ----- Accounts (balance 0 diye shuru, transaction-er por update hobe) -----
  const mkAccount = (
    accountNumber: string,
    type: "SAVINGS" | "CURRENT" | "BUSINESS",
    ownerId: string,
    extra: Record<string, number> = {}
  ) =>
    prisma.account.create({
      data: {
        accountNumber,
        type,
        ownerId,
        openedById: staff.id,
        balance: 0,
        createdAt: daysAgo(160),
        ...extra,
      },
    });

  const a1 = await mkAccount("1001000001", "SAVINGS", c1.id);
  const a2 = await mkAccount("1001000002", "CURRENT", c1.id);
  const a3 = await mkAccount("1001000003", "SAVINGS", c2.id);
  // Business account-e custom limit (global setting override kore)
  const a4 = await mkAccount("1001000004", "BUSINESS", c3.id, {
    dailyTransferLimit: 500000,
    maxTransactionAmount: 300000,
  });

  // ----- Balance tracking (ledger-er balanceAfter thik rakhar jonno) -----
  const balance = new Map<string, number>();
  const ownerOf = new Map<string, string>([
    [a1.id, c1.id],
    [a2.id, c1.id],
    [a3.id, c2.id],
    [a4.id, c3.id],
  ]);

  async function ledger(
    transactionId: string,
    accountId: string,
    direction: "DEBIT" | "CREDIT",
    amount: number,
    date: Date
  ) {
    const current = balance.get(accountId) ?? 0;
    const next = r2(direction === "CREDIT" ? current + amount : current - amount);
    if (next < 0) throw new Error("Seed bug: negative balance on " + accountId);
    balance.set(accountId, next);
    await prisma.ledgerEntry.create({
      data: {
        transactionId,
        accountId,
        direction,
        amount,
        balanceAfter: next,
        createdAt: date,
      },
    });
  }

  // Approved deposit = request + transaction + ledger
  async function seedDeposit(accountId: string, amount: number, days: number, description: string) {
    const date = daysAgo(days);
    const ownerId = ownerOf.get(accountId)!;
    const txn = await prisma.transaction.create({
      data: {
        txnId: makeTxnId(date),
        type: "DEPOSIT",
        status: "COMPLETED",
        amount,
        description,
        receiverAccountId: accountId,
        initiatedById: ownerId,
        createdAt: date,
        completedAt: date,
      },
    });
    await prisma.depositWithdrawRequest.create({
      data: {
        type: "DEPOSIT",
        amount,
        description,
        status: "APPROVED",
        accountId,
        requestedById: ownerId,
        reviewedById: staff.id,
        reviewedAt: date,
        transactionId: txn.id,
        createdAt: date,
      },
    });
    await ledger(txn.id, accountId, "CREDIT", amount, date);
  }

  async function seedWithdrawal(accountId: string, amount: number, days: number, description: string) {
    const date = daysAgo(days);
    const ownerId = ownerOf.get(accountId)!;
    const txn = await prisma.transaction.create({
      data: {
        txnId: makeTxnId(date),
        type: "WITHDRAWAL",
        status: "COMPLETED",
        amount,
        description,
        senderAccountId: accountId,
        initiatedById: ownerId,
        createdAt: date,
        completedAt: date,
      },
    });
    await prisma.depositWithdrawRequest.create({
      data: {
        type: "WITHDRAWAL",
        amount,
        description,
        status: "APPROVED",
        accountId,
        requestedById: ownerId,
        reviewedById: staff.id,
        reviewedAt: date,
        transactionId: txn.id,
        createdAt: date,
      },
    });
    await ledger(txn.id, accountId, "DEBIT", amount, date);
  }

  // Transfer: sender-er DEBIT (amount + fee), receiver-er CREDIT (amount)
  async function seedTransfer(
    fromId: string,
    toId: string,
    amount: number,
    days: number,
    description: string
  ) {
    const date = daysAgo(days);
    const txn = await prisma.transaction.create({
      data: {
        txnId: makeTxnId(date),
        type: "TRANSFER",
        status: "COMPLETED",
        amount,
        fee: FEE,
        description,
        senderAccountId: fromId,
        receiverAccountId: toId,
        initiatedById: ownerOf.get(fromId)!,
        createdAt: date,
        completedAt: date,
      },
    });
    await ledger(txn.id, fromId, "DEBIT", amount + FEE, date);
    await ledger(txn.id, toId, "CREDIT", amount, date);
    return txn;
  }

  // ----- Loan (Rahim-er active loan, 12 mash, 12% yearly) -----
  const disbursedAt = daysAgo(90);
  const schedule = buildSchedule(100000, 12, 12, disbursedAt);

  const loan = await prisma.loan.create({
    data: {
      loanNumber: "LN-0001",
      type: "PERSONAL",
      status: "ACTIVE",
      requestedAmount: 100000,
      approvedAmount: 100000,
      durationMonths: 12,
      interestRate: 12,
      monthlyIncome: 60000,
      employmentStatus: "EMPLOYED",
      description: "Personal loan for home renovation",
      monthlyInstallment: schedule.emi,
      remainingBalance: 100000,
      decisionNote: "Approved. Income and account history are satisfactory.",
      applicantId: c1.id,
      accountId: a1.id,
      forwardedById: staff.id,
      forwardedAt: daysAgo(93),
      decidedById: admin.id,
      decidedAt: daysAgo(91),
      disbursedAt,
      createdAt: daysAgo(95),
    },
  });

  await prisma.loanInstallment.createMany({
    data: schedule.rows.map((row) => ({ ...row, loanId: loan.id })),
  });

  async function seedLoanDisbursement() {
    const txn = await prisma.transaction.create({
      data: {
        txnId: makeTxnId(disbursedAt),
        type: "LOAN_DISBURSEMENT",
        status: "COMPLETED",
        amount: 100000,
        description: "Loan disbursement LN-0001",
        receiverAccountId: a1.id,
        initiatedById: admin.id,
        loanId: loan.id,
        createdAt: disbursedAt,
        completedAt: disbursedAt,
      },
    });
    await ledger(txn.id, a1.id, "CREDIT", 100000, disbursedAt);
  }

  async function seedRepayment(installmentNo: number, days: number) {
    const row = schedule.rows[installmentNo - 1];
    const date = daysAgo(days);
    const txn = await prisma.transaction.create({
      data: {
        txnId: makeTxnId(date),
        type: "LOAN_REPAYMENT",
        status: "COMPLETED",
        amount: row.amount,
        description: `Loan repayment LN-0001 - installment ${installmentNo}`,
        senderAccountId: a1.id,
        initiatedById: c1.id,
        loanId: loan.id,
        createdAt: date,
        completedAt: date,
      },
    });
    await ledger(txn.id, a1.id, "DEBIT", row.amount, date);
    await prisma.loanInstallment.update({
      where: { loanId_installmentNo: { loanId: loan.id, installmentNo } },
      data: { status: "PAID", paidAt: date, transactionId: txn.id },
    });
  }

  // ----- Timeline (puratan theke notun, order-ta important) -----
  console.log("Creating transactions...");
  await seedDeposit(a1.id, 200000, 150, "Initial deposit");
  await seedDeposit(a2.id, 50000, 150, "Initial deposit");
  await seedDeposit(a3.id, 150000, 150, "Initial deposit");
  await seedDeposit(a4.id, 500000, 150, "Business opening deposit");
  await seedWithdrawal(a1.id, 15000, 135, "Cash withdrawal");
  await seedTransfer(a1.id, a3.id, 20000, 120, "Family expense share");
  await seedDeposit(a3.id, 40000, 110, "Salary deposit");
  await seedTransfer(a4.id, a1.id, 35000, 100, "Supplier payment");
  await seedLoanDisbursement(); // 90 din age
  await seedWithdrawal(a2.id, 10000, 85, "ATM withdrawal");
  await seedTransfer(a3.id, a4.id, 12000, 75, "Service payment");
  await seedDeposit(a1.id, 30000, 65, "Salary deposit");
  await seedRepayment(1, 60);
  await seedTransfer(a1.id, a2.id, 25000, 55, "Move to current account");
  await seedDeposit(a4.id, 120000, 45, "Sales revenue");
  await seedWithdrawal(a3.id, 8000, 40, "Cash withdrawal");
  await seedTransfer(a4.id, a3.id, 18000, 35, "Consultancy fee");
  await seedRepayment(2, 30);
  await seedDeposit(a3.id, 25000, 25, "Salary deposit");
  await seedTransfer(a1.id, a3.id, 5000, 20, "Gift");
  await seedWithdrawal(a1.id, 12000, 15, "Cash withdrawal");
  await seedTransfer(a3.id, a1.id, 7500, 10, "Loan return");
  const bigTransfer = await seedTransfer(a4.id, a1.id, 90000, 7, "Large equipment payment");
  await seedDeposit(a2.id, 15000, 5, "Freelance income");
  await seedTransfer(a1.id, a3.id, 3000, 3, "Mobile recharge share");

  // Final balance gulo account table-e boshai
  for (const [accountId, bal] of balance) {
    await prisma.account.update({ where: { id: accountId }, data: { balance: bal } });
  }

  // Loan-er remaining balance = ekhono baki installment-er total
  const unpaidTotal = r2(
    schedule.rows.slice(2).reduce((sum, row) => sum + row.amount, 0)
  );
  await prisma.loan.update({
    where: { id: loan.id },
    data: { remainingBalance: unpaidTotal },
  });

  // ----- Suspicious flag (staff flag korechhe, admin review korbe) -----
  await prisma.transactionFlag.create({
    data: {
      transactionId: bigTransfer.id,
      source: "STAFF",
      reason: "Unusually large transfer compared to the account's normal activity",
      raisedById: staff.id,
      status: "OPEN",
    },
  });

  // ----- Pending kaj (approval workflow test korar jonno) -----
  await prisma.depositWithdrawRequest.create({
    data: {
      type: "DEPOSIT",
      amount: 20000,
      description: "Cash deposit at branch",
      accountId: a1.id,
      requestedById: c1.id,
      createdAt: daysAgo(1),
    },
  });
  await prisma.depositWithdrawRequest.create({
    data: {
      type: "WITHDRAWAL",
      amount: 5000,
      description: "Medical expense",
      accountId: a3.id,
      requestedById: c2.id,
      createdAt: daysAgo(0),
    },
  });

  // Pending loan application (Karim)
  await prisma.loan.create({
    data: {
      loanNumber: "LN-0002",
      type: "PERSONAL",
      status: "PENDING",
      requestedAmount: 50000,
      durationMonths: 6,
      monthlyIncome: 40000,
      employmentStatus: "EMPLOYED",
      description: "Emergency family expense",
      applicantId: c2.id,
      accountId: a3.id,
      createdAt: daysAgo(2),
    },
  });

  // Under review loan (Nusrat), staff forward korechhe ar note diyeche
  const reviewLoan = await prisma.loan.create({
    data: {
      loanNumber: "LN-0003",
      type: "BUSINESS",
      status: "UNDER_REVIEW",
      requestedAmount: 300000,
      durationMonths: 24,
      monthlyIncome: 150000,
      employmentStatus: "BUSINESS_OWNER",
      description: "Working capital for shop expansion",
      applicantId: c3.id,
      accountId: a4.id,
      forwardedById: staff.id,
      forwardedAt: daysAgo(1),
      createdAt: daysAgo(4),
    },
  });
  await prisma.loanNote.create({
    data: {
      loanId: reviewLoan.id,
      authorId: staff.id,
      note: "Business documents verified. Account has regular deposits. Recommend approval.",
      createdAt: daysAgo(1),
    },
  });

  // ----- Notifications -----
  await prisma.notification.createMany({
    data: [
      {
        userId: c1.id,
        type: "LOAN_APPROVED",
        title: "Loan approved",
        message: "Your loan LN-0001 of 100000 BDT has been approved and disbursed.",
        isRead: true,
        createdAt: daysAgo(90),
      },
      {
        userId: c1.id,
        type: "MONEY_RECEIVED",
        title: "Money received",
        message: "You received 90000 BDT from account 1001000004.",
        createdAt: daysAgo(7),
      },
      {
        userId: c2.id,
        type: "DEPOSIT_APPROVED",
        title: "Deposit approved",
        message: "Your deposit request of 25000 BDT was approved.",
        createdAt: daysAgo(25),
      },
    ],
  });

  // ----- Audit log -----
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "LOAN_APPROVED",
      entity: "Loan",
      entityId: loan.id,
      metadata: { loanNumber: "LN-0001", amount: 100000 },
      createdAt: daysAgo(91),
    },
  });

  console.log("\nSeed complete.\n");
  console.log("Demo credentials:");
  console.log("  Admin    : admin@digitalbank.com    / Admin@123");
  console.log("  Staff    : staff@digitalbank.com    / Staff@123");
  console.log("  Customer : customer@digitalbank.com / Customer@123  (PIN 1234)");
  console.log("  Others   : karim@, nusrat@, tania@digitalbank.com / Customer@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });