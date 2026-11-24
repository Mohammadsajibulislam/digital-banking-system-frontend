import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AppRole } from "@/lib/roles";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AppRole;
}

interface AuthState {
  user: AuthUser | null;
}

const initialState: AuthState = { user: null };

// User server-er session theke ashe (StoreProvider-e preloadedState hishebe)
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
    },
  },
});

export const { setUser } = authSlice.actions;
export default authSlice.reducer;