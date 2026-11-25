export interface TransactionDTO {
  id: string;
  txnId: string;
  type: string;
  status: string;
  amount: string;
  fee: string;
  description: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
  fromAccountNumber: string | null;
  fromName: string | null;
  toAccountNumber: string | null;
  toName: string | null;
  direction: "DEBIT" | "CREDIT" | null;
}

export interface LedgerLineDTO {
  id: string;
  accountNumber: string;
  direction: "DEBIT" | "CREDIT";
  amount: string;
  balanceAfter: string;
}

export interface TransactionDetailDTO extends TransactionDTO {
  ledger: LedgerLineDTO[];
}

export interface TransactionListDTO {
  items: TransactionDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
