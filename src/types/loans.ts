export type LoanStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "ACTIVE" | "COMPLETED";
export type LoanType = "PERSONAL" | "HOME" | "CAR" | "EDUCATION" | "BUSINESS";
export type EmploymentStatus = "EMPLOYED" | "SELF_EMPLOYED" | "BUSINESS_OWNER" | "STUDENT" | "UNEMPLOYED";

export interface LoanListItemDTO {
  id: string;
  loanNumber: string;
  type: LoanType;
  status: LoanStatus;
  requestedAmount: string;
  approvedAmount: string | null;
  durationMonths: number;
  monthlyInstallment: string | null;
  remainingBalance: string | null;
  createdAt: string;
  applicantName: string;
  accountNumber: string;
}

export interface LoanListDTO {
  items: LoanListItemDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface InstallmentDTO {
  id: string;
  installmentNo: number;
  dueDate: string;
  amount: string;
  principalPart: string;
  interestPart: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  paidAt: string | null;
  txnId: string | null;
}

export interface LoanNoteDTO {
  id: string;
  note: string;
  authorName: string;
  createdAt: string;
}

export interface LoanDetailDTO extends LoanListItemDTO {
  applicantEmail: string;
  employmentStatus: EmploymentStatus;
  monthlyIncome: string;
  description: string | null;
  interestRate: string | null;
  decisionNote: string | null;
  forwardedByName: string | null;
  decidedByName: string | null;
  forwardedAt: string | null;
  decidedAt: string | null;
  disbursedAt: string | null;
  totalPayable: string;
  paidTotal: string;
  installments: InstallmentDTO[];
  notes: LoanNoteDTO[];
}

export interface ApplyLoanBody {
  type: LoanType;
  accountId: string;
  requestedAmount: string;
  durationMonths: number;
  monthlyIncome: string;
  employmentStatus: EmploymentStatus;
  description?: string;
}

export type DecideLoanBody =
  | { id: string; decision: "APPROVE"; approvedAmount?: string; interestRate: string; note?: string }
  | { id: string; decision: "REJECT"; note: string };

export interface RepayBody {
  loanId: string;
  installmentId: string;
  pin: string;
}
