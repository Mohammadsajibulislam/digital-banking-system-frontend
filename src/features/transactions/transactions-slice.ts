import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface TransactionFilters {
  q: string;
  type: string;
  status: string;
  from: string;
  to: string;
  accountId: string;
  page: number;
  pageSize: number;
}

const initialState: TransactionFilters = {
  q: "",
  type: "",
  status: "",
  from: "",
  to: "",
  accountId: "",
  page: 1,
  pageSize: 10,
};

const transactionsSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {
    setFilters(
      state,
      action: PayloadAction<Partial<Omit<TransactionFilters, "page" | "pageSize">>>
    ) {
      Object.assign(state, action.payload);
      state.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    resetFilters: () => initialState,
  },
});

export const { setFilters, setPage, resetFilters } = transactionsSlice.actions;
export default transactionsSlice.reducer;
