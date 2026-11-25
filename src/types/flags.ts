export type FlagStatus = "OPEN" | "RESOLVED" | "DISMISSED";

export interface FlagDTO {
  id: string;
  status: FlagStatus;
  source: "STAFF" | "SYSTEM";
  reason: string;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  raisedByName: string;
  resolvedByName: string | null;
  txnId: string;
  txnType: string;
  txnStatus: string;
  amount: string;
  fromAccountNumber: string | null;
  fromName: string | null;
  toAccountNumber: string | null;
  toName: string | null;
}

export interface FlagListDTO {
  items: FlagDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
