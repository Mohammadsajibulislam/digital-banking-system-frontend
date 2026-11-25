import type { TransactionDTO } from "@/types/transactions";

export const TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  TRANSFER: "Fund transfer",
  LOAN_DISBURSEMENT: "Loan disbursement",
  LOAN_REPAYMENT: "Loan repayment",
};

export const STATUS_OPTIONS = ["PENDING", "COMPLETED", "FAILED", "REVERSED"];

export function describeTransaction(tx: TransactionDTO, isCustomer: boolean) {
  if (!isCustomer) {
    return `${tx.fromAccountNumber ?? "Bank"} to ${tx.toAccountNumber ?? "Bank"}`;
  }
  switch (tx.type) {
    case "DEPOSIT":
      return "Cash deposit";
    case "WITHDRAWAL":
      return "Cash withdrawal";
    case "LOAN_DISBURSEMENT":
      return "Loan disbursement";
    case "LOAN_REPAYMENT":
      return "Loan repayment";
    default:
      return tx.direction === "DEBIT"
        ? `To ${tx.toName ?? ""} (${tx.toAccountNumber ?? ""})`
        : `From ${tx.fromName ?? ""} (${tx.fromAccountNumber ?? ""})`;
  }
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Dhaka",
});

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}
