import { baseApi } from "@/features/api/base-api";
import type { ApplyLoanBody, DecideLoanBody, LoanDetailDTO, LoanListDTO, RepayBody } from "@/types/loans";
import type { LoanFilters } from "./loans-slice";

export const loansApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLoans: builder.query<LoanListDTO, LoanFilters>({
      query: (filters) => ({
        url: "/loans",
        params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")),
      }),
      providesTags: ["Loan"],
    }),
    getLoan: builder.query<LoanDetailDTO, string>({
      query: (id) => `/loans/${id}`,
      providesTags: ["Loan"],
    }),
    applyLoan: builder.mutation<{ id: string; loanNumber: string }, ApplyLoanBody>({
      query: (body) => ({ url: "/loans", method: "POST", body }),
      invalidatesTags: ["Loan"],
    }),
    addLoanNote: builder.mutation<{ ok: boolean }, { id: string; note: string }>({
      query: ({ id, note }) => ({ url: `/loans/${id}/notes`, method: "POST", body: { note } }),
      invalidatesTags: ["Loan"],
    }),
    forwardLoan: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/loans/${id}/forward`, method: "POST" }),
      invalidatesTags: ["Loan"],
    }),
    decideLoan: builder.mutation<{ id: string; status: "ACTIVE" | "REJECTED"; txnId: string | null }, DecideLoanBody>({
      query: ({ id, ...body }) => ({ url: `/loans/${id}/decision`, method: "POST", body }),
      invalidatesTags: ["Loan", "Account", "Transaction", "Dashboard", "Notification"],
    }),
    repayInstallment: builder.mutation<{ txnId: string; loanStatus: "ACTIVE" | "COMPLETED"; remainingBalance: string }, RepayBody>({
      query: ({ loanId, ...body }) => ({ url: `/loans/${loanId}/repay`, method: "POST", body }),
      invalidatesTags: ["Loan", "Account", "Transaction", "Dashboard", "Notification"],
    }),
  }),
});

export const {
  useGetLoansQuery,
  useGetLoanQuery,
  useApplyLoanMutation,
  useAddLoanNoteMutation,
  useForwardLoanMutation,
  useDecideLoanMutation,
  useRepayInstallmentMutation,
} = loansApi;
