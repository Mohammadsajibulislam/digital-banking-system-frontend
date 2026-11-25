import type { AccountType } from "./banking";

export type UserStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";
export interface CustomerListItemDTO {
  id: string; name: string; email: string; phone: string | null;
  status: UserStatus; isVerified: boolean; createdAt: string;
  accountCount: number; totalBalance: string;
}
export interface CustomerListDTO { items: CustomerListItemDTO[]; page: number; pageSize: number; total: number; totalPages: number }
export interface CustomerAccountDTO {
  id: string; accountNumber: string; type: AccountType;
  status: "ACTIVE" | "FROZEN" | "CLOSED"; balance: string;
  dailyTransferLimit: string | null; maxTransactionAmount: string | null;
  minBalance: string | null; createdAt: string;
}
export interface CustomerTransactionDTO {
  id: string; txnId: string; type: string; status: string; amount: string;
  description: string | null; direction: "DEBIT" | "CREDIT";
  accountNumber: string; createdAt: string;
}
export interface CustomerDetailDTO {
  id: string; name: string; email: string; phone: string | null; address: string | null;
  status: UserStatus; isVerified: boolean; verifiedAt: string | null;
  verifiedByName: string | null; registeredByName: string | null; createdAt: string;
  loanCount: number; accounts: CustomerAccountDTO[]; recentTransactions: CustomerTransactionDTO[];
}
export interface AdminAccountDTO extends CustomerAccountDTO { ownerId: string; ownerName: string; ownerEmail: string }
export interface AdminAccountListDTO {
  items: AdminAccountDTO[]; page: number; pageSize: number; total: number; totalPages: number;
  defaults: { dailyTransferLimit: string; maxSingleTransaction: string; minAccountBalance: string };
}
export interface RegisterCustomerBody { name: string; email: string; phone: string; address?: string; accountType: AccountType }
export interface RegisterCustomerResult {
  customer: { id: string; name: string; email: string };
  account: { accountNumber: string; type: AccountType };
  credentials: { password: string; pin: string };
}
export interface UpdateAccountBody {
  id: string; status?: "ACTIVE" | "FROZEN"; type?: AccountType;
  dailyTransferLimit?: string | null; maxTransactionAmount?: string | null;
  minBalance?: string | null; reason?: string;
}
