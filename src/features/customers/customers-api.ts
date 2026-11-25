import { baseApi } from "@/features/api/base-api";
import type { AccountType } from "@/types/banking";
import type { AdminAccountListDTO, CustomerDetailDTO, CustomerListDTO, RegisterCustomerBody, RegisterCustomerResult, UpdateAccountBody, UserStatus } from "@/types/customers";
import type { AccountAdminFilters } from "./account-admin-slice";
import type { CustomerFilters } from "./customers-slice";

const clean = (filters: object) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));

export const customersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query<CustomerListDTO, CustomerFilters>({
      query: (filters) => ({ url: "/customers", params: clean(filters) }),
      providesTags: ["Customer", "Account"],
    }),
    getCustomer: builder.query<CustomerDetailDTO, string>({
      query: (id) => `/customers/${id}`,
      providesTags: ["Customer", "Account", "Transaction"],
    }),
    registerCustomer: builder.mutation<RegisterCustomerResult, RegisterCustomerBody>({
      query: (body) => ({ url: "/customers", method: "POST", body }),
      invalidatesTags: ["Customer", "Account", "Dashboard"],
    }),
    setCustomerStatus: builder.mutation<{ id: string; status: UserStatus }, { id: string; status: UserStatus; reason?: string }>({
      query: ({ id, ...body }) => ({ url: `/customers/${id}/status`, method: "POST", body }),
      invalidatesTags: ["Customer", "Dashboard"],
    }),
    verifyCustomer: builder.mutation<{ id: string; isVerified: boolean }, string>({
      query: (id) => ({ url: `/customers/${id}/verify`, method: "POST" }),
      invalidatesTags: ["Customer", "Dashboard"],
    }),
    createCustomerAccount: builder.mutation<{ id: string; accountNumber: string; type: AccountType }, { customerId: string; type: AccountType }>({
      query: ({ customerId, type }) => ({ url: `/customers/${customerId}/accounts`, method: "POST", body: { type } }),
      invalidatesTags: ["Customer", "Account", "Dashboard"],
    }),
    getAllAccounts: builder.query<AdminAccountListDTO, AccountAdminFilters>({
      query: (filters) => ({ url: "/accounts/all", params: clean(filters) }),
      providesTags: ["Account", "Customer"],
    }),
    updateAccount: builder.mutation<{ id: string; status: string }, UpdateAccountBody>({
      query: ({ id, ...body }) => ({ url: `/accounts/${id}`, method: "PATCH", body }),
      invalidatesTags: ["Account", "Customer", "Dashboard"],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetCustomerQuery,
  useRegisterCustomerMutation,
  useSetCustomerStatusMutation,
  useVerifyCustomerMutation,
  useCreateCustomerAccountMutation,
  useGetAllAccountsQuery,
  useUpdateAccountMutation,
} = customersApi;
