import { baseApi } from "@/features/api/base-api";
import type { RequestListDTO } from "@/types/requests";
import type { RequestFilters } from "./requests-slice";

export const requestsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRequests: builder.query<RequestListDTO, RequestFilters>({
      query: (filters) => ({
        url: "/requests",
        params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")),
      }),
      providesTags: ["Request"],
    }),
    createRequest: builder.mutation<{ id: string }, { type: "DEPOSIT" | "WITHDRAWAL"; accountId: string; amount: string; description?: string }>({
      query: (body) => ({ url: "/requests", method: "POST", body }),
      invalidatesTags: ["Request", "Dashboard"],
    }),
    decideRequest: builder.mutation<{ id: string; status: "APPROVED" | "REJECTED"; txnId: string | null }, { id: string; decision: "APPROVE" | "REJECT"; note: string }>({
      query: ({ id, ...body }) => ({ url: `/requests/${id}/decision`, method: "POST", body }),
      invalidatesTags: ["Request", "Account", "Transaction", "Dashboard", "Notification"],
    }),
  }),
});

export const { useGetRequestsQuery, useCreateRequestMutation, useDecideRequestMutation } = requestsApi;
