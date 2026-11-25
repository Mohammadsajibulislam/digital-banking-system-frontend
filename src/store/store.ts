import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@/features/api/base-api";
import authReducer, { type AuthUser } from "@/features/auth/auth-slice";
import accountsReducer from "@/features/accounts/accounts-slice";
import uiReducer from "@/features/ui/ui-slice";
import transactionsReducer from "@/features/transactions/transactions-slice";
import loansReducer from "@/features/loans/loans-slice";
import customersReducer from "@/features/customers/customers-slice";
import accountAdminReducer from "@/features/customers/account-admin-slice";
import flagsReducer from "@/features/flags/flags-slice";

// Next.js-e proti request/user-er jonno alada store lagbe (global singleton na),
// tai function. Eta StoreProvider-e ekbar call hoy.
export const makeStore = (user: AuthUser | null) =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
      accounts: accountsReducer,
      ui: uiReducer,
      transactions: transactionsReducer,
      loans: loansReducer,
      customers: customersReducer,
      accountAdmin: accountAdminReducer,
      flags: flagsReducer,
    },
    preloadedState: {
      auth: { user },
      loans: {
        status:
          user?.role === "STAFF"
            ? "PENDING"
            : user?.role === "ADMIN"
              ? "UNDER_REVIEW"
              : "",
        page: 1,
        pageSize: 10,
      },
      flags: {
        status: user?.role === "ADMIN" ? "OPEN" : "",
        page: 1,
        pageSize: 10,
      },
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];