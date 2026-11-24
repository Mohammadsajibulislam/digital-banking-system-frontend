import { baseApi } from "@/features/api/base-api";
import type { AccountDTO, CustomerDashboardDTO } from "@/types/banking";

export const accountsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyAccounts: builder.query<AccountDTO[], void>({
      query: () => "/accounts",
      providesTags: ["Account"],
    }),
    // accountId = "all" hole sob account-er total
    getCustomerDashboard: builder.query<CustomerDashboardDTO, string>({
      query: (accountId) => `/dashboard/customer?accountId=${accountId}`,
      providesTags: ["Dashboard", "Account", "Transaction", "Loan"],
    }),
  }),
});

export const { useGetMyAccountsQuery, useGetCustomerDashboardQuery } =
  accountsApi;