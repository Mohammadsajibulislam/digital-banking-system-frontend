export type RequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RequestType = "DEPOSIT" | "WITHDRAWAL";

export interface RequestDTO {
  id: string;
  type: RequestType;
  status: RequestStatus;
  amount: string;
  description: string | null;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  accountId: string;
  accountNumber: string;
  requesterId: string;
  requesterName: string;
  txnId: string | null;
}

export interface RequestListDTO {
  items: RequestDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
