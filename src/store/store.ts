import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "@/features/api/base-api";
import authReducer, { type AuthUser } from "@/features/auth/auth-slice";
import accountsReducer from "@/features/accounts/accounts-slice";
import uiReducer from "@/features/ui/ui-slice";

// Next.js-e proti request/user-er jonno alada store lagbe (global singleton na),
// tai function. Eta StoreProvider-e ekbar call hoy.
export const makeStore = (user: AuthUser | null) =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
      accounts: accountsReducer,
      ui: uiReducer,
    },
    preloadedState: { auth: { user } },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(baseApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];