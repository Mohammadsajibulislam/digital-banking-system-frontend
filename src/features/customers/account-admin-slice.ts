import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AccountAdminFilters { q: string; status: string; type: string; page: number; pageSize: number }
const initialState: AccountAdminFilters = { q: "", status: "", type: "", page: 1, pageSize: 10 };

const accountAdminSlice = createSlice({
  name: "accountAdmin",
  initialState,
  reducers: {
    setAccountFilters(state, action: PayloadAction<Partial<Pick<AccountAdminFilters, "q" | "status" | "type">>>) {
      Object.assign(state, action.payload);
      state.page = 1;
    },
    setAccountPage(state, action: PayloadAction<number>) { state.page = action.payload; },
  },
});
export const { setAccountFilters, setAccountPage } = accountAdminSlice.actions;
export default accountAdminSlice.reducer;
