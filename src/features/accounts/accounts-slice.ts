import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface AccountsState {
  // null mane "All accounts"
  selectedAccountId: string | null;
}

const initialState: AccountsState = { selectedAccountId: null };

const accountsSlice = createSlice({
  name: "accounts",
  initialState,
  reducers: {
    selectAccount(state, action: PayloadAction<string | null>) {
      state.selectedAccountId = action.payload;
    },
  },
});

export const { selectAccount } = accountsSlice.actions;
export default accountsSlice.reducer;