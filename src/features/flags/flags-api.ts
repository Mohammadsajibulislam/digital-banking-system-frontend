import { baseApi } from "@/features/api/base-api";
import type { FlagListDTO } from "@/types/flags";
import type { FlagFilters } from "./flags-slice";

export const flagsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFlags: builder.query<FlagListDTO, FlagFilters>({
      query: (filters) => ({
        url: "/flags",
        params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")),
      }),
      providesTags: ["Flag"],
    }),
    getTransactionFlags: builder.query<FlagListDTO, string>({
      query: (txnId) => ({ url: "/flags", params: { txnId, pageSize: 20 } }),
      providesTags: ["Flag"],
    }),
    createFlag: builder.mutation<{ id: string }, { txnId: string; reason: string }>({
      query: (body) => ({ url: "/flags", method: "POST", body }),
      invalidatesTags: ["Flag"],
    }),
    resolveFlag: builder.mutation<{ id: string; status: string }, { id: string; decision: "RESOLVE" | "DISMISS"; note: string }>({
      query: ({ id, ...body }) => ({ url: `/flags/${id}/resolve`, method: "POST", body }),
      invalidatesTags: ["Flag"],
    }),
  }),
});
export const { useGetFlagsQuery, useGetTransactionFlagsQuery, useCreateFlagMutation, useResolveFlagMutation } = flagsApi;
