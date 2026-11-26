import type { AccountStatus, AccountType } from "./banking";

export interface AccountLimitDTO {
  value: string;
  isCustom: boolean;
}

export interface AccountDetailDTO {
  id: string;
  accountNumber: string;
  type: AccountType;
  status: AccountStatus;
  balance: string;
  currency: string;
  createdAt: string;
  dailyTransferLimit: AccountLimitDTO;
  maxTransactionAmount: AccountLimitDTO;
  minBalance: AccountLimitDTO;
  usedLast24h: string;
  remainingDaily: string;
}
