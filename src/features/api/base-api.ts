import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";

const rawBaseQuery = fetchBaseQuery({ baseUrl: "/api" });

// Centralized error handling: session shesh hole (401) shorashori login-e pathai
const baseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
  }
  return result;
};

// Shob feature-er API ei ekta baseApi-te injectEndpoints diye jog hobe.
// Tag diye cache invalidate hoy: jemon transfer-er por "Account" tag
// invalidate korle account ar dashboard auto refetch hobe.
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: ["Account", "Transaction", "Loan", "Notification", "Dashboard", "Request", "Customer"],
  endpoints: () => ({}),
});