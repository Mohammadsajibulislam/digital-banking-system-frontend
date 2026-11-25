import { baseApi } from "@/features/api/base-api";
import type { TransactionDetailDTO, TransactionListDTO } from "@/types/transactions";
import type { TransactionFilters } from "./transactions-slice";

function cleanParams(filters: TransactionFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined)
  );
}

export const transactionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTransactions: builder.query<TransactionListDTO, TransactionFilters>({
      query: (filters) => ({ url: "/transactions", params: cleanParams(filters) }),
      providesTags: ["Transaction"],
    }),
    getTransaction: builder.query<TransactionDetailDTO, string>({
      query: (txnId) => `/transactions/${txnId}`,
      providesTags: ["Transaction"],
    }),
  }),
});

export const { useGetTransactionsQuery, useGetTransactionQuery } = transactionsApi;
