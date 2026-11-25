import { baseApi } from "@/features/api/base-api";
import type {
  RecipientLookupDTO,
  TransferRequestDTO,
  TransferResultDTO,
} from "@/types/banking";

export const transfersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    lookupAccount: builder.query<RecipientLookupDTO, string>({
      query: (accountNumber) => `/accounts/lookup?accountNumber=${accountNumber}`,
    }),
    createTransfer: builder.mutation<TransferResultDTO, TransferRequestDTO>({
      query: (body) => ({ url: "/transfers", method: "POST", body }),
      // Transfer-er por account balance, dashboard, transaction list
      // auto refetch hobe (cache invalidation)
      invalidatesTags: ["Account", "Transaction", "Dashboard", "Notification"],
    }),
  }),
});

export const { useLazyLookupAccountQuery, useCreateTransferMutation } =
  transfersApi;